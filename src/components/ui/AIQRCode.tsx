import React, { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import IndianSpinner from '@/components/ui/IndianSpinner';

interface AIQRCodeProps {
  text: string;
  width?: number;
  style?: 'artistic' | 'cyberpunk' | 'nature' | 'abstract' | 'minimal' | 'galaxy' | 'fire' | 'ocean';
  prompt?: string;
  className?: string;
  fallbackToNormal?: boolean;
  provider?: 'huggingface' | 'grok';
}

const AIQRCode: React.FC<AIQRCodeProps> = ({
  text,
  width = 280,
  style = 'artistic',
  prompt,
  className = '',
  fallbackToNormal = true,
  provider = 'grok',
}) => {
  const [qrImage, setQrImage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    generateQRCode();
  }, [text, style, prompt, provider]);

  const generateQRCode = async () => {
    setLoading(true);
    setError('');

    try {
      // Choose the appropriate Edge Function based on provider
      const functionName = provider === 'grok' ? 'generate-grok-image' : 'generate-qr-art';
      
      const { data, error: functionError } = await supabase.functions.invoke(functionName, {
        body: {
          qrData: text,
          prompt,
          style,
        },
      });

      if (functionError) {
        throw functionError;
      }

      if (data?.error) {
        // If model is loading or error with fallback flag, retry or fallback
        if (data.loading && retryCount < 3) {
          setTimeout(() => {
            setRetryCount(retryCount + 1);
            generateQRCode();
          }, 5000);
          setError('AI model is warming up, please wait...');
          return;
        }
        
        if (data.fallback) {
          throw new Error(data.error);
        }
        
        throw new Error(data.error);
      }

      if (data?.image) {
        setQrImage(data.image);
        setLoading(false);
      }
    } catch (err: any) {
      console.error(`Error generating AI QR code with ${provider}:`, err);
      setError(err.message || 'Failed to generate AI QR code');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div 
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl ${className}`}
        style={{ width, height: width }}
      >
        <IndianSpinner size="lg" className="mb-3" />
        <p className="text-sm text-slate-600 font-medium text-center px-4">
          {retryCount > 0 ? 'Warming up AI...' : `Generating with ${provider === 'grok' ? 'Grok AI' : 'Hugging Face'}...`}
        </p>
      </div>
    );
  }

  if (error && !fallbackToNormal) {
    return (
      <div 
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-4 ${className}`}
        style={{ width, height: width }}
      >
        <p className="text-sm text-red-600 font-medium text-center">{error}</p>
        <button
          onClick={generateQRCode}
          className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (error && fallbackToNormal) {
    // Fallback to normal QR code
    return (
      <div className={className}>
        <div className="relative p-6 bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=${width}x${width}&data=${encodeURIComponent(text)}&color=06b6d4&bgcolor=ffffff`}
            alt="QR Code"
            width={width}
            height={width}
            className="rounded-2xl"
          />
        </div>
        <p className="text-xs text-center text-slate-500 mt-2">Using standard QR code</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <img
        src={qrImage}
        alt={`AI Generated QR Code (${provider})`}
        width={width}
        height={width}
        className="rounded-2xl shadow-2xl"
      />
    </div>
  );
};

export default AIQRCode;
