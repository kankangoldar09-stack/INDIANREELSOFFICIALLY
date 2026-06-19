import React from 'react';
import { 
  Home, User, MessageSquare, BarChart, Settings, 
  Search, Bell, PlusSquare, Smartphone, ChevronRight, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AppPreviewProps {
  config: any;
}

export function AppPreview({ config }: AppPreviewProps) {
  if (!config) return null;

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Home': return Home;
      case 'User': return User;
      case 'MessageSquare': return MessageSquare;
      case 'BarChart': return BarChart;
      case 'Settings': return Settings;
      case 'Search': return Search;
      case 'Bell': return Bell;
      case 'PlusSquare': return PlusSquare;
      default: return Home;
    }
  };

  const theme = config.theme || {};
  const primaryColor = theme.primary || '#FF6B35';
  const backgroundColor = theme.background || '#0a0a0a';

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-1">Live Preview</h3>
      
      <div 
        className="relative aspect-[9/16] w-full rounded-[2.5rem] border-8 border-zinc-800 shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor }}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-6 bg-zinc-800 rounded-b-2xl z-50"></div>

        {/* Header */}
        {config.layout?.headerEnabled && (
          <div className="pt-8 px-6 pb-4 flex items-center justify-between border-b border-white/5">
            <h4 className="font-black text-xl tracking-tighter" style={{ color: primaryColor }}>
              {config.name}
            </h4>
            <div className="flex gap-3">
              <Search className="w-5 h-5 text-white/40" />
              <Bell className="w-5 h-5 text-white/40" />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-2">
            <h5 className="text-white font-bold text-lg">Welcome to {config.name}!</h5>
            <p className="text-white/60 text-sm leading-relaxed">
              {config.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square rounded-2xl bg-white/5 border border-white/10 animate-pulse flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-white/10" />
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="h-24 w-full rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between px-6">
              <div>
                <p className="text-xs text-white/40 uppercase font-bold tracking-widest">Active Users</p>
                <p className="text-2xl font-black text-white">1,234</p>
              </div>
              <BarChart className="w-8 h-8 text-primary/40" />
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        {config.layout?.footerEnabled && (
          <div className="bg-black/50 backdrop-blur-xl border-t border-white/5 h-16 px-6 flex items-center justify-between pb-2">
            {config.features?.filter((f: any) => f.enabled).slice(0, 5).map((feature: any) => {
              const Icon = getIcon(feature.icon);
              return (
                <div key={feature.id} className="flex flex-col items-center gap-1">
                  <Icon className="w-5 h-5 text-white/40" />
                  <span className="text-[10px] text-white/40 font-bold uppercase">{feature.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
        <div className="flex items-center gap-3 text-primary">
          <Sparkles className="w-5 h-5" />
          <p className="text-xs font-bold uppercase tracking-widest">Theme Details</p>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="space-y-1">
            <div className="w-full h-8 rounded-lg" style={{ backgroundColor: theme.primary }}></div>
            <p className="text-[10px] text-center font-mono uppercase text-muted-foreground">{theme.primary}</p>
          </div>
          <div className="space-y-1">
            <div className="w-full h-8 rounded-lg" style={{ backgroundColor: theme.secondary }}></div>
            <p className="text-[10px] text-center font-mono uppercase text-muted-foreground">{theme.secondary}</p>
          </div>
          <div className="space-y-1">
            <div className="w-full h-8 rounded-lg border border-white/10" style={{ backgroundColor: theme.background }}></div>
            <p className="text-[10px] text-center font-mono uppercase text-muted-foreground">{theme.background}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
