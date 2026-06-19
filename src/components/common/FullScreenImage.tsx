import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FullScreenImageProps {
  src: string | null | undefined;
  isOpen: boolean;
  onClose: () => void;
}

export function FullScreenImage({ src, isOpen, onClose }: FullScreenImageProps) {
  if (!src) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-black/90 flex items-center justify-center overflow-hidden">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
          onClick={onClose}
        >
          <X className="w-8 h-8" />
        </Button>
        <img 
          src={src} 
          alt="Full screen" 
          className="w-full h-full object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}
