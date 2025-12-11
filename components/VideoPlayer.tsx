import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface VideoPlayerProps {
  url: string;
  title: string;
  onClose: () => void;
}

declare global {
  interface Window {
    Hls: any;
  }
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, title, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: any;

    if (window.Hls && window.Hls.isSupported()) {
      hls = new window.Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.log("Autoplay prevented:", e));
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(e => console.log("Autoplay prevented:", e));
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [url]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center z-10 pointer-events-none">
        <h2 className="text-white text-xl font-bold drop-shadow-md pointer-events-auto">{title}</h2>
        <button 
          onClick={onClose}
          className="bg-black/50 p-2 rounded-full text-white hover:text-cyan-400 hover:bg-black/80 transition pointer-events-auto cursor-pointer"
        >
          <X size={32} />
        </button>
      </div>

      {/* Player */}
      <div className="flex-1 flex items-center justify-center bg-black">
        <video 
          ref={videoRef} 
          controls 
          className="w-full h-full max-h-screen object-contain"
          autoPlay
        />
      </div>
    </div>
  );
};