import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Params = Partial<
  Record<keyof URLSearchParams, string | number | null | undefined>
>;

export function createQueryString(
  params: Params,
  searchParams: URLSearchParams
) {
  const newSearchParams = new URLSearchParams(searchParams?.toString());

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      newSearchParams.delete(key);
    } else {
      newSearchParams.set(key, String(value));
    }
  }

  return newSearchParams.toString();
}

export function formatDate(
  date: Date | string | number,
  opts: Intl.DateTimeFormatOptions = {}
) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: opts.month ?? "long",
    day: opts.day ?? "numeric",
    year: opts.year ?? "numeric",
    ...opts,
  }).format(new Date(date));
}

/**
 * Stop all active media streams (camera, microphone)
 * This ensures that camera/mic don't interfere with audio playback
 */
export function stopAllMediaStreams() {
  try {
    // Get all video elements
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach((video) => {
      if (video.srcObject && video.srcObject instanceof MediaStream) {
        const stream = video.srcObject;
        stream.getTracks().forEach(track => {
          track.stop();
          console.log(`Stopped ${track.kind} track from video element`);
        });
        video.srcObject = null;
      }
    });

    // Get all audio elements that might have streams
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach((audio) => {
      if (audio.srcObject && audio.srcObject instanceof MediaStream) {
        const stream = audio.srcObject;
        stream.getTracks().forEach(track => {
          track.stop();
          console.log(`Stopped ${track.kind} track from audio element`);
        });
        audio.srcObject = null;
      }
    });

    console.log('✅ All media streams stopped');
  } catch (error) {
    console.error('Error stopping media streams:', error);
  }
}
