import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CaptionSegment {
  start: number;
  end: number;
  text: string;
  words?: { word: string; start: number; end: number }[];
}

interface CaptionsData {
  [key: string]: CaptionSegment[] | string | undefined;
  source_language?: string;
  detected_language_name?: string;
}

interface CaptionsProps {
  captions: CaptionsData;
  currentTime: number;
  language: string; // Can be 'en', 'hi', 'pa', or any detected language code
}

export function Captions({ captions, currentTime, language }: CaptionsProps) {
  const sourceLanguage = captions.source_language as string || 'en';
  const currentSegments = (captions[language] as CaptionSegment[]) || (captions[sourceLanguage] as CaptionSegment[]) || [];
  const [isExpanded, setIsExpanded] = useState(false);
  const lastSegmentRef = React.useRef<string | null>(null);

  // Find the active segment
  const activeSegment = currentSegments.find(
    (s) => currentTime >= s.start && currentTime <= s.end
  );

  // Reset expansion state when segment changes
  useEffect(() => {
    if (activeSegment && lastSegmentRef.current !== activeSegment.text) {
      setIsExpanded(false);
      lastSegmentRef.current = activeSegment.text;
    }
  }, [activeSegment]);

  if (!activeSegment) return null;

  // Use the words data for "Ek Ek Karke" animation
  const words = activeSegment.words || activeSegment.text.split(' ').map((w, i, arr) => {
    const duration = activeSegment.end - activeSegment.start;
    return {
      word: w,
      start: activeSegment.start + (i * (duration / arr.length)),
      end: activeSegment.start + ((i + 1) * (duration / arr.length))
    };
  });

  return (
    <div className="absolute top-10 left-0 right-0 flex justify-center px-4 pointer-events-none z-50">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "bg-black/30 backdrop-blur-[0.5px] text-white px-3 py-1.5 rounded text-[10px] font-bold text-center w-fit max-w-[95%] border border-white/5 shadow-sm animate-in fade-in duration-300 uppercase tracking-tight flex flex-wrap justify-center gap-1.5 pointer-events-auto cursor-pointer select-none transition-all",
          isExpanded ? "scale-105 bg-black/60 backdrop-blur-md" : ""
        )}
      >
        {words.map((w, idx) => {
          const isCurrent = currentTime >= w.start && currentTime <= w.end;
          const isPast = currentTime > w.end;
          
          // "Ek Ek Karke" (Build-up style): Show words as they are spoken. 
          // They stay visible in the line until the 10-word segment clears.
          // If expanded, show all words in the segment immediately.
          const isVisible = isExpanded || isCurrent || isPast;

          if (!isVisible) return null;

          return (
            <span 
              key={idx}
              className={cn(
                "transition-all duration-100 transform inline-block",
                isCurrent && !isExpanded ? "scale-125 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]" : "",
                !isCurrent && isExpanded ? "text-white/60 scale-95" : ""
              )}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    </div>
  );
}
