import { useCallback } from 'react';

export function useVoiceGuidance() {
  const speak = useCallback((text: string, langCode: string = 'en') => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Map code to Web Speech API language locales
    const langMap: Record<string, string> = {
      en: 'en-US',
      hi: 'hi-IN',
      ja: 'ja-JP',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      zh: 'zh-CN',
      ar: 'ar-SA',
      pt: 'pt-PT',
      ru: 'ru-RU'
    };

    utterance.lang = langMap[langCode] || 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    window.speechSynthesis.speak(utterance);
  }, []);

  return { speak };
}
