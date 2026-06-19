import React, { useState } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Sparkles, Rocket, Save } from 'lucide-react';
import IndianSpinner from '@/components/ui/IndianSpinner';

interface AppCreatorProps {
  onGenerated: (config: any) => void;
}

export function AppCreator({ onGenerated }: AppCreatorProps) {
  const { profile } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastGeneratedConfig, setLastGeneratedConfig] = useState<any>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return toast.error('Please enter a prompt');
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-app-builder', {
        body: { prompt }
      });

      if (error) {
        const errorMsg = await error?.context?.text();
        throw new Error(errorMsg || error.message);
      }

      setLastGeneratedConfig(data);
      onGenerated(data);
      toast.success('App generated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate app');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!lastGeneratedConfig || !profile) return;
    
    setSaving(true);
    try {
      const { data: appData, error: appError } = await (supabase as any)
        .from('user_apps')
        .insert({
          user_id: profile.id,
          name: lastGeneratedConfig.name,
          description: lastGeneratedConfig.description,
          theme_config: lastGeneratedConfig.theme,
          feature_config: lastGeneratedConfig.features
        })
        .select()
        .single();

      if (appError) throw appError;

      // Save initial version
      const { error: versionError } = await (supabase as any)
        .from('app_versions')
        .insert({
          app_id: appData.id,
          version_number: 1,
          config: lastGeneratedConfig
        });

      if (versionError) throw versionError;

      toast.success('App saved to your history!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save app');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border bg-card shadow-2xl overflow-hidden rounded-2xl">
      <CardHeader className="bg-primary/5 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          What are you building?
        </CardTitle>
        <CardDescription>
          Describe your dream app and AI will build it for you.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <Textarea
          placeholder="e.g. A modern fitness tracker with dark theme and progress charts..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[120px] bg-muted/30 border-border focus:ring-primary rounded-xl resize-none"
        />
        <div className="flex gap-2">
          <Button 
            onClick={handleGenerate} 
            disabled={loading}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-12"
          >
            {loading ? (
              <>
                <IndianSpinner size="sm" className="mr-2" />
                Building...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4 mr-2" />
                Generate App
              </>
            )}
          </Button>
          {lastGeneratedConfig && (
            <Button 
              variant="outline" 
              onClick={handleSave} 
              disabled={saving}
              className="px-6 rounded-xl h-12 border-primary/20 hover:bg-primary/5"
            >
              {saving ? <IndianSpinner size="sm" /> : <Save className="w-5 h-5" />}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
