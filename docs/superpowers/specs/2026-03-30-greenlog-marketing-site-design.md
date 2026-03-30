# GreenLog Marketing-Site Design

**Date:** 2026-03-30
**Status:** Draft – awaiting approval

---

## Concept & Vision

Eine hochwertige, animierte Marketing-Site für GreenLog – eine B2B-mandantenfähige Plattform für Clubs und Apotheken zur Verwaltung von Cannabis-Sorten und -Communities.

Die Site vermittelt Professionalität und moderne Cannabis-Kultur durch eine **Neon-Ästhetik mit Smooth Motion**. Sie spricht sowohl B2B-Entscheider (Clubs, Apotheken) als auch B2C-Nutzer (Patienten, Enthusiasten) an.

---

## Design Language

### Aesthetic Direction
**Hybrid: Cyberpunk/Neon + Clean Motion**
- Bestehendes Brand: Glow-Effekte, blur-Backgrounds, Neon-Farben (#00F5FF cyan, #2FF801 green)
- Motion: Smooth scroll-triggered animations, fade-ins, scale-transitions
- Keine aggressiven Glitch-Effekte – subtil und professionell

### Color Palette
```
Primary:      #00F5FF (Cyan neon)
Secondary:    #2FF801 (Green neon)
Accent:       #a1faff (Light cyan)
Background:   --background (dark theme)
Foreground:   --foreground
Border:       --border
Muted:        --muted-foreground
```

### Typography
- **Display:** Font mit heavy weight, italic, uppercase (bestehend)
- **Body:** System sans-serif
- **Scale:** 3xl–6xl für Hero, sm–lg für Body

### Motion Philosophy
- **Hover:** Scale 1.02–1.05, glow intensity increase, 300ms ease
- **Scroll:** Text-reveal via opacity + translateY, staggered 100ms
- **Page elements:** Fade-in on viewport entry via Intersection Observer
- **Strain cards:** Lift + enhanced glow on hover

---

## Layout & Structure

### Page Flow: Hero → Features → Social Proof → CTA

```
┌─────────────────────────────────────┐
│  HERO                               │
│  - Logo + Tagline                   │
│  - Strain of the Day Card (animiert)│
│  - Primary CTA: "Jetzt starten"     │
│  - Ambient neon glow background     │
├─────────────────────────────────────┤
│  FEATURES                           │
│  - 3 Feature-Blocks                 │
│  - Strain-Card Animation on hover   │
│  - Icons + Short Text               │
├─────────────────────────────────────┤
│  SOCIAL PROOF                       │
│  - "470+ Strains"                   │
│  - "X Clubs & Apotheken"           │
│  - Counter-Animation                │
├─────────────────────────────────────┤
│  CTA                                │
│  - Demo-Anfrage Formular            │
│  - Waitlist-Option                 │
└─────────────────────────────────────┘
```

### Responsive Strategy
- Mobile-first
- Single-column auf Mobile, 2–3 Spalten auf Desktop
- Touch-optimierte Hover-Effekte

---

## Features & Interactions

### 1. Hero Section
- **Strain of the Day Card** – animiert mit Glow, rotation on hover
- Ambient background: pulsing neon blobs (blur, opacity animation)
- CTA Button: neon border, glow on hover

### 2. Feature Blocks
- **Feature 1:** Strain-Verwaltung (für Clubs/Apotheken)
- **Feature 2:** Community & Social (Follower, Feed)
- **Feature 3:** Sammlung & Bewertungen
- Jeder Block: Icon + Headline + Description
- Strain-Card Mini-Preview bei Hover

### 3. Social Proof
- Animated counters (count up on scroll-into-view)
- Logos von Partner-Clubs (placeholder falls nicht verfügbar)

### 4. CTA Section
- Email-Input für Waitlist
- "Demo anfragen" Button
- DSGVO-Hinweis

---

## Component Inventory

### StrainCard (Marketing)
- Vereinfachte Version der existierenden StrainCard
- Neon glow border on hover
- Scale 1.03 on hover
- Bild mit gradient overlay
- Name, Type, THC prominent

### FeatureBlock
- Icon (Lucide)
- Headline (h3)
- Description (p)
- Hover: subtle lift

### CounterBlock
- Large number (animated)
- Label below
- Glow accent

### CTAForm
- Email input mit neon border
- Submit button mit glow
- Success/Error state

---

## Technical Approach

### Implementation
- **Route:** `/landing` als separate Page in Next.js App
- **Framework:** Next.js 16 (Pages Router), TypeScript
- **Styling:** Tailwind CSS + bestehende CSS Variables
- **Animations:** CSS transitions + Tailwind animate-* classes
- **Scroll animations:** Intersection Observer API (keine Library)

### KI-Assets (optional, nach Video-Workflow)
- Hero: KI-generiertes Video oder Bild (Kling 3.0 etc.)
- Speichern in `/public/landing/`

### Deployment
- Vercel (wie bestehende App)
- Subdirectory `/landing` oder separate App

---

## Next Steps (Implementation)

1. Create `/src/app/landing/page.tsx`
2. Implement Hero with animated StrainCard
3. Add Feature blocks with hover animations
4. Add Social Proof section with counter animation
5. Add CTA form
6. Deploy and test

---

## Status

**Approved:** ✅ 2026-03-30
**Ready for Implementation:** Yes
