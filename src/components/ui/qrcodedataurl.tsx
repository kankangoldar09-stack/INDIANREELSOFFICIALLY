/**
 * QR Code Generator Component
 * 
 * React wrapper component based on QRCode.js that can convert any text to QR code image
 * Supports rounded modules for modern, Facebook-style QR codes
 * 
 * Usage example:
 * import QRCodeDataUrl from './components/qrcodedataurl'
 * 
 * function App() {
 *   return <QRCodeDataUrl text="https://example.com" roundedModules /> // Replace with valid URL
 * }
 */

import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';

interface QRCodeDataUrlProps {
  /** 
   * Text content to be encoded as QR code
   * Can be URL, text, contact information, etc.
   * Example: "https://example.com" or "CONTACT:1234567890"
   */
  text: string;

  /**
   * QR code image width (pixels)
   * @default 128
   */
  width?: number;

  /**
   * QR code foreground color (valid CSS color value)
   * @default "#000000" (black)
   */
  color?: string;

  /**
   * QR code background color (valid CSS color value) 
   * @default "#ffffff" (white)
   */
  backgroundColor?: string;

  /**
   * Custom CSS class name
   */
  className?: string;

  /**
   * Border radius for rounded corners (CSS value)
   * @default "0px"
   */
  borderRadius?: string;

  /**
   * Error correction level
   * L: Low (7% recovery)
   * M: Medium (15% recovery) - default
   * Q: Quartile (25% recovery)
   * H: High (30% recovery) - recommended for QR codes with logos
   * @default "H"
   */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';

  /**
   * Margin around QR code (in modules/blocks)
   * @default 2
   */
  margin?: number;

  /**
   * Enable rounded modules (dots) for modern Facebook-style QR codes
   * @default false
   */
  roundedModules?: boolean;

  /**
   * Radius percentage for rounded modules (0-1)
   * @default 0.45
   */
  moduleRadius?: number;
}

/**
 * Draw a rounded rectangle on canvas
 */
const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
};

/**
 * QR Code Generator Component
 * @param {QRCodeDataUrlProps} props - Component properties
 */
const QRCodeDataUrl: React.FC<QRCodeDataUrlProps> = ({
  text,
  width = 128,
  color = '#000000',
  backgroundColor = '#ffffff',
  className = '',
  borderRadius = '0px',
  errorCorrectionLevel = 'H',
  margin = 2,
  roundedModules = false,
  moduleRadius = 0.45,
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const generateQR = async () => {
      try {
        if (roundedModules) {
          // Generate QR code matrix
          const qrData = await QRCode.create(text, {
            errorCorrectionLevel,
          });

          const modules = qrData.modules;
          const moduleCount = modules.size;
          const totalMargin = margin * 2;
          const canvasSize = width;
          const moduleSize = (canvasSize - totalMargin * (canvasSize / moduleCount)) / moduleCount;
          const marginSize = margin * moduleSize;

          // Create canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          canvas.width = canvasSize;
          canvas.height = canvasSize;

          // Fill background
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, canvasSize, canvasSize);

          // Draw rounded modules
          ctx.fillStyle = color;
          const radius = moduleSize * moduleRadius;

          for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
              if (modules.get(row, col)) {
                const x = marginSize + col * moduleSize;
                const y = marginSize + row * moduleSize;
                drawRoundedRect(ctx, x, y, moduleSize, moduleSize, radius);
              }
            }
          }

          setDataUrl(canvas.toDataURL());
        } else {
          // Standard QR code generation
          const url = await QRCode.toDataURL(text, {
            width,
            margin,
            errorCorrectionLevel,
            color: {
              dark: color,
              light: backgroundColor,
            },
          });
          setDataUrl(url);
        }
      } catch (err) {
        console.error('Failed to generate QR code:', err);
      }
    };

    generateQR();
  }, [text, width, color, backgroundColor, errorCorrectionLevel, margin, roundedModules, moduleRadius]);

  return (
    <div className={`qr-code-container ${className}`}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={`QR Code: ${text}`}
          width={width}
          height={width}
          style={{ borderRadius }}
          className="object-cover"
        />
      ) : (
        <div>Generating QR code...</div>
      )}
    </div>
  );
};

export default QRCodeDataUrl;