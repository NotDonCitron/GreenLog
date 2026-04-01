"use client";

import dynamic from 'next/dynamic';

const OnboardingGuide = dynamic(
  () => import('./onboarding-guide').then(m => m.OnboardingGuide),
  { ssr: false }
);

export default OnboardingGuide;
