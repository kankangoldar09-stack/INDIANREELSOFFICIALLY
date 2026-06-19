import React, { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Key, ShieldCheck, Zap, MessageSquare, Smartphone, Save, ArrowLeft } from 'lucide-react';
import IndianSpinner from '@/components/ui/IndianSpinner';
import { useNavigate } from 'react-router-dom';

export default function TokenManagement() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tokens, setTokens] = useState({
    openrouter: '',
    groq: '',
    giphy: '',
    snapchat_kit_id: '',
    snapchat_kit_token: '',
    twilio_sid: '',
    twilio_token: ''
  });

  const isSuperAdmin = profile?.username === 'jeetyt09' || profile?.id === '61499879-283a-485e-a36e-b203424a86d0' || profile?.username === 'INDIANREELS_OFFICIALLY' || profile?.id === '20bdb204-fe88-42c0-9787-728275517d07';

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/');
    }
  }, [isSuperAdmin]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(tokens)
        .filter(([_, value]) => value.trim() !== '')
        .map(([id, value]) => ({ id, value, updated_at: new Date().toISOString() }));
      
      if (updates.length === 0) {
        toast.info('No changes to save');
        setSaving(false);
        return;
      }

      const { error } = await (supabase as any)
        .from('platform_config')
        .upsert(updates);

      if (error) throw error;

      toast.success('Tokens and IDs updated successfully!');
    } catch (err: any) {
      toast.error(`Failed to save tokens: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchCurrentConfig();
    }
  }, [isSuperAdmin]);

  const fetchCurrentConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('platform_config')
        .select('*');

      if (error) throw error;

      const configMap = (data || []).reduce((acc: any, curr: any) => {
        acc[curr.id] = curr.value;
        return acc;
      }, {});

      setTokens({
        openrouter: configMap.openrouter || '',
        groq: configMap.groq || '',
        giphy: configMap.giphy || '',
        snapchat_kit_id: configMap.snapchat_kit_id || '',
        snapchat_kit_token: configMap.snapchat_kit_token || '',
        twilio_sid: configMap.twilio_sid || '',
        twilio_token: configMap.twilio_token || ''
      });
    } catch (err: any) {
      console.error('Error fetching config:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-4 px-4 max-w-lg mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">Token Management</h1>
          <p className="text-xs text-muted-foreground font-medium">Manage API Keys and Platform IDs</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="border-border bg-card shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="bg-primary/5 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              AI & Media Tokens
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>OpenRouter API Key</Label>
              <Input 
                type="password" 
                placeholder="sk-or-v1-..." 
                value={tokens.openrouter}
                onChange={(e) => setTokens({...tokens, openrouter: e.target.value})}
                className="bg-muted/30 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Giphy API Key</Label>
              <Input 
                type="password" 
                placeholder="Enter Giphy Key" 
                value={tokens.giphy}
                onChange={(e) => setTokens({...tokens, giphy: e.target.value})}
                className="bg-muted/30 border-border"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="bg-secondary/5 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-secondary" />
              Camera & Auth IDs
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Snapchat Camera Kit App ID</Label>
              <Input 
                placeholder="dd87d75d-c4cb-4f46-9828-0e89a0e113e5" 
                value={tokens.snapchat_kit_id}
                onChange={(e) => setTokens({...tokens, snapchat_kit_id: e.target.value})}
                className="bg-muted/30 border-border"
              />
              <p className="text-[10px] text-muted-foreground">Format: UUID (e.g., dd87d75d-c4cb-...)</p>
            </div>
            <div className="space-y-2">
              <Label>Snapchat Camera Kit API Token (JWT)</Label>
              <textarea 
                placeholder="eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0..." 
                value={tokens.snapchat_kit_token}
                onChange={(e) => setTokens({...tokens, snapchat_kit_token: e.target.value})}
                className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary resize-y font-mono"
              />
              <p className="text-[10px] text-muted-foreground">Long JWT token (300+ characters)</p>
            </div>
            <div className="space-y-2">
              <Label>Twilio Account SID</Label>
              <Input 
                placeholder="AC..." 
                value={tokens.twilio_sid}
                onChange={(e) => setTokens({...tokens, twilio_sid: e.target.value})}
                className="bg-muted/30 border-border"
              />
            </div>
          </CardContent>
        </Card>

        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-12"
        >
          {saving ? (
            <>
              <IndianSpinner size="sm" className="mr-2" />
              Saving Tokens...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Update Configuration
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
