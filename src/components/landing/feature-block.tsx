"use client";

import { type ReactNode } from "react";
import { ScrollAnimator } from "./scroll-animator";

interface FeatureBlockProps {
  icon: ReactNode;
  title: string;
  description: string;
  index?: number;
}

export function FeatureBlock({ icon, title, description, index = 0 }: FeatureBlockProps) {
  return (
    <ScrollAnimator animation="fade-up" delay={index * 100}>
      <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--background)]/50 backdrop-blur-sm hover:border-[#00F5FF]/50 hover:-translate-y-1 transition-all duration-300">
        <div className="w-14 h-14 rounded-xl bg-[#00F5FF]/10 flex items-center justify-center mb-5 hover:bg-[#00F5FF]/20 transition-colors">
          <div className="text-[#00F5FF]">{icon}</div>
        </div>
        <h3 className="text-lg font-bold text-[var(--foreground)] mb-2">
          {title}
        </h3>
        <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
          {description}
        </p>
      </div>
    </ScrollAnimator>
  );
}
