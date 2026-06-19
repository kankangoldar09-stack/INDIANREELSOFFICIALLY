import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, Send, Bot, Sparkles, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  streaming?: boolean;
}

export default function AIChatBot() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState<'hindi' | 'hinglish' | 'english' | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (selectedLanguage) {
      const welcomeMessages: Record<string, string> = {
        hindi: 'नमस्ते! मैं INDIANREELS AI Assistant हूं। मैं आपकी हिंदी में कैसे मदद कर सकता हूं? 🇮🇳',
        hinglish: 'Namaste! Main INDIANREELS AI Assistant hoon. Kaise help kar sakta hoon aapki? 🇮🇳',
        english: 'Hello! I am INDIANREELS AI Assistant. How can I help you today? 🇮🇳',
      };
      setMessages([{ id: '1', role: 'assistant', content: welcomeMessages[selectedLanguage], timestamp: new Date() }]);
    }
  }, [selectedLanguage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !profile || !selectedLanguage || isTyping || aiUnavailable) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setInput('');
    setIsTyping(true);

    // Placeholder streaming message
    const streamId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: streamId, role: 'assistant', content: '', timestamp: new Date(), streaming: true }]);

    abortRef.current = new AbortController();

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const res = await fetch(`${supabaseUrl}/functions/v1/ai-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          language: selectedLanguage,
          messages: updatedHistory.map(m => ({ role: m.role, content: m.content })),
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') { streamDone = true; break; }

          try {
            const chunk = JSON.parse(jsonStr);
            if (chunk.error === 'AI_UNAVAILABLE') {
              setAiUnavailable(true);
              setMessages(prev => prev.filter(m => m.id !== streamId));
              return;
            }
            if (chunk.error) {
              throw new Error(chunk.error);
            }
            if (chunk.token) {
              fullContent += chunk.token;
              setMessages(prev =>
                prev.map(m => m.id === streamId ? { ...m, content: fullContent } : m)
              );
            }
          } catch (parseErr) {
            // Skip malformed lines
          }
        }
      }

      // Finalize message — remove streaming flag
      setMessages(prev =>
        prev.map(m => m.id === streamId ? { ...m, content: fullContent || '...', streaming: false } : m)
      );
      setAiUnavailable(false);

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('AI Chat Error:', err);
      const friendlyMsg =
        selectedLanguage === 'english' ? '⚠️ Couldn\'t get a response. Please try again.'
        : selectedLanguage === 'hindi' ? '⚠️ Response nahi mila. Dobara try karo.'
        : '⚠️ Response nahi aaya yaar. Ek baar phir try karo!';
      setMessages(prev =>
        prev.map(m => m.id === streamId ? { ...m, content: friendlyMsg, streaming: false } : m)
      );
    } finally {
      setIsTyping(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background relative">
      {/* Language Selection Modal */}
      {!selectedLanguage && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-background/80 backdrop-blur-xl">
          <div className="w-full max-w-sm bg-card border rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex flex-col items-center gap-4 mb-8">
              <div className="p-4 bg-primary/10 rounded-full">
                <Bot className="w-12 h-12 text-primary" />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-black italic tracking-tighter brand-text uppercase">Select Language</h3>
                <p className="text-xs text-muted-foreground font-medium mt-1">Pick how you want to chat with AI Assistant 🇮🇳</p>
              </div>
            </div>
            <div className="space-y-3">
              <Button onClick={() => setSelectedLanguage('hinglish')}
                className="w-full h-14 rounded-2xl text-lg font-bold flex items-center justify-between px-6 bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-90 transition-all border-none">
                Hinglish <Sparkles className="w-5 h-5" />
              </Button>
              <Button onClick={() => setSelectedLanguage('hindi')} variant="outline"
                className="w-full h-14 rounded-2xl text-lg font-bold flex items-center justify-between px-6 border-2 hover:bg-muted/50 transition-all">
                Hindi (हिंदी) <span className="text-xl">🇮🇳</span>
              </Button>
              <Button onClick={() => setSelectedLanguage('english')} variant="outline"
                className="w-full h-14 rounded-2xl text-lg font-bold flex items-center justify-between px-6 border-2 hover:bg-muted/50 transition-all">
                English <span className="text-xl">🇺🇸</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <Button variant="ghost" size="icon" onClick={() => navigate('/messages')} className="rounded-full">
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="relative">
            <Avatar className="w-10 h-10 border-2 border-primary">
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500">
                <Bot className="w-6 h-6 text-white" />
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-sm flex items-center gap-1">
              INDIANREELS AI
              <Sparkles className="w-3 h-3 text-primary" />
            </h2>
            <p className="text-[10px] text-muted-foreground">
              DeepSeek V4 Flash · Always active
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            {msg.role === 'assistant' && (
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500">
                  <Bot className="w-5 h-5 text-white" />
                </AvatarFallback>
              </Avatar>
            )}
            <div className={cn('flex flex-col max-w-[75%]', msg.role === 'user' ? 'items-end' : 'items-start')}>
              <div className={cn(
                'rounded-2xl px-4 py-2.5 text-[15px] shadow-sm break-words whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-tr-sm'
                  : 'bg-muted text-foreground rounded-tl-sm'
              )}>
                {msg.content}
                {/* blinking cursor while streaming */}
                {msg.streaming && (
                  <span className="inline-block w-[2px] h-[1em] bg-current ml-0.5 align-middle animate-pulse" />
                )}
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5 px-2">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {/* Dots only when waiting for first token */}
        {isTyping && messages[messages.length - 1]?.streaming && messages[messages.length - 1]?.content === '' && (
          <div className="flex justify-start items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 -mt-2">
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500">
                <Bot className="w-5 h-5 text-white" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-primary/80 rounded-full animate-bounce" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* AI Unavailable Banner */}
      {aiUnavailable && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
          <WifiOff className="w-4 h-4 shrink-0 text-amber-500" />
          <p className="text-[13px] text-amber-700 font-medium">AI abhi offline hai. Thodi der baad try karo 🙏</p>
        </div>
      )}

      {/* Input */}
      <div className="p-3 pb-20 bg-background/80 backdrop-blur-md border-t shrink-0 z-10">
        <form onSubmit={handleSend} className="flex items-center gap-2 max-w-2xl mx-auto">
          <div className="flex-1 relative flex items-center bg-muted/40 rounded-3xl border px-3 py-1 group focus-within:border-primary transition-all">
            <Input
              placeholder="Type a message..."
              className="bg-transparent border-none h-10 shadow-none focus-visible:ring-0 px-1 text-sm font-medium flex-1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
          <div className="shrink-0 flex items-center">
            {input.trim() && !isTyping && !aiUnavailable && (
              <Button type="submit" variant="ghost" size="icon"
                className="text-primary hover:bg-primary/10 h-10 w-10 rounded-full transition-all active:scale-90">
                <Send className="w-6 h-6" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
