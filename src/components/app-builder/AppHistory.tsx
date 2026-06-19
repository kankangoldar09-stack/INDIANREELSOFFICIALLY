import React, { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  History, Calendar, Layout, Trash2, 
  ChevronRight, ExternalLink
} from 'lucide-react';
import IndianSpinner from '@/components/ui/IndianSpinner';
import { formatDistanceToNow } from 'date-fns';

interface AppHistoryProps {
  onSelect: (config: any) => void;
}

export function AppHistory({ onSelect }: AppHistoryProps) {
  const { profile } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) fetchApps();
  }, [profile]);

  const fetchApps = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('user_apps')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApps(data || []);
    } catch (err: any) {
      toast.error('Failed to load apps');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this app?')) return;

    try {
      const { error } = await (supabase as any)
        .from('user_apps')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setApps(apps.filter(app => app.id !== id));
      toast.success('App deleted');
    } catch (err: any) {
      toast.error('Failed to delete app');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <IndianSpinner size="lg" />
        <p className="text-sm text-muted-foreground">Loading your creation history...</p>
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <Card className="bg-muted/30 border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
          <History className="w-12 h-12 text-muted-foreground/30" />
          <div className="text-center">
            <p className="font-bold">No apps found</p>
            <p className="text-sm text-muted-foreground">Start by generating your first AI app.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {apps.map((app) => (
        <Card 
          key={app.id} 
          className="group cursor-pointer hover:border-primary/50 transition-all duration-300 bg-card border-border shadow-sm overflow-hidden"
          onClick={() => onSelect({
            name: app.name,
            description: app.description,
            theme: app.theme_config,
            features: app.feature_config
          })}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner"
              style={{ backgroundColor: app.theme_config?.primary || '#FF6B35' }}
            >
              <Layout className="w-6 h-6 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-base truncate">{app.name}</h4>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <Calendar className="w-3 h-3" />
                {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => handleDelete(app.id, e)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
