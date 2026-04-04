"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import {
    ChevronRight,
    ChevronLeft,
    Sparkles,
    Users,
    Globe,
    User as UserIcon,
    Camera,
    BookMarked,
    Scale,
    Building
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";

interface Step {
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    path: string;
}

const ONBOARDING_STEPS: Step[] = [
    {
        title: "Willkommen bei CannaLog",
        description: "Dein digitaler Begleiter für Cannabis-Sorten. Entdecke unsere Sortenvielfalt, tracke deine Favoriten und teile Erfahrungen.",
        icon: <div className="relative w-full h-full p-2"><Image src="/logo.png" alt="Logo" fill className="object-contain" priority /></div>,
        color: "#00F5FF",
        path: "/"
    },
    {
        title: "Sorten entdecken & vergleichen",
        description: "Durchsuche die Datenbank mit Filtern, vergleiche Sorten im Side-by-Side-Modus und füge Favoriten per Rechtsklick hinzu.",
        icon: <Globe size={48} />,
        color: "#fbbf24",
        path: "/strains"
    },
    {
        title: "Deine Sammlung & Scanner",
        description: "Speichere deine Sorten mit Notizen und Batch-Info. Der Label-Scanner digitalisiert Etiketten per Kamera.",
        icon: <BookMarked size={48} />,
        color: "#A3E4D7",
        path: "/collection"
    },
    {
        title: "Community & Social",
        description: "Folge anderen Nutzern, entdecke neue Sorten durch die Community und tritt Clubs oder Apotheken bei.",
        icon: <Users size={48} />,
        color: "#2FF801",
        path: "/discover"
    },
    {
        title: "Profil & Badges",
        description: "Personalisiere dein Profil, behalte deine Statistiken im Blick und schalte exklusive Abzeichen frei.",
        icon: <UserIcon size={48} />,
        color: "#2FF801",
        path: "/profile"
    }
];

export function OnboardingGuide() {
    const { user, isDemoMode } = useAuth();
    const router = useRouter();

    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [isSaving, setIsLoading] = useState(false);
    const [motionComponents, setMotionComponents] = useState<{
        motion: typeof import("framer-motion").motion;
        AnimatePresence: typeof import("framer-motion").AnimatePresence;
    } | null>(null);

    useEffect(() => {
        if (isVisible && !motionComponents) {
            import("framer-motion").then((mod) => {
                setMotionComponents({ motion: mod.motion, AnimatePresence: mod.AnimatePresence });
            });
        }
    }, [isVisible, motionComponents]);

    useEffect(() => {
    }, []);

    useEffect(() => {
        async function checkOnboarding() {
            // Check local storage first for immediate fallback
            if (typeof window !== "undefined") {
                const localStatus = localStorage.getItem("cannalog_onboarding_completed");
                if (localStatus === "true") {
                    return;
                }
            }

            // In Demo mode, always show onboarding if not explicitly dismissed in session
            if (isDemoMode) {
                const dismissed = sessionStorage.getItem("cannalog_onboarding_dismissed");
                if (!dismissed) {
                    setIsVisible(true);
                }
                return;
            }

            if (!user) {
                return;
            }

            try {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("has_completed_onboarding")
                    .eq("id", user.id)
                    .single();

                if (error) {
                    setIsVisible(true);
                    return;
                }

                // Show if value is NOT explicitly true
                if (data?.has_completed_onboarding !== true) {
                    setIsVisible(true);
                } else {
                    // Sync local storage if DB says it's completed
                    localStorage.setItem("cannalog_onboarding_completed", "true");
                }
            } catch (err) {
                setIsVisible(true);
            }
        }

        checkOnboarding();
    }, [user, isDemoMode]);

    const handleNext = () => {
        const nextIndex = currentStep + 1;
        if (nextIndex < ONBOARDING_STEPS.length) {
            setCurrentStep(nextIndex);
            router.push(ONBOARDING_STEPS[nextIndex].path);
        } else {
            void completeOnboarding();
        }
    };

    const handleBack = () => {
        const prevIndex = currentStep - 1;
        if (prevIndex >= 0) {
            setCurrentStep(prevIndex);
            router.push(ONBOARDING_STEPS[prevIndex].path);
        }
    };

    const completeOnboarding = async () => {
        // Save to local storage immediately (Optimistic UI)
        if (typeof window !== "undefined") {
            localStorage.setItem("cannalog_onboarding_completed", "true");
        }
        
        if (isDemoMode) {
            sessionStorage.setItem("cannalog_onboarding_dismissed", "true");
            setIsVisible(false);
            router.push("/");
            return;
        }

        if (!user) return;
        setIsLoading(true);

        try {
            const { error } = await supabase
                .from("profiles")
                .update({ has_completed_onboarding: true })
                .eq("id", user.id);

            if (error) {
            } else {
            }
            
            // Always close UI if we reached this point
            setIsVisible(false);
            router.push("/");
        } catch (err) {
            setIsVisible(false);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isVisible) return null;
    if (!motionComponents) {
        return (
            <div className="fixed left-0 right-0 z-[9999] flex justify-center px-6 bottom-28">
                <div className="w-full max-w-sm h-48 bg-[#121212]/95 border-2 border-[#2FF801]/30 rounded-[2rem] animate-pulse" />
            </div>
        );
    }

    const { motion, AnimatePresence } = motionComponents;
    const step = ONBOARDING_STEPS[currentStep];
    // Position ONLY at top for the scanner, everywhere else bottom is better to see headers/stats
    const isTop = step.path === "/scanner";

    return (
        <AnimatePresence>
            <div className={`fixed left-0 right-0 z-[9999] pointer-events-none flex justify-center px-6 ${isTop ? "top-10" : "bottom-28"}`}>
                {/* Compact Floating Card */}
                <motion.div
                    initial={{ opacity: 0, y: isTop ? -20 : 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: isTop ? -20 : 20, scale: 0.95 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    className="relative w-full max-w-sm bg-[#121212]/95 border-2 border-[#2FF801]/30 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl pointer-events-auto overflow-hidden"
                >
                    {/* Glowing Accent */}
                    <div 
                        className="absolute top-0 left-0 w-full h-1 opacity-50" 
                        style={{ background: `linear-gradient(90deg, transparent, ${step.color}, transparent)` }} 
                    />

                    <div className="p-6">
                        <div className="flex items-start gap-4">
                            <div 
                                className="relative w-12 h-12 rounded-2xl bg-white/5 flex-shrink-0 flex items-center justify-center border border-white/10 shadow-inner overflow-hidden"
                                style={{ color: step.color }}
                            >
                                {step.icon}
                            </div>
                            
                            <div className="flex-1 min-w-0 pt-1">
                                <h2 className="text-sm font-black italic tracking-tighter uppercase text-[var(--foreground)] mb-1">
                                    {step.title}
                                </h2>
                                <p className="text-[var(--foreground)]/50 text-[11px] leading-snug">
                                    {step.description}
                                </p>
                            </div>
                        </div>

                        {/* Navigation Footer */}
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                            <div className="flex gap-1">
                                {ONBOARDING_STEPS.map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={`h-1 rounded-full transition-all duration-500 ${i === currentStep ? "w-4 bg-[#2FF801]" : "w-1 bg-white/10"}`}
                                    />
                                ))}
                            </div>

                            <div className="flex gap-2">
                                {currentStep > 0 && (
                                    <button
                                        onClick={handleBack}
                                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-[var(--foreground)] flex items-center justify-center hover:bg-white/10 transition-colors"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                )}
                                
                                <button
                                    onClick={handleNext}
                                    disabled={isSaving}
                                    className={`h-10 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95 ${
                                        currentStep === ONBOARDING_STEPS.length - 1 
                                        ? "bg-[#2FF801] text-black" 
                                        : "bg-white text-black"
                                    }`}
                                >
                                    {currentStep === ONBOARDING_STEPS.length - 1 ? "Starten" : "Weiter"}
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>

                        <button 
                            onClick={completeOnboarding}
                            className="w-full mt-4 text-[8px] font-black uppercase tracking-[0.2em] text-[var(--foreground)]/20 hover:text-[var(--foreground)]/40 transition-colors text-center"
                        >
                            Überspringen
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
