"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Carousel({ images, autoPlayInterval = 4000 }: { images: any[], autoPlayInterval?: number }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Pause on intersection observer (if out of view)
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Pause on visibility API (background tab)
  useEffect(() => {
    const handleVisibilityChange = () => setIsVisible(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Autoplay
  useEffect(() => {
    if (images.length <= 1 || isPaused || !isVisible) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    }, autoPlayInterval);
    
    return () => clearInterval(timer);
  }, [images.length, isPaused, isVisible, autoPlayInterval]);

  const next = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };
  
  const prev = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goTo = (index: number, e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex(index);
  };

  if (!images || images.length === 0) return null;

  return (
    <div 
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-2xl group mb-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => {
        setTimeout(() => setIsPaused(false), 2000);
      }}
    >
      <div 
        className="flex transition-transform duration-700 ease-in-out h-[400px] sm:h-[450px]"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((img, i) => (
          <div key={img.id || i} className="w-full h-full shrink-0 relative flex justify-center bg-black/5">
            {img.type === "INSTAGRAM" ? (
              <iframe 
                src={img.url} 
                className="w-full h-full max-w-[400px] border-none"
                frameBorder="0" 
                scrolling="no" 
                allowTransparency={true} 
                allow="encrypted-media"
              ></iframe>
            ) : (
              <img 
                src={img.url}
                alt={`Galeria ${i + 1}`}
                className="w-full h-full object-cover pointer-events-none"
                loading={i === 0 ? "eager" : "lazy"}
              />
            )}
          </div>
        ))}
      </div>
      
      {images.length > 1 && (
        <>
          <button 
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/70 text-[#3A3335] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-md"
          >
            <ChevronLeft size={16} />
          </button>
          
          <button 
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/70 text-[#3A3335] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-md"
          >
            <ChevronRight size={16} />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, i) => (
              <button 
                key={i} 
                onClick={(e) => goTo(i, e)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentIndex ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/80'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
