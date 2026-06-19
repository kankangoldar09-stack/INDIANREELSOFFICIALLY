import { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface CropModalProps {
  image: string;
  onCrop: (croppedImage: Blob) => void;
  onCancel: () => void;
}

export default function CropModal({ image, onCrop, onCancel }: CropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      }, 'image/jpeg');
    });
  };

  const handleCrop = async () => {
    if (!croppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImg(image, croppedAreaPixels);
      onCrop(croppedBlob);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-[500px] w-[95vw] h-[600px] flex flex-col p-0 overflow-hidden bg-background border-primary/20">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-xl font-black text-center bg-gradient-to-r from-orange-500 to-green-500 bg-clip-text text-transparent">
            Crop Photo
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 relative bg-black/5 min-h-[300px]">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        <div className="p-6 space-y-4 bg-background">
          <div className="flex items-center gap-4">
            <ZoomOut className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={(value) => setZoom(value[0])}
              className="flex-1"
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
          </div>

          <DialogFooter className="flex-row gap-2 pt-2">
            <Button variant="outline" className="flex-1 font-bold border-primary/20" onClick={onCancel}>
              Cancel
            </Button>
            <Button className="flex-1 font-bold bg-gradient-to-r from-orange-600 to-green-600 hover:opacity-90" onClick={handleCrop}>
              Done
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
