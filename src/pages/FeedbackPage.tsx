import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, Upload, Send } from 'lucide-react';
import IndianSpinner from '@/components/ui/IndianSpinner';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function FeedbackPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setScreenshot(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !subject.trim() || !message.trim()) {
      toast.error('Please fill all fields');
      return;
    }

    setUploading(true);
    try {
      let screenshotUrl = null;

      if (screenshot) {
        const fileName = `${profile.id}/${Date.now()}_${screenshot.name}`;
        const { error: uploadError } = await supabase.storage
          .from('media' as any)
          .upload(`feedback/${fileName}`, screenshot);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('media' as any)
          .getPublicUrl(`feedback/${fileName}`);

        screenshotUrl = publicUrl;
      }

      const { error } = await (supabase as any).from('feedback').insert({
        user_id: profile.id,
        subject,
        message,
        screenshot_url: screenshotUrl,
        status: 'pending'
      });

      if (error) throw error;

      toast.success('Feedback submitted successfully!');
      navigate('/settings');
    } catch (error: any) {
      toast.error('Failed to submit feedback');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center gap-3 p-4 border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/settings')}
          className="rounded-full"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-black uppercase tracking-widest">Feedback & Bugs</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
          <div className="space-y-2">
            <label className="text-sm font-bold">Subject</label>
            <Input 
              placeholder="Brief description of the issue"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold">Message</label>
            <Textarea 
              placeholder="Describe the bug or feedback in detail..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[200px] rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold">Screenshot (Optional)</label>
            <div className="flex items-center gap-3">
              <Button 
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl"
              >
                <Upload className="w-4 h-4 mr-2" />
                {screenshot ? screenshot.name : 'Upload Screenshot'}
              </Button>
              <input 
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>

          <Button 
            type="submit"
            disabled={uploading || !subject.trim() || !message.trim()}
            className="w-full h-12 rounded-xl font-black uppercase tracking-widest"
          >
            {uploading ? <IndianSpinner size="sm" /> : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Submit Feedback
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
