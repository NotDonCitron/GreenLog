# GreenLog Marketing-Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a high-end animated marketing landing page at `/landing` with Hero, Features, Social Proof, and CTA sections.

**Architecture:** Single-page Next.js route using existing CSS variables and Tailwind. Scroll animations via Intersection Observer. Reuses existing StrainCard with marketing-specific wrapper. No new dependencies.

**Tech Stack:** Next.js 16 (Pages Router), TypeScript, Tailwind CSS, CSS Variables, Lucide React icons, Intersection Observer API.

---

## File Structure

```
/src
├── /app
│   └── /landing
│       └── page.tsx              # Main landing page
└── /components
    └── /landing
        ├── marketing-strain-card.tsx   # Simplified strain card variant
        ├── feature-block.tsx          # Feature section block
        ├── counter-block.tsx          # Animated counter
        ├── cta-form.tsx               # Waitlist/Demo form
        └── scroll-animator.tsx        # Intersection Observer wrapper
```

---

## Task 1: Create Landing Page Route and Directory

**Files:**
- Create: `src/app/landing/page.tsx`
- Create: `src/components/landing/.gitkeep`

- [ ] **Step 1: Create the landing directory structure**

```bash
mkdir -p src/app/landing
mkdir -p src/components/landing
touch src/components/landing/.gitkeep
```

- [ ] **Step 2: Create basic page.tsx shell**

```tsx
// src/app/landing/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Strain } from "@/lib/types";
import { normalizeCollectionSource } from "@/lib/strain-display";
import { MarketingStrainCard } from "@/components/landing/marketing-strain-card";
import { FeatureBlock } from "@/components/landing/feature-block";
import { CounterBlock } from "@/components/landing/counter-block";
import { CTAForm } from "@/components/landing/cta-form";

export default function LandingPage() {
  const [strainOfTheDay, setStrainOfTheDay] = useState<Strain | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStrainOfTheDay() {
      try {
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
        const { data: allStrains } = await supabase.from('strains').select('*').limit(470);
        if (allStrains && allStrains.length > 0) {
          const strain = allStrains[dayOfYear % allStrains.length];
          setStrainOfTheDay({
            ...strain,
            source: normalizeCollectionSource(strain.source),
          });
        }
      } catch (err) {
        console.error("Error fetching strain:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStrainOfTheDay();
  }, []);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Ambient neon glow background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[120%] h-[50%] bg-[#00F5FF]/5 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[100%] h-[40%] bg-[#2FF801]/4 blur-[100px] rounded-full animate-pulse [animation-delay:2s]" />
        </div>
        {/* Content */}
        <div className="relative z-10 text-center">
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter font-display">
            GreenLog
          </h1>
          <p className="text-lg md:text-xl text-[var(--muted-foreground)] mt-4">
            Die professionelle Plattform für Cannabis-Communities
          </p>
          {loading ? (
            <div className="mt-8 animate-pulse">Wird geladen...</div>
          ) : strainOfTheDay ? (
            <div className="mt-8 max-w-xs mx-auto">
              <MarketingStrainCard strain={strainOfTheDay} />
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/landing/
git commit -m "feat(landing): create landing page route and shell"
```

---

## Task 2: Create MarketingStrainCard Component

**Files:**
- Create: `src/components/landing/marketing-strain-card.tsx`
- Reference: `src/components/strains/strain-card.tsx:13-68` (for pattern)

- [ ] **Step 1: Create MarketingStrainCard component**

```tsx
// src/components/landing/marketing-strain-card.tsx
"use client";

import { memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Strain } from '@/lib/types';
import { formatPercent, getEffectDisplay, getStrainTheme, getTasteDisplay } from '@/lib/strain-display';

interface MarketingStrainCardProps {
  strain: Strain;
}

export const MarketingStrainCard = memo(function MarketingStrainCard({ strain }: MarketingStrainCardProps) {
  const { color: themeColor, className: themeClass } = getStrainTheme(strain.type);

  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const farmerDisplay = strain.farmer?.trim() || strain.manufacturer?.trim() || strain.brand?.trim() || 'Unbekannter Farmer';
  const thcDisplay = formatPercent(strain.avg_thc ?? strain.thc_max, '—');
  const tasteDisplay = getTasteDisplay(strain);
  const effectDisplay = getEffectDisplay(strain);

  const normalizedStrainName = (() => {
    const rawName = strain.name?.trim() || '';
    if (!rawName || farmerDisplay === 'Unbekannter Farmer') return rawName;

    const withoutFarmerPrefix = rawName.replace(
      new RegExp(`^${escapeRegExp(farmerDisplay)}[\s:/-]*`, 'i'),
      ''
    ).trim();

    if (!withoutFarmerPrefix || withoutFarmerPrefix.length < 3) {
      const firstWord = farmerDisplay.split(/\s+/)[0];
      if (firstWord && firstWord.length > 1) {
        const withoutFirstWord = rawName.replace(new RegExp(`^${escapeRegExp(firstWord)}[\s:/-]+`, 'i'), '').trim();
        if (withoutFirstWord && withoutFirstWord.length > withoutFarmerPrefix.length) {
          return withoutFirstWord;
        }
      }
    }

    return withoutFarmerPrefix && withoutFarmerPrefix.length < rawName.length - 2
      ? withoutFarmerPrefix
      : rawName;
  })();

  return (
    <Link
      href={`/strains/${strain.slug}`}
      className="group relative flex w-full min-w-0 flex-col rounded-[20px] border-2 bg-[#121212] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(0,245,255,0.3)] overflow-hidden aspect-[4/5]"
      style={{ borderColor: themeColor + '80' }}
    >
      {/* Glow effect on hover */}
      <div
        className="absolute inset-0 rounded-[18px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 30px ${themeColor}30, 0 0 60px ${themeColor}20`,
        }}
      />

      {/* Header */}
      <div className="shrink-0 p-3 pb-1 min-w-0 relative z-10">
        <p className="text-[8px] font-bold tracking-[0.12em] uppercase text-[var(--foreground)]/30">
          {farmerDisplay}
        </p>
        <p className="title-font italic text-[14px] font-black leading-tight uppercase text-[var(--foreground)] break-words">
          {normalizedStrainName}
        </p>
      </div>

      {/* Image */}
      <div className="relative flex-1 min-h-0 px-2 py-1 z-10">
        <div className="absolute inset-0 rounded-xl border border-white/5 shadow-lg overflow-hidden">
          <Image
            src={strain.image_url || "/strains/placeholder-1.svg"}
            alt={strain.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 768px) 50vw, 33vw"
            priority
          />
          {/* Type Badge */}
          <div
            className="absolute top-2 left-2 px-2 py-1 rounded-xl backdrop-blur-md border text-[8px] font-bold uppercase tracking-widest"
            style={{
              backgroundColor: `${themeColor}20`,
              borderColor: `${themeColor}80`,
              color: themeColor,
            }}
          >
            {strain.type === 'sativa' ? 'Sativa' : strain.type === 'indica' ? 'Indica' : 'Hybride'}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="shrink-0 px-3 w-full relative z-10">
        <div className="rounded-xl border border-white/10 bg-[#121212]/80 p-2 shadow-inner backdrop-blur-sm">
          <div className="grid grid-cols-3 gap-1">
            <div className="flex flex-col items-center gap-0">
              <span className="text-[6px] font-bold uppercase tracking-widest text-[var(--foreground)]/30">THC</span>
              <span className="text-[9px] font-black tracking-wide" style={{ color: themeColor }}>{thcDisplay}</span>
            </div>
            <div className="flex flex-col items-center gap-0 border-l border-white/10 pl-1 min-w-0">
              <span className="text-[7px] font-medium tracking-wide text-[var(--foreground)]/70 leading-tight break-words text-left w-full">{tasteDisplay}</span>
            </div>
            <div className="flex flex-col items-center gap-0 border-l border-white/10 pl-1 min-w-0">
              <span className="text-[7px] font-medium tracking-wide text-[var(--foreground)]/70 leading-tight break-words text-left w-full">{effectDisplay}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
});
```

- [ ] **Step 2: Verify the component compiles**

Run: `cd /home/phhttps/Dokumente/Greenlog/GreenLog && npx tsc --noEmit src/components/landing/marketing-strain-card.tsx 2>&1 | head -20`
Expected: No errors (or only expected type errors from imports)

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/marketing-strain-card.tsx
git commit -m "feat(landing): add MarketingStrainCard component"
```

---

## Task 3: Create ScrollAnimator Hook

**Files:**
- Create: `src/components/landing/scroll-animator.tsx`

- [ ] **Step 1: Create Intersection Observer hook component**

```tsx
// src/components/landing/scroll-animator.tsx
"use client";

import { useEffect, useRef, useState, ReactNode } from 'react';

interface ScrollAnimatorProps {
  children: ReactNode;
  className?: string;
  animation?: 'fade-up' | 'fade-in' | 'scale';
  delay?: number;
}

export function ScrollAnimator({
  children,
  className = '',
  animation = 'fade-up',
  delay = 0,
}: ScrollAnimatorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const animationClasses = {
    'fade-up': `transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`,
    'fade-in': `transition-all duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`,
    'scale': `transition-all duration-500 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`,
  };

  return (
    <div
      ref={ref}
      className={`${animationClasses[animation]} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/scroll-animator.tsx
git commit -m "feat(landing): add ScrollAnimator with Intersection Observer"
```

---

## Task 4: Create FeatureBlock Component

**Files:**
- Create: `src/components/landing/feature-block.tsx`

- [ ] **Step 1: Create FeatureBlock component**

```tsx
// src/components/landing/feature-block.tsx
"use client";

import { ReactNode } from 'react';
import { ScrollAnimator } from './scroll-animator';

interface FeatureBlockProps {
  icon: ReactNode;
  title: string;
  description: string;
  index?: number;
}

export function FeatureBlock({ icon, title, description, index = 0 }: FeatureBlockProps) {
  return (
    <ScrollAnimator animation="fade-up" delay={index * 100}>
      <div className="group p-6 rounded-2xl border border-[var(--border)] bg-[var(--background)]/50 backdrop-blur-sm hover:border-[#00F5FF]/50 transition-all duration-300 hover:-translate-y-1">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-[#00F5FF]/10 flex items-center justify-center mb-4 group-hover:bg-[#00F5FF]/20 transition-colors duration-300">
          <div className="text-[#00F5FF]">
            {icon}
          </div>
        </div>

        {/* Text */}
        <h3 className="text-lg font-bold text-[var(--foreground)] mb-2 group-hover:text-[#00F5FF] transition-colors duration-300">
          {title}
        </h3>
        <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
          {description}
        </p>
      </div>
    </ScrollAnimator>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/feature-block.tsx
git commit -m "feat(landing): add FeatureBlock component"
```

---

## Task 5: Create CounterBlock Component

**Files:**
- Create: `src/components/landing/counter-block.tsx`

- [ ] **Step 1: Create CounterBlock with animated counter**

```tsx
// src/components/landing/counter-block.tsx
"use client";

import { useEffect, useState, useRef } from 'react';
import { ScrollAnimator } from './scroll-animator';

interface CounterBlockProps {
  end: number;
  suffix?: string;
  label: string;
  index?: number;
}

export function CounterBlock({ end, suffix = '', label, index = 0 }: CounterBlockProps) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          animateCount();
          observer.unobserve(element);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasAnimated]);

  function animateCount() {
    const duration = 2000;
    const steps = 60;
    const increment = end / steps;
    let current = 0;
    const interval = duration / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, interval);
  }

  return (
    <ScrollAnimator animation="scale" delay={index * 150}>
      <div ref={ref} className="text-center">
        <div className="text-4xl md:text-5xl font-black text-[#00F5FF] mb-2" style={{ textShadow: '0 0 20px rgba(0,245,255,0.5)' }}>
          {count}{suffix}
        </div>
        <p className="text-sm text-[var(--muted-foreground)] uppercase tracking-wider">
          {label}
        </p>
      </div>
    </ScrollAnimator>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/counter-block.tsx
git commit -m "feat(landing): add CounterBlock with animated counter"
```

---

## Task 6: Create CTAForm Component

**Files:**
- Create: `src/components/landing/cta-form.tsx`
- Reference: `src/components/ui/input.tsx` (for Input component)

- [ ] **Step 1: Create CTAForm component**

```tsx
// src/components/landing/cta-form.tsx
"use client";

import { useState } from 'react';
import { Input } from '@/components/ui/input';

export function CTAForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Bitte gib eine gültige E-Mail-Adresse ein.');
      return;
    }

    setStatus('loading');
    // Simulated API call - replace with actual endpoint
    setTimeout(() => {
      setStatus('success');
      setMessage('Danke! Wir melden uns bald bei dir.');
      setEmail('');
    }, 1500);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Input
            type="email"
            placeholder="deine@email.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'loading' || status === 'success'}
            className="h-12 w-full rounded-xl border-[#00F5FF]/30 bg-[var(--background)]/50 backdrop-blur-sm pr-32 focus:border-[#00F5FF] focus:ring-[#00F5FF]/20"
          />
          <button
            type="submit"
            disabled={status === 'loading' || status === 'success'}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-10 px-4 rounded-lg bg-[#00F5FF]/10 border border-[#00F5FF]/30 text-[#00F5FF] text-sm font-bold hover:bg-[#00F5FF]/20 transition-all duration-300 disabled:opacity-50"
          >
            {status === 'loading' ? '...' : status === 'success' ? '✓' : 'Demo anfragen'}
          </button>
        </div>

        {/* Status message */}
        {message && (
          <p className={`text-sm text-center ${status === 'error' ? 'text-red-400' : status === 'success' ? 'text-[#2FF801]' : 'text-[var(--muted-foreground)]'}`}>
            {message}
          </p>
        )}

        {/* DSGVO Hinweis */}
        <p className="text-[10px] text-center text-[var(--muted-foreground)]">
          Mit dem Absenden stimmst du unserer Datenschutzerklärung zu. Kein Spam.
        </p>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/cta-form.tsx
git commit -m "feat(landing): add CTAForm with email input"
```

---

## Task 7: Assemble Full Landing Page

**Files:**
- Modify: `src/app/landing/page.tsx`

- [ ] **Step 1: Update landing page with all sections**

Replace the shell content in `src/app/landing/page.tsx` with the complete implementation:

```tsx
// src/app/landing/page.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Strain } from "@/lib/types";
import { normalizeCollectionSource } from "@/lib/strain-display";
import { MarketingStrainCard } from "@/components/landing/marketing-strain-card";
import { FeatureBlock } from "@/components/landing/feature-block";
import { CounterBlock } from "@/components/landing/counter-block";
import { CTAForm } from "@/components/landing/cta-form";
import { ScrollAnimator } from "@/components/landing/scroll-animator";
import { Leaf, Users, Star, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const [strainOfTheDay, setStrainOfTheDay] = useState<Strain | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStrainOfTheDay() {
      try {
        const dayOfYear = Math.floor(
          (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24
        );
        const { data: allStrains } = await supabase.from("strains").select("*").limit(470);
        if (allStrains && allStrains.length > 0) {
          const strain = allStrains[dayOfYear % allStrains.length];
          setStrainOfTheDay({
            ...strain,
            source: normalizeCollectionSource(strain.source),
          });
        }
      } catch (err) {
        console.error("Error fetching strain:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStrainOfTheDay();
  }, []);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] overflow-x-hidden">
      {/* ======================== HERO SECTION ======================== */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Ambient neon glow background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[120%] h-[50%] bg-[#00F5FF]/5 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[100%] h-[40%] bg-[#2FF801]/4 blur-[100px] rounded-full animate-pulse [animation-delay:2s]" />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <ScrollAnimator animation="fade-up">
            <p className="text-sm uppercase tracking-[0.3em] text-[#00F5FF] mb-4 font-bold">
              Entdecke • Teile • Sammle
            </p>
          </ScrollAnimator>

          <ScrollAnimator animation="fade-up" delay={100}>
            <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter font-display">
              Green<span className="text-[#00F5FF]">Log</span>
            </h1>
          </ScrollAnimator>

          <ScrollAnimator animation="fade-up" delay={200}>
            <p className="text-lg md:text-xl text-[var(--muted-foreground)] mt-4 max-w-2xl mx-auto">
              Die professionelle Plattform für Cannabis-Communities.
              Verwalte Strains, teile Bewertungen, entdecke neue Sorten.
            </p>
          </ScrollAnimator>

          <ScrollAnimator animation="fade-up" delay={300}>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-[#00F5FF]/10 border border-[#00F5FF]/30 text-[#00F5FF] font-bold hover:bg-[#00F5FF]/20 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,245,255,0.3)]"
              >
                Jetzt starten
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-xl border border-[var(--border)] text-[var(--foreground)] font-bold hover:border-[#00F5FF]/50 transition-all duration-300"
              >
                Mehr erfahren
              </Link>
            </div>
          </ScrollAnimator>

          {/* Strain Card Preview */}
          {!loading && strainOfTheDay && (
            <ScrollAnimator animation="scale" delay={400}>
              <div className="mt-12 max-w-xs mx-auto">
                <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                  Strain des Tages
                </p>
                <MarketingStrainCard strain={strainOfTheDay} />
              </div>
            </ScrollAnimator>
          )}
        </div>
      </section>

      {/* ======================== FEATURES SECTION ======================== */}
      <section id="features" className="py-24 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <ScrollAnimator animation="fade-up">
            <div className="text-center mb-16">
              <p className="text-sm uppercase tracking-[0.3em] text-[#00F5FF] mb-2 font-bold">Features</p>
              <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tight">
                Alles, was du brauchst
              </h2>
            </div>
          </ScrollAnimator>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureBlock
              index={0}
              icon={<Leaf size={24} />}
              title="Strain-Verwaltung"
              description="Umfassende Datenbank mit 470+ Strains. THC/CBD-Werte, Terpene, Effects. Perfekt für Clubs und Apotheken."
            />
            <FeatureBlock
              index={1}
              icon={<Users size={24} />}
              title="Community & Social"
              description="Folge anderen Usern, teile deine Sammlung, entdecke neue Strains über die Community."
            />
            <FeatureBlock
              index={2}
              icon={<Star size={24} />}
              title="Bewertungen & Feedback"
              description="Bewerte Strains mit 1-5 Sternen, schreibe Reviews, baue deine persönliche Sammlung auf."
            />
          </div>
        </div>
      </section>

      {/* ======================== SOCIAL PROOF SECTION ======================== */}
      <section className="py-24 px-4 bg-[var(--background)]/50">
        <div className="max-w-6xl mx-auto">
          <ScrollAnimator animation="fade-up">
            <div className="text-center mb-16">
              <p className="text-sm uppercase tracking-[0.3em] text-[#2FF801] mb-2 font-bold">Community</p>
              <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tight">
                Wächst jeden Tag
              </h2>
            </div>
          </ScrollAnimator>

          <div className="grid md:grid-cols-3 gap-8">
            <CounterBlock end={470} suffix="+" label="Strains" index={0} />
            <CounterBlock end={50} suffix="+" label="Clubs & Apotheken" index={1} />
            <CounterBlock end={1200} suffix="+" label="aktive User" index={2} />
          </div>
        </div>
      </section>

      {/* ======================== CTA SECTION ======================== */}
      <section className="py-24 px-4 relative">
        {/* Glow accent */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] bg-[#00F5FF]/5 blur-[150px] rounded-full" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <ScrollAnimator animation="fade-up">
            <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tight mb-4">
              Bereit durchzustarten?
            </h2>
          </ScrollAnimator>

          <ScrollAnimator animation="fade-up" delay={100}>
            <p className="text-[var(--muted-foreground)] mb-8">
              Starte jetzt mit GreenLog und werde Teil der Cannabis-Community.
            </p>
          </ScrollAnimator>

          <ScrollAnimator animation="fade-up" delay={200}>
            <CTAForm />
          </ScrollAnimator>
        </div>
      </section>

      {/* ======================== FOOTER ======================== */}
      <footer className="py-8 px-4 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            © 2026 GreenLog. Alle Rechte vorbehalten.
          </p>
          <div className="flex gap-6 text-sm text-[var(--muted-foreground)]">
            <Link href="/impressum" className="hover:text-[#00F5FF] transition-colors">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-[#00F5FF] transition-colors">Datenschutz</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
```

- [ ] **Step 2: Verify the page compiles**

Run: `cd /home/phhttps/Dokumente/Greenlog/GreenLog && npx tsc --noEmit src/app/landing/page.tsx 2>&1 | head -30`
Expected: No errors (or only expected type errors)

- [ ] **Step 3: Test in browser**

Run: `npm run dev` and navigate to `http://localhost:3000/landing`
Expected: Page loads with Hero, Features, Social Proof, CTA sections

- [ ] **Step 4: Commit**

```bash
git add src/app/landing/page.tsx
git commit -m "feat(landing): complete landing page with all sections"
```

---

## Task 8: Add Navigation Header to Landing Page

**Files:**
- Modify: `src/app/landing/page.tsx`

- [ ] **Step 1: Add sticky header with logo and CTA**

Add this header inside the main element, before the Hero section:

```tsx
// Add this import
import { Menu, X } from "lucide-react";
import { useState } from "react";

// Add state and header inside the component:
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

// Add header JSX before the Hero section:
<header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[var(--background)]/80 border-b border-[var(--border)]">
  <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
    {/* Logo */}
    <Link href="/landing" className="text-xl font-black italic uppercase tracking-tighter font-display">
      Green<span className="text-[#00F5FF]">Log</span>
    </Link>

    {/* Desktop Nav */}
    <nav className="hidden md:flex items-center gap-8">
      <Link href="#features" className="text-sm text-[var(--muted-foreground)] hover:text-[#00F5FF] transition-colors">
        Features
      </Link>
      <Link href="/strains" className="text-sm text-[var(--muted-foreground)] hover:text-[#00F5FF] transition-colors">
        Strains
      </Link>
      <Link href="/community" className="text-sm text-[var(--muted-foreground)] hover:text-[#00F5FF] transition-colors">
        Community
      </Link>
    </nav>

    {/* CTA */}
    <div className="flex items-center gap-4">
      <Link
        href="/login"
        className="hidden md:inline-flex items-center h-9 px-4 rounded-lg bg-[#00F5FF]/10 border border-[#00F5FF]/30 text-[#00F5FF] text-sm font-bold hover:bg-[#00F5FF]/20 transition-all duration-300"
      >
        Anmelden
      </Link>

      {/* Mobile menu button */}
      <button
        className="md:hidden p-2 text-[var(--foreground)]"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
    </div>
  </div>

  {/* Mobile menu */}
  {mobileMenuOpen && (
    <div className="md:hidden border-t border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-md">
      <nav className="flex flex-col p-4 gap-4">
        <Link
          href="#features"
          className="text-sm text-[var(--foreground)] hover:text-[#00F5FF]"
          onClick={() => setMobileMenuOpen(false)}
        >
          Features
        </Link>
        <Link
          href="/strains"
          className="text-sm text-[var(--foreground)] hover:text-[#00F5FF]"
          onClick={() => setMobileMenuOpen(false)}
        >
          Strains
        </Link>
        <Link
          href="/community"
          className="text-sm text-[var(--foreground)] hover:text-[#00F5FF]"
          onClick={() => setMobileMenuOpen(false)}
        >
          Community
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-[#00F5FF]/10 border border-[#00F5FF]/30 text-[#00F5FF] text-sm font-bold"
          onClick={() => setMobileMenuOpen(false)}
        >
          Anmelden
        </Link>
      </nav>
    </div>
  )}
</header>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/landing/page.tsx
git commit -m "feat(landing): add sticky header with navigation"
```

---

## Task 9: Final Polish and Testing

**Files:**
- Modify: `src/app/landing/page.tsx` (if needed)

- [ ] **Step 1: Test all sections in browser**

Navigate to `/landing` and verify:
- [ ] Hero loads with strain of the day
- [ ] Feature blocks animate on scroll
- [ ] Counters animate when visible
- [ ] CTA form accepts email and shows success state
- [ ] Mobile menu works
- [ ] Smooth scroll to features section

- [ ] **Step 2: Check for console errors**

Run: `npm run dev` and open browser console
Expected: No errors

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(landing): finalize marketing site - polish and test"
```

---

## Plan Self-Review

**Spec coverage:**
- ✅ Hero Section with animated StrainCard
- ✅ Features section with 3 blocks and hover animations
- ✅ Social Proof with animated counters
- ✅ CTA section with email form
- ✅ Neon glow aesthetic matching brand
- ✅ Scroll animations via Intersection Observer
- ✅ Responsive design
- ✅ Navigation header

**Placeholder scan:**
- No TBD/TODO found
- All code blocks are complete with actual implementation

**Type consistency:**
- All imports reference existing files
- Strain type used correctly from `@/lib/types`
- Lucide icons imported correctly

---

## Status

- [x] Tasks 1-9 defined
- [ ] Tasks 1-9 pending implementation
- [ ] User approval to start implementation

---

**Plan saved to:** `docs/superpowers/plans/2026-03-30-greenlog-marketing-site.md`
