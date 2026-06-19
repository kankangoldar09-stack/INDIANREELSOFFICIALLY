export const OVERLAY_FONTS = [
  { label: 'Classic',   style: 'font-sans' },
  { label: 'Bold',      style: 'font-black' },
  { label: 'Serif',     style: 'font-serif' },
  { label: 'Mono',      style: 'font-mono' },
  { label: 'Italic',    style: 'font-sans italic' },
  { label: 'Light',     style: 'font-sans font-light' },
  { label: 'Condensed', style: 'font-sans tracking-tighter font-bold' },
  { label: 'Wide',      style: 'font-sans tracking-widest' },
  { label: 'XBold',     style: 'font-extrabold' },
  { label: 'Script',    style: 'font-serif italic font-light' },
  { label: 'Thin',      style: 'font-sans font-thin tracking-wide' },
  { label: 'Black',     style: 'font-black tracking-tight' },
  { label: 'Outlined',  style: 'font-black tracking-wide' },
  { label: 'Mega',      style: 'font-extrabold tracking-widest' },
];

export const OVERLAY_ANIMATIONS = [
  { label: 'None',      cls: '' },
  { label: 'Pulse',     cls: 'animate-pulse' },
  { label: 'Bounce',    cls: 'animate-bounce' },
  { label: 'Spin',      cls: 'animate-spin' },
  { label: 'Ping',      cls: 'animate-ping' },
  { label: 'Flash',     cls: '[animation:flash_1s_ease-in-out_infinite]' },
  { label: 'Swing',     cls: '[animation:swing_1.5s_ease-in-out_infinite]' },
  { label: 'Jello',     cls: '[animation:jello_1s_ease-in-out_infinite]' },
  { label: 'Rubber',    cls: '[animation:rubberBand_1s_ease-in-out_infinite]' },
  { label: 'Shake',     cls: '[animation:shake_0.8s_ease-in-out_infinite]' },
  { label: 'Tada',      cls: '[animation:tada_1.5s_ease-in-out_infinite]' },
  { label: 'Wobble',    cls: '[animation:wobble_1.5s_ease-in-out_infinite]' },
  { label: 'Flip',      cls: '[animation:flip_2s_ease-in-out_infinite]' },
  { label: 'Float',     cls: '[animation:float_2s_ease-in-out_infinite]' },
  { label: 'Glow',      cls: '[animation:glow_1.5s_ease-in-out_infinite]' },
  { label: 'Typewriter',cls: '[animation:typewriter_3s_steps(20)_infinite]' },
  { label: 'Neon',      cls: '[animation:neonFlicker_2s_ease-in-out_infinite]' },
  { label: 'Rainbow',   cls: '[animation:rainbowText_3s_linear_infinite]' },
  { label: 'Zoom',      cls: '[animation:textZoom_2s_ease-in-out_infinite]' },
  { label: 'Slide↑',    cls: '[animation:slideUpText_0.6s_ease-out_infinite_alternate]' },
  { label: 'Glitch',    cls: '[animation:glitchText_1.5s_steps(2)_infinite]' },
  { label: 'Wave',      cls: '[animation:waveText_1.5s_ease-in-out_infinite]' },
  { label: 'Fire',      cls: '[animation:fireText_0.8s_ease-in-out_infinite_alternate]' },
  { label: 'Rotate3D',  cls: '[animation:rotate3dText_3s_ease-in-out_infinite]' },
  { label: 'Marquee',   cls: '[animation:marqueeText_4s_linear_infinite]' },
];

/** Renders a single text overlay's className string — use with cn() */
export const overlayClassName = (overlay: any) => {
  const fontCls = OVERLAY_FONTS[overlay.font ?? 0]?.style ?? '';
  const animCls = OVERLAY_ANIMATIONS[overlay.animation ?? 0]?.cls ?? '';
  return `absolute select-none p-2 rounded pointer-events-none ${fontCls} ${animCls}`.trim();
};

/** Renders a single text overlay's inline style object */
export const overlayStyle = (overlay: any): React.CSSProperties => ({
  left: `${overlay.x}%`,
  top: `${overlay.y}%`,
  fontSize: `${overlay.size}px`,
  color: overlay.color,
  textAlign: overlay.align ?? 'center',
  transform: 'translate(-50%, -50%)',
  zIndex: 30,
  lineHeight: 1.1,
  textShadow:
    overlay.bgStyle === 'outline'
      ? '0 0 8px rgba(0,0,0,0.9), 1px 1px 0 #000, -1px -1px 0 #000'
      : 'none',
  backgroundColor: overlay.bgStyle === 'box' ? 'rgba(0,0,0,0.55)' : 'transparent',
  borderRadius: overlay.bgStyle === 'box' ? '6px' : '0',
});
