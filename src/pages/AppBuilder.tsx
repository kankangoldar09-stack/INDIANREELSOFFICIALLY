import React, { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Bot, Rocket, History, Layout, Palette, Settings, 
  ChevronRight, Save, Play, Plus, Trash2,
  Home, User, MessageSquare, BarChart, Smartphone, Sparkles,
  Search, Bell, PlusSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppCreator } from '@/components/app-builder/AppCreator';
import { AppPreview } from '@/components/app-builder/AppPreview';
import { AppHistory } from '@/components/app-builder/AppHistory';

export default function AppBuilder() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('create');
  const [currentConfig, setCurrentConfig] = useState<any>(null);

  return (
    <div className="min-h-screen bg-background pb-20 pt-4 px-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-primary/20 p-2 rounded-xl">
          <Bot className="w-8 h-8 text-primary animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">AI App Builder</h1>
          <p className="text-xs text-muted-foreground font-medium">Create and preview apps with AI</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-full mb-6 bg-muted/50 rounded-xl p-1">
          <TabsTrigger value="create" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Create
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="w-4 h-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <AppCreator onGenerated={(config) => setCurrentConfig(config)} />
          {currentConfig && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <AppPreview config={currentConfig} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <AppHistory onSelect={(config) => {
            setCurrentConfig(config);
            setActiveTab('create');
          }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
