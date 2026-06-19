import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Smile, Search, X } from 'lucide-react';
import IndianSpinner from '@/components/ui/IndianSpinner';

interface GifSelectorProps {
  onSelect: (url: string) => void;
  trigger?: React.ReactNode;
}

const GIPHY_API_KEY = 'BA3SVK2szqSwkxxquFp5bHBvfBzMG04e';

export function GifSelector({ onSelect, trigger }: GifSelectorProps) {
  const [search, setSearch] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTrending();
    }
  }, [open]);

  const fetchTrending = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=50&rating=g`
      );
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error('Error fetching trending gifs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearch(query);
    if (!query.trim()) {
      fetchTrending();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(
          query
        )}&limit=50&rating=g`
      );
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error('Error searching gifs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-primary">
            <Smile className="w-5 h-5" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0 rounded-t-xl">
        <SheetHeader className="p-4 border-b border-border sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <SheetTitle>Select GIF</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search GIPHY..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </SheetHeader>
        
        <ScrollArea className="flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full py-20">
              <IndianSpinner size="lg" />
            </div>
          ) : gifs.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 pb-6">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => {
                    onSelect(gif.images.fixed_height.url);
                    setOpen(false);
                    setSearch('');
                  }}
                  className="relative aspect-video overflow-hidden rounded-lg bg-muted hover:ring-2 hover:ring-primary transition-all"
                >
                  <img
                    src={gif.images.fixed_height.url}
                    alt={gif.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <Smile className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No GIFs found</p>
            </div>
          )}
        </ScrollArea>
        
        <div className="p-3 text-xs text-center text-muted-foreground border-t border-border bg-background">
          Powered by GIPHY
        </div>
      </SheetContent>
    </Sheet>
  );
}
