import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Plus, Minus, X, Divide, ChevronLeft, Image as ImageIcon, Video, 
  FileText, Trash2, Download, Eye, EyeOff, Lock, Unlock, Settings,
  Grid, PlusCircle, LayoutGrid, Check, Copy, MoreVertical, Film,
  RefreshCw
} from 'lucide-react';
import IndianSpinner from '@/components/ui/IndianSpinner';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { VaultItem, VaultNote, Post, Reel } from '@/types';

async function compressImage(file: File): Promise<File> {
  if (file.size <= 1024 * 1024) return file;
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      
      const maxRes = 1080;
      if (width > height && width > maxRes) {
        height = (height / width) * maxRes;
        width = maxRes;
      } else if (height > maxRes) {
        width = (width / height) * maxRes;
        height = maxRes;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      
      let quality = 0.8;
      const attemptCompression = (q: number) => {
        canvas.toBlob((blob) => {
          if (blob) {
            if (blob.size <= 1024 * 1024 || q <= 0.1) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", { type: 'image/webp' });
              resolve(compressedFile);
            } else {
              attemptCompression(q - 0.1);
            }
          } else {
            reject(new Error('Compression failed'));
          }
        }, 'image/webp', q);
      };
      
      attemptCompression(quality);
    };
    img.onerror = reject;
  });
}


export default function CalculatorVault() {
  const { profile } = useAuth();
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [vaultSettings, setVaultSettings] = useState<any>(null);

  useEffect(() => {
    if (profile) {
      checkVaultSettings();
    }
  }, [profile]);

  const checkVaultSettings = async () => {
    const { data } = await (supabase as any)
      .from('vault_settings')
      .select('*')
      .eq('user_id', profile?.id)
      .maybeSingle();
    
    setVaultSettings(data);
    if (!data) {
      setIsSetup(true);
    }
  };

  const handleNumber = (num: string) => {
    setDisplay(prev => prev === '0' ? num : prev + num);
  };

  const handleOperator = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const calculate = () => {
    try {
      // Secret entry check
      if (display === vaultSettings?.pin_hash || (isSetup && display.length === 4)) {
        if (isSetup) {
          handleSetPin(display);
        } else {
          setIsOpen(true);
        }
        setDisplay('0');
        setEquation('');
        return;
      }

      const fullEq = equation + display;
      // Basic calculation
      const safeEq = fullEq.replace(/X/g, '*').replace(/÷/g, '/');
      const result = eval(safeEq);
      setDisplay(String(result));
      setEquation('');
    } catch (e) {
      setDisplay('Error');
    }
  };

  const handleSetPin = async (newPin: string) => {
    const { error } = await (supabase as any)
      .from('vault_settings')
      .upsert({ user_id: profile?.id, pin_hash: newPin });
    
    if (error) {
      toast.error('Failed to set PIN');
    } else {
      toast.success('PIN set successfully! Remember it to enter the vault.');
      setIsSetup(false);
      setVaultSettings({ pin_hash: newPin });
      setIsOpen(true);
    }
  };

  const clear = () => {
    setDisplay('0');
    setEquation('');
  };

  if (isOpen) {
    return <VaultContent onClose={() => setIsOpen(false)} />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] bg-zinc-950 p-6 rounded-3xl shadow-2xl border border-zinc-800 max-w-sm mx-auto select-none">
      <div className="w-full mb-6 text-right px-4 py-8 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-inner">
        <div className="text-zinc-500 text-sm h-6 mb-1">{equation}</div>
        <div className="text-white text-5xl font-light tracking-tight overflow-hidden whitespace-nowrap">{display}</div>
      </div>

      <div className="grid grid-cols-4 gap-3 w-full">
        {['AC', 'C', '%', '÷'].map((btn) => (
          <button
            key={btn}
            onClick={() => btn === 'AC' ? clear() : btn === '÷' ? handleOperator('/') : null}
            className={cn(
              "h-16 rounded-2xl text-xl font-medium transition-all active:scale-95 shadow-sm",
              btn === '÷' ? "bg-primary text-primary-foreground" : "bg-zinc-800 text-zinc-300"
            )}
          >
            {btn}
          </button>
        ))}
        {['7', '8', '9', 'X'].map((btn) => (
          <button
            key={btn}
            onClick={() => btn === 'X' ? handleOperator('*') : handleNumber(btn)}
            className={cn(
              "h-16 rounded-2xl text-xl font-medium transition-all active:scale-95 shadow-sm",
              btn === 'X' ? "bg-primary text-primary-foreground" : "bg-zinc-800 text-white"
            )}
          >
            {btn}
          </button>
        ))}
        {['4', '5', '6', '-'].map((btn) => (
          <button
            key={btn}
            onClick={() => btn === '-' ? handleOperator('-') : handleNumber(btn)}
            className={cn(
              "h-16 rounded-2xl text-xl font-medium transition-all active:scale-95 shadow-sm",
              btn === '-' ? "bg-primary text-primary-foreground" : "bg-zinc-800 text-white"
            )}
          >
            {btn}
          </button>
        ))}
        {['1', '2', '3', '+'].map((btn) => (
          <button
            key={btn}
            onClick={() => btn === '+' ? handleOperator('+') : handleNumber(btn)}
            className={cn(
              "h-16 rounded-2xl text-xl font-medium transition-all active:scale-95 shadow-sm",
              btn === '+' ? "bg-primary text-primary-foreground" : "bg-zinc-800 text-white"
            )}
          >
            {btn}
          </button>
        ))}
        <button
          onClick={() => handleNumber('0')}
          className="col-span-2 h-16 rounded-2xl bg-zinc-800 text-white text-xl font-medium transition-all active:scale-95 shadow-sm"
        >
          0
        </button>
        <button
          onClick={() => handleNumber('.')}
          className="h-16 rounded-2xl bg-zinc-800 text-white text-xl font-medium transition-all active:scale-95 shadow-sm"
        >
          .
        </button>
        <button
          onClick={calculate}
          className="h-16 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold transition-all active:scale-95 shadow-md"
        >
          =
        </button>
      </div>
      
      {isSetup && (
        <div className="mt-6 text-center text-zinc-500 text-xs px-4">
          Welcome to the Secret Vault. <br/> Enter a 4-digit PIN and press '=' to set it.
        </div>
      )}
    </div>
  );
}

function VaultContent({ onClose }: { onClose: () => void }) {
  const { profile } = useAuth();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [notes, setNotes] = useState<VaultNote[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) {
      fetchVaultData();
    }
  }, [profile?.id]);

  const fetchVaultData = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      console.log('Fetching vault data for user:', profile.id);
      
      const [vaultItemsRes, vaultNotesRes, userPostsRes, userReelsRes] = await Promise.all([
        (supabase as any).from('vault_items').select('*').order('created_at', { ascending: false }),
        (supabase as any).from('vault_notes').select('*').order('updated_at', { ascending: false }),
        (supabase as any).from('posts').select('*').eq('owner_id', profile.id),
        (supabase as any).from('reels').select('*').eq('owner_id', profile.id)
      ]);

      if (vaultItemsRes.error) console.error('Error fetching vault items:', vaultItemsRes.error);
      if (vaultNotesRes.error) console.error('Error fetching vault notes:', vaultNotesRes.error);
      if (userPostsRes.error) console.error('Error fetching user posts:', userPostsRes.error);
      if (userReelsRes.error) console.error('Error fetching user reels:', userReelsRes.error);

      setItems(vaultItemsRes.data || []);
      setNotes(vaultNotesRes.data || []);
      setPosts(userPostsRes.data || []);
      setReels(userReelsRes.data || []);
    } catch (err: any) {
      console.error('fetchVaultData caught error:', err);
      toast.error('Failed to load vault data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      let finalFile = file;
      if (type === 'image' && file.size > 1024 * 1024) {
        toast.info('Compressing image to under 1MB...');
        finalFile = await compressImage(file);
        toast.success(`Compressed to ${(finalFile.size / 1024).toFixed(0)}KB`);
      }

      const fileExt = finalFile.name.split('.').pop();
      const filePath = `vault/${profile?.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, finalFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);

      const { error: dbError } = await (supabase as any)
        .from('vault_items')
        .insert({
          user_id: profile?.id,
          type,
          media_url: publicUrl
        });

      if (dbError) throw dbError;
      
      toast.success(`${type === 'image' ? 'Photo' : 'Video'} hidden successfully!`);
      fetchVaultData();
    } catch (error: any) {
      toast.error(`Failed to hide file: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const togglePostVisibility = async (id: string, currentHidden: boolean, type: 'post' | 'reel') => {
    const table = type === 'post' ? 'posts' : 'reels';
    try {
      const { error } = await (supabase as any)
        .from(table)
        .update({ is_hidden: !currentHidden })
        .eq('id', id);

      if (error) throw error;
      toast.success(currentHidden ? 'Restored to profile' : 'Hidden from profile');
      fetchVaultData();
    } catch (err: any) {
      toast.error('Failed to update visibility');
    }
  };

  const deleteVaultItem = async (id: string) => {
    if (!window.confirm("Permanently delete this item from vault?")) return;
    try {
      const { error } = await (supabase as any).from('vault_items').delete().eq('id', id);
      if (error) throw error;
      toast.success('Item permanently deleted');
      setItems(items.filter(i => i.id !== id));
    } catch (err: any) {
      toast.error('Failed to delete item');
    }
  };

  const addNote = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('vault_notes')
        .insert({ user_id: profile?.id, title: 'New Secret Note', content: '' })
        .select()
        .maybeSingle();
      
      if (error) throw error;
      setNotes([data, ...notes]);
    } catch (err) {
      toast.error('Failed to create note');
    }
  };

  const updateNote = async (id: string, updates: any) => {
    const { error } = await (supabase as any)
      .from('vault_notes')
      .update(updates)
      .eq('id', id);
    
    if (!error) {
      setNotes(notes.map(n => n.id === id ? { ...n, ...updates } : n));
    }
  };

  const deleteNote = async (id: string) => {
    if (!window.confirm("Delete this secret note?")) return;
    try {
      const { error } = await (supabase as any).from('vault_notes').delete().eq('id', id);
      if (error) throw error;
      setNotes(notes.filter(n => n.id !== id));
      toast.success('Note deleted');
    } catch (err) {
      toast.error('Failed to delete note');
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-white p-4 space-y-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-zinc-900">
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary animate-pulse" />
              Secret Vault
            </h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Secure Storage</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={fetchVaultData} disabled={loading} className="rounded-full hover:bg-zinc-900">
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          </Button>
          {uploading ? (
            <div className="p-2 bg-primary/20 rounded-full">
              <IndianSpinner size="sm" />
            </div>
          ) : (
            <>
              <label className="cursor-pointer">
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} />
                <div className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors">
                  <ImageIcon className="w-5 h-5" />
                </div>
              </label>
              <label className="cursor-pointer">
                <input type="file" className="hidden" accept="video/*" onChange={(e) => handleFileUpload(e, 'video')} />
                <div className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors">
                  <Video className="w-5 h-5" />
                </div>
              </label>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="gallery" className="w-full flex-1 flex flex-col min-h-0">
        <TabsList className="grid grid-cols-3 w-full bg-zinc-900 p-1 rounded-xl shrink-0">
          <TabsTrigger value="gallery" className="rounded-lg data-[state=active]:bg-black">Gallery</TabsTrigger>
          <TabsTrigger value="posts" className="rounded-lg data-[state=active]:bg-black">IR Hide</TabsTrigger>
          <TabsTrigger value="notes" className="rounded-lg data-[state=active]:bg-black">Notepad</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto mt-6 scrollbar-hide no-scrollbar">
          {/* Gallery Tab */}
          <TabsContent value="gallery" className="mt-0 h-full">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-60 gap-4">
                <IndianSpinner size="lg" />
                <p className="text-zinc-500 animate-pulse">Accessing Encrypted Data...</p>
              </div>
            ) : items.length > 0 ? (
              <div className="grid grid-cols-3 gap-1 animate-in fade-in zoom-in duration-300">
                {items.map((item) => (
                  <div key={item.id} className="relative aspect-square group overflow-hidden rounded-md bg-zinc-900">
                    <div className="w-full h-full cursor-pointer" onClick={() => setPreviewUrl(item.media_url)}>
                      {item.type === 'image' ? (
                        <img src={item.media_url} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      ) : (
                        <div className="relative w-full h-full">
                          <video src={item.media_url} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Video className="w-6 h-6 text-white/50" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button asChild size="icon" variant="secondary" className="w-6 h-6 rounded-full bg-black/50 backdrop-blur-md border-none">
                        <a href={item.media_url} download target="_blank" rel="noreferrer">
                          <Download className="w-3 h-3" />
                        </a>
                      </Button>
                      <Button size="icon" variant="destructive" className="w-6 h-6 rounded-full bg-red-500/50 backdrop-blur-md border-none" onClick={() => deleteVaultItem(item.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4 opacity-50">
                <ImageIcon className="w-16 h-16" />
                <p className="text-sm font-bold">Secure Gallery is Empty</p>
              </div>
            )}
          </TabsContent>

          {/* IR Hide Tab */}
          <TabsContent value="posts" className="mt-0 h-full">
            <div className="space-y-8 pb-10">
              <section>
                <div className="flex items-center justify-between mb-4 px-1">
                  <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-zinc-400">
                    <Grid className="w-3 h-3" /> Posts
                  </h3>
                  <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full">{posts.length} Items</span>
                </div>
                {posts.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1">
                    {posts.map((post) => (
                      <div key={post.id} className="relative aspect-square group">
                        <img src={post.media_url} className="w-full h-full object-cover rounded-md opacity-80 group-hover:opacity-100 transition-opacity" />
                        <button 
                          onClick={() => togglePostVisibility(post.id, post.is_hidden || false, 'post')}
                          className={cn(
                            "absolute top-1 right-1 p-1.5 rounded-full shadow-2xl transition-all scale-90",
                            post.is_hidden 
                              ? "bg-primary text-white scale-110" 
                              : "bg-black/60 text-white/70 hover:text-white hover:bg-black/80"
                          )}
                        >
                          {post.is_hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-10 text-zinc-600 text-xs italic">No IR posts found</p>
                )}
              </section>

              <section>
                <div className="flex items-center justify-between mb-4 px-1">
                  <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-zinc-400">
                    <Film className="w-3 h-3" /> Reels
                  </h3>
                  <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full">{reels.length} Items</span>
                </div>
                {reels.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1">
                    {reels.map((reel) => (
                      <div key={reel.id} className="relative aspect-square group">
                        <video src={reel.video_url} className="w-full h-full object-cover rounded-md opacity-80 group-hover:opacity-100 transition-opacity" />
                        <button 
                          onClick={() => togglePostVisibility(reel.id, reel.is_hidden || false, 'reel')}
                          className={cn(
                            "absolute top-1 right-1 p-1.5 rounded-full shadow-2xl transition-all scale-90",
                            reel.is_hidden 
                              ? "bg-primary text-white scale-110" 
                              : "bg-black/60 text-white/70 hover:text-white hover:bg-black/80"
                          )}
                        >
                          {reel.is_hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-10 text-zinc-600 text-xs italic">No IR reels found</p>
                )}
              </section>
            </div>
          </TabsContent>

          {/* Notepad Tab */}
          <TabsContent value="notes" className="mt-0 h-full">
            <div className="flex flex-col h-full gap-4">
              <Button onClick={addNote} variant="outline" className="w-full gap-2 rounded-xl bg-primary/5 text-primary border-primary/20 hover:bg-primary/10">
                <PlusCircle className="w-4 h-4" /> New Secret Note
              </Button>
              <div className="flex-1 space-y-4 pb-10">
                {notes.map((note) => (
                  <Card key={note.id} className="bg-zinc-950 border-zinc-800 overflow-hidden shadow-2xl">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between px-3 pt-2">
                        <Input 
                          className="bg-transparent border-none focus-visible:ring-0 font-bold text-zinc-200 p-0 h-auto text-sm placeholder:text-zinc-700"
                          value={note.title}
                          onChange={(e) => updateNote(note.id, { title: e.target.value })}
                          placeholder="Note Title"
                        />
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6 text-zinc-600 hover:text-red-400"
                          onClick={() => deleteNote(note.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <textarea 
                        className="w-full bg-transparent border-none focus:outline-none px-3 py-2 text-xs min-h-[120px] text-zinc-400 placeholder:text-zinc-800 resize-none no-scrollbar leading-relaxed"
                        value={note.content}
                        onChange={(e) => updateNote(note.id, { content: e.target.value })}
                        placeholder="Passwords, secrets, keys..."
                      />
                      <div className="px-3 py-1 flex justify-end">
                        <span className="text-[8px] text-zinc-700 uppercase font-bold tracking-tighter">
                          Updated {new Date(note.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Preview Dialog */}
      {previewUrl && (
        <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 backdrop-blur-xl border-none">
            <div className="relative w-full h-[80vh] flex items-center justify-center">
              {previewUrl.includes('.mp4') || previewUrl.includes('.mov') || previewUrl.includes('video') ? (
                <video src={previewUrl} className="max-w-full max-h-full" controls autoPlay />
              ) : (
                <img src={previewUrl} className="max-w-full max-h-full object-contain" alt="Vault Preview" />
              )}
              <Button 
                variant="secondary" 
                size="icon" 
                className="absolute top-4 right-4 rounded-full bg-black/50 text-white hover:bg-black/80"
                onClick={() => setPreviewUrl(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
