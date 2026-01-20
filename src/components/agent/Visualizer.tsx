import React, { useEffect, useRef } from 'react';

export function Visualizer({ isSpeaking }: { isSpeaking: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = isSpeaking ? '#4ade80' : '#374151'; // Green if speaking, Gray if not
      
      const bars = 20;
      const width = canvas.width / bars;
      
      for (let i = 0; i < bars; i++) {
        const height = isSpeaking 
          ? Math.random() * canvas.height * 0.8 + 5 
          : 5;
        
        ctx.fillRect(i * width, canvas.height / 2 - height / 2, width - 2, height);
      }
      
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [isSpeaking]);

  return <canvas ref={canvasRef} width={200} height={50} className="rounded-md bg-black/20" />;
}
