"use client";

import React, { useEffect, useState, useRef } from "react";

interface AudioVisualizerProps {
  isPlaying: boolean;
  barCount?: number;
  height?: number;
}

export default function AudioVisualizer({
  isPlaying,
  barCount = 24,
  height = 36,
}: AudioVisualizerProps) {
  const [barHeights, setBarHeights] = useState<number[]>(
    Array(barCount).fill(15)
  );
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      // Oynatılmıyorsa barları yumuşakça varsayılan rölanti yüksekliğine indir
      setBarHeights(Array(barCount).fill(12));
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let phase = 0;

    const animate = () => {
      phase += 0.15;
      const newHeights = Array.from({ length: barCount }, (_, i) => {
        // Dalga simülasyonu + rastgele ses frekans hareketleri
        const sinWave = Math.sin(phase + i * 0.4);
        const cosWave = Math.cos(phase * 0.8 + i * 0.3);
        const randomFactor = Math.random() * 0.3;
        
        // %15 ile %95 arasında dinamik bar yüksekliği
        const val = Math.max(
          15,
          Math.min(95, Math.abs(sinWave + cosWave + randomFactor) * 45 + 20)
        );
        return Math.round(val);
      });

      setBarHeights(newHeights);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, barCount]);

  return (
    <div
      className="flex items-center justify-center gap-1 py-1 px-3 rounded-2xl bg-neutral-100/80 dark:bg-neutral-900/80 border border-neutral-200/80 dark:border-neutral-800/80 backdrop-blur-xs shadow-3xs"
      style={{ height: `${height + 12}px` }}
    >
      {barHeights.map((h, i) => (
        <span
          key={i}
          style={{
            height: `${isPlaying ? h : 15}%`,
            minHeight: "4px",
          }}
          className={`w-1 rounded-full transition-all duration-100 ${
            isPlaying
              ? "bg-neutral-950 dark:bg-white opacity-90 shadow-xs"
              : "bg-neutral-400 dark:bg-neutral-600 opacity-40"
          }`}
        />
      ))}
    </div>
  );
}
