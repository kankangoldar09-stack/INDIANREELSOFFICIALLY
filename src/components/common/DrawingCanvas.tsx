import React, { useRef, useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { X, Eraser, PenTool, Trash2 } from 'lucide-react';

interface DrawingCanvasProps {
  channelName: string;
  onClose: () => void;
}

export function DrawingCanvas({ channelName, onClose }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#0095f6');
  const [brushSize, setBrushSize] = useState(5);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const context = canvas.getContext('2d');
    if (context) {
      context.scale(window.devicePixelRatio, window.devicePixelRatio);
      context.lineCap = 'round';
      context.strokeStyle = color;
      context.lineWidth = brushSize;
      contextRef.current = context;
    }

    // Subscribe to broadcast
    channelRef.current = supabase.channel(channelName);
    
    channelRef.current
      .on('broadcast', { event: 'draw' }, (payload: any) => {
        const { x, y, prevX, prevY, strokeColor, size } = payload.payload;
        drawOnCanvas(x, y, prevX, prevY, strokeColor, size);
      })
      .on('broadcast', { event: 'clear' }, () => {
        clearLocalCanvas();
      })
      .subscribe();

    return () => {
      channelRef.current.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = color;
      contextRef.current.lineWidth = brushSize;
    }
  }, [color, brushSize]);

  const drawOnCanvas = (x: number, y: number, prevX: number, prevY: number, strokeColor: string, size: number) => {
    if (!contextRef.current) return;
    contextRef.current.beginPath();
    contextRef.current.strokeStyle = strokeColor;
    contextRef.current.lineWidth = size;
    contextRef.current.moveTo(prevX, prevY);
    contextRef.current.lineTo(x, y);
    contextRef.current.stroke();
    contextRef.current.closePath();
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const { offsetX, offsetY } = getCoordinates(e);
    contextRef.current?.beginPath();
    contextRef.current?.moveTo(offsetX, offsetY);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    contextRef.current?.closePath();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !contextRef.current) return;
    
    const { offsetX, offsetY } = getCoordinates(e);
    const prevX = lastPos.current.x;
    const prevY = lastPos.current.y;

    drawOnCanvas(offsetX, offsetY, prevX, prevY, color, brushSize);

    // Broadcast
    channelRef.current.send({
      type: 'broadcast',
      event: 'draw',
      payload: { x: offsetX, y: offsetY, prevX, prevY, strokeColor: color, size: brushSize }
    });

    lastPos.current = { x: offsetX, y: offsetY };
  };

  const lastPos = useRef({ x: 0, y: 0 });

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };
    
    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.nativeEvent.offsetX;
      y = e.nativeEvent.offsetY;
    }
    
    // Save current position for next lineTo
    if (isDrawing) {
       // already updated in startDrawing
    } else {
       lastPos.current = { x, y };
    }
    
    return { offsetX: x, offsetY: y };
  };

  const clearLocalCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !contextRef.current) return;
    contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
  };

  const clearCanvas = () => {
    clearLocalCanvas();
    channelRef.current.send({
      type: 'broadcast',
      event: 'clear',
      payload: {}
    });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        <div className="p-4 border-b flex items-center justify-between bg-zinc-800">
          <div className="flex items-center gap-4">
            <h2 className="text-white font-bold flex items-center gap-2">
               <PenTool className="w-5 h-5" /> Live Draw
            </h2>
            <div className="flex gap-2">
               {['#ff0000', '#00ff00', '#0095f6', '#ffff00', '#ffffff'].map(c => (
                 <button 
                   key={c}
                   onClick={() => setColor(c)}
                   className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-white' : 'border-transparent'}`}
                   style={{ backgroundColor: c }}
                 />
               ))}
            </div>
            <input 
              type="range" 
              min="1" 
              max="20" 
              value={brushSize} 
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-24 accent-primary"
            />
          </div>
          <div className="flex gap-2">
             <Button variant="ghost" size="icon" onClick={clearCanvas} className="text-zinc-400 hover:text-white">
                <Trash2 className="w-5 h-5" />
             </Button>
             <Button variant="ghost" size="icon" onClick={onClose} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
             </Button>
          </div>
        </div>
        
        <canvas 
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="bg-zinc-950 flex-1 touch-none"
        />
        
        <div className="p-3 text-center text-[10px] text-zinc-500 font-bold uppercase tracking-widest bg-zinc-800">
           Both of you see what you draw in real-time
        </div>
      </div>
    </div>
  );
}
