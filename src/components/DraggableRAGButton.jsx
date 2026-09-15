import React, { useState, useEffect, useRef } from 'react';
import { Bot } from 'lucide-react';

export default function DraggableRAGButton({ onOpenRAG }) {
  // Default position: bottom-left corner
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('studypulse_rag_pos');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return { x: 24, y: typeof window !== 'undefined' ? window.innerHeight - 80 : 500 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    elemStartX: 0,
    elemStartY: 0,
    hasMoved: false
  });

  // Clamp position on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const maxX = window.innerWidth - 64;
        const maxY = window.innerHeight - 64;
        return {
          x: Math.min(Math.max(12, prev.x), Math.max(12, maxX)),
          y: Math.min(Math.max(12, prev.y), Math.max(12, maxY))
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    dragRef.current = {
      startX: clientX,
      startY: clientY,
      elemStartX: position.x,
      elemStartY: position.y,
      hasMoved: false
    };

    setIsDragging(true);

    const handlePointerMove = (moveEvt) => {
      const currentX = moveEvt.touches ? moveEvt.touches[0].clientX : moveEvt.clientX;
      const currentY = moveEvt.touches ? moveEvt.touches[0].clientY : moveEvt.clientY;

      const deltaX = currentX - dragRef.current.startX;
      const deltaY = currentY - dragRef.current.startY;

      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        dragRef.current.hasMoved = true;
      }

      const maxX = window.innerWidth - 64;
      const maxY = window.innerHeight - 64;

      const newX = Math.min(Math.max(12, dragRef.current.elemStartX + deltaX), Math.max(12, maxX));
      const newY = Math.min(Math.max(12, dragRef.current.elemStartY + deltaY), Math.max(12, maxY));

      setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);
  };

  const handleClick = (e) => {
    if (dragRef.current.hasMoved) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onOpenRAG();
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        touchAction: 'none'
      }}
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      onClick={handleClick}
      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-2 border-blue-500/80 text-blue-600 dark:text-cyan-400 shadow-[0_4px_25px_rgba(37,99,235,0.4)] flex items-center justify-center transition-shadow select-none group ${
        isDragging ? 'cursor-grabbing scale-105 shadow-[0_0_30px_rgba(37,99,235,0.7)]' : 'cursor-grab hover:border-blue-400 hover:shadow-[0_0_25px_rgba(37,99,235,0.65)]'
      }`}
      title="Drag me anywhere on screen or click to open StudyPulse AI Assistant"
      aria-label="Open RAG AI Assistant"
    >
      <Bot className={`w-6 h-6 sm:w-7 sm:h-7 text-blue-600 dark:text-cyan-400 pointer-events-none transition-transform ${isDragging ? 'scale-110' : 'group-hover:scale-110'}`} />
    </div>
  );
}
