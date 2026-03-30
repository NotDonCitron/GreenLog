"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollAnimator } from "./scroll-animator";

interface CounterBlockProps {
  end: number;
  suffix?: string;
  label: string;
  index?: number;
}

export function CounterBlock({
  end,
  suffix = "",
  label,
  index = 0,
}: CounterBlockProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          observer.unobserve(element);

          const duration = 2000;
          const steps = 60;
          const stepDuration = duration / steps;
          const increment = end / steps;
          let current = 0;
          let step = 0;

          const timer = setInterval(() => {
            step++;
            current = Math.min(Math.round(increment * step), end);
            setCount(current);

            if (step >= steps) {
              clearInterval(timer);
              setCount(end);
            }
          }, stepDuration);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [end]);

  return (
    <ScrollAnimator animation="scale" delay={index * 150}>
      <div className="text-center">
        <span
          ref={ref}
          className="text-4xl md:text-5xl font-black text-[#00F5FF] [text-shadow:0_0_10px_#00F5FF,0_0_20px_#00F5FF,0_0_30px_#00F5FF]"
        >
          {count}
          {suffix}
        </span>
        <p className="text-sm text-[var(--muted-foreground)] uppercase tracking-wider mt-2">
          {label}
        </p>
      </div>
    </ScrollAnimator>
  );
}