"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type AnimationType = "fade-up" | "fade-in" | "scale";

interface ScrollAnimatorProps {
  children: ReactNode;
  className?: string;
  animation?: AnimationType;
  delay?: number;
}

export function ScrollAnimator({
  children,
  className = "",
  animation = "fade-up",
  delay = 0,
}: ScrollAnimatorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const getAnimationClasses = () => {
    switch (animation) {
      case "fade-up":
        return isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-8";
      case "fade-in":
        return isVisible ? "opacity-100" : "opacity-0";
      case "scale":
        return isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95";
      default:
        return "";
    }
  };

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${getAnimationClasses()} ${className}`}
      style={{ transitionDelay: delay ? `${delay}ms` : undefined }}
    >
      {children}
    </div>
  );
}