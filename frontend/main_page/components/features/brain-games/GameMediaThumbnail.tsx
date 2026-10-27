"use client";

import Image from "next/image";
import { useState } from "react";
import GameMediaPlaceholder from "./GameMediaPlaceholder";

interface GameMediaThumbnailProps {
  src: string;
  alt: string;
  video?: boolean;
  priority?: boolean;
  eager?: boolean;
  onError: () => void;
}

export default function GameMediaThumbnail({ src, alt, video = false, priority = false, eager = false, onError }: GameMediaThumbnailProps) {
  const [loaded, setLoaded] = useState(false);
  const className = `pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-300 motion-reduce:transition-none ${loaded ? "opacity-100" : "opacity-0"}`;
  return (
    <>
      {!loaded && <GameMediaPlaceholder />}
      {video ? (
        <video muted playsInline preload="metadata" tabIndex={-1} aria-hidden="true" src={src} className={className}
          onLoadedMetadata={(event) => {
            const element = event.currentTarget;
            const time = Number.isFinite(element.duration) ? Math.min(0.1, Math.max(0, element.duration - 0.01)) : 0.1;
            if (time > 0) element.currentTime = time;
          }}
          onLoadedData={(event) => { if (!event.currentTarget.seeking) setLoaded(true); }}
          onSeeked={(event) => { if (event.currentTarget.readyState >= 2) setLoaded(true); }}
          onError={onError} />
      ) : (
        <Image src={src} alt={alt} fill unoptimized priority={priority} loading={priority ? undefined : eager ? "eager" : "lazy"}
          sizes="(max-width: 640px) 85vw, 33vw" className={className} onLoad={() => setLoaded(true)} onError={onError} />
      )}
    </>
  );
}
