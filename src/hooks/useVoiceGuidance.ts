import { useCallback } from 'react';

export function useVoiceGuidance() {
  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    window.speechSynthesis.speak(utterance);
  }, []);

  return { speak };
}
