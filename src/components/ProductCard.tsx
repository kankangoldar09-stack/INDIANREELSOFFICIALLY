import { useState, useRef, useEffect } from 'react';
import { ShoppingBag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductCardProps {
  productName: string;
  productImage?: string;
  productPrice?: string;
  productLink: string;
  position: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  onRemove?: () => void;
  isEditable?: boolean;
  onClick?: () => void;
}

export default function ProductCard({
  productName,
  productImage,
  productPrice,
  productLink,
  position,
  onPositionChange,
  onRemove,
  isEditable = false,
  onClick
}: ProductCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditable || !cardRef.current?.parentElement) return;
    e.preventDefault();
    setIsDragging(true);
    const parent = cardRef.current.parentElement.getBoundingClientRect();
    const currentX = (position.x / 100) * parent.width;
    const currentY = (position.y / 100) * parent.height;
    setDragStart({
      x: e.clientX - currentX,
      y: e.clientY - currentY
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isEditable || !cardRef.current?.parentElement) return;
    e.preventDefault();
    setIsDragging(true);
    const parent = cardRef.current.parentElement.getBoundingClientRect();
    const currentX = (position.x / 100) * parent.width;
    const currentY = (position.y / 100) * parent.height;
    const touch = e.touches[0];
    setDragStart({
      x: touch.clientX - currentX,
      y: touch.clientY - currentY
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !onPositionChange || !cardRef.current?.parentElement) return;
      const parent = cardRef.current.parentElement.getBoundingClientRect();
      const currentX = e.clientX - dragStart.x;
      const currentY = e.clientY - dragStart.y;
      
      const percentX = Math.max(0, Math.min(100, (currentX / parent.width) * 100));
      const percentY = Math.max(0, Math.min(100, (currentY / parent.height) * 100));
      
      onPositionChange({ x: percentX, y: percentY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !onPositionChange || !cardRef.current?.parentElement) return;
      const parent = cardRef.current.parentElement.getBoundingClientRect();
      const touch = e.touches[0];
      const currentX = touch.clientX - dragStart.x;
      const currentY = touch.clientY - dragStart.y;
      
      const percentX = Math.max(0, Math.min(100, (currentX / parent.width) * 100));
      const percentY = Math.max(0, Math.min(100, (currentY / parent.height) * 100));
      
      onPositionChange({ x: percentX, y: percentY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, dragStart, onPositionChange]);

  const handleClick = () => {
    if (!isEditable && onClick) {
      onClick();
    }
  };

  return (
    <div
      ref={cardRef}
      className={`absolute bg-background/90 backdrop-blur-sm border border-border rounded-lg shadow-lg p-2 flex items-center gap-2 max-w-[200px] pointer-events-auto ${
        isEditable ? 'cursor-move' : 'cursor-pointer'
      } ${isDragging ? 'opacity-70' : ''}`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        touchAction: 'none',
        transform: 'translate(-50%, -50%)'
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
    >
      {/* Product Image or Icon */}
      {productImage ? (
        <img
          src={productImage}
          alt={productName}
          className="w-12 h-12 object-cover rounded"
        />
      ) : (
        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
          <ShoppingBag className="w-6 h-6 text-muted-foreground" />
        </div>
      )}

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{productName}</p>
        {productPrice && (
          <p className="text-xs text-muted-foreground truncate">{productPrice}</p>
        )}
        <div className="flex items-center gap-1 mt-0.5">
          <ShoppingBag className="w-3 h-3 text-primary" />
          <span className="text-[10px] text-primary">Shop now</span>
        </div>
      </div>

      {/* Remove Button (only in edit mode) */}
      {isEditable && onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="w-6 h-6 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
