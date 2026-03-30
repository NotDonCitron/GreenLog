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
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
        <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center mb-5">
          <div className="text-green-600">{icon}</div>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {title}
        </h3>
        <p className="text-gray-600 leading-relaxed">
          {description}
        </p>
      </div>
    </ScrollAnimator>
  );
}
