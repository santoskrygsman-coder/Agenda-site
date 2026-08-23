"use client";

import { useEffect, useRef, useState } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type RevealProps = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  animation?: "fade-up" | "fade-in" | "zoom-in";
  duration?: number;
};

export default function Reveal({
  children,
  delay = 0,
  className,
  animation = "fade-up",
  duration = 700,
}: RevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Se o usuário preferir menos movimento, mostramos imediatamente sem observer
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setIsVisible(true);
      return;
    }

    const currentRef = ref.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(currentRef); // Anima apenas 1 vez
        }
      },
      {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
      }
    );

    observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, []);

  const getBaseClasses = () => {
    if (animation === "fade-up") return "opacity-0 translate-y-6";
    if (animation === "zoom-in") return "opacity-0 scale-[0.97]";
    return "opacity-0";
  };

  const getVisibleClasses = () => {
    if (animation === "fade-up") return "opacity-100 translate-y-0";
    if (animation === "zoom-in") return "opacity-100 scale-100";
    return "opacity-100";
  };

  return (
    <div
      ref={ref}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
      className={cn(
        "transition-all ease-[cubic-bezier(0.21,1.02,0.73,1)] motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:transform-none",
        isVisible ? getVisibleClasses() : getBaseClasses(),
        className
      )}
    >
      {children}
    </div>
  );
}
