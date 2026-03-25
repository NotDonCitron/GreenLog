"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
    ChevronRight, 
    ChevronLeft, 
    Sparkles, 
    Users, 
    Globe, 
    User as UserIcon, 
    Camera,
    CheckCircle2,
    BookMarked
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
        description: "Dein digitaler Begleiter für alles rund um Cannabis. Entdecke, tracke und teile deine Erfahrungen mit der Community.",
        icon: <Sparkles size={48} />,
        color: "#00F5FF",
        path: "/"
    },
    {
        title: "Social & Community",
        description: "Hier siehst du, was deine Freunde gerade rauchen oder anbauen. Entdecke neue Profile und folge interessanten Nutzern.",
        icon: <Users size={48} />,
        color: "#2FF801",
        path: "/discover"
    },
    {
        title: "World Collection",
        description: "Durchsuche unsere globale Datenbank nach hunderten von Sorten. Finde Details zu THC, Terpenen und Wirkungen.",
        icon: <Globe size={48} />,
        color: "#fbbf24",
        path: "/strains"
    },
    {
        title: "Deine Sammlung",
        description: "Hier verwaltest du deine persönlichen Bestände. Füge Notizen, Chargen-Nummern und eigene Bilder zu deinen Sorten hinzu.",
        icon: <BookMarked size={48} />,
        color: "#A3E4D7",
        path: "/collection"
    },
    {
        title: "Dein Profil & Badges",
        description: "Checke deine Stats und Achievements. Hier kannst du dein Profil personalisieren und deine Fortschritte sehen.",
        icon: <UserIcon size={48} />,
        color: "#2FF801",
        path: "/profile"
    },
    {
        title: "Schneller Scanner",
        description: "Nutze den Kamera-Scanner, um Etiketten sofort zu digitalisieren. Einfacher geht es nicht!",
        icon: <Camera size={48} />,
        color: "#00F5FF",
        path: "/scanner"
    }
];

export function OnboardingGuide() {
    const { user, isDemoMode } = useAuth();
    const router = useRouter();
    
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [isSaving, setIsLoading] = useState(false);

    useEffect(() => {
        console.log("[Onboarding] Component mounted.");
    }, []);

    useEffect(() => {
        async function checkOnboarding() {
            // Check local storage first for immediate fallback
            if (typeof window !== "undefined") {
                const localStatus = localStorage.getItem("cannalog_onboarding_completed");
                if (localStatus === "true") {
                    console.log("[Onboarding] Found completed status in localStorage.");
                    return;
                }
            }

            // In Demo mode, always show onboarding if not explicitly dismissed in session
            if (isDemoMode) {
                console.log("[Onboarding] Demo mode detected");
                const dismissed = sessionStorage.getItem("cannalog_onboarding_dismissed");
                if (!dismissed) {
                    setIsVisible(true);
                }
                return;
            }

            if (!user) {
                console.log("[Onboarding] No user session found");
                return;
            }

            console.log("[Onboarding] Checking profile for user:", user.id);
            try {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("has_completed_onboarding")
                    .eq("id", user.id)
                    .single();

                if (error) {
                    console.warn("[Onboarding] Database check failed (likely schema cache). Falling back to first-time show.", error);
                    setIsVisible(true);
                    return;
                }

                console.log("[Onboarding] Data found:", data);
                // Show if value is NOT explicitly true
                if (data?.has_completed_onboarding !== true) {
                    console.log("[Onboarding] Showing guide...");
                    setIsVisible(true);
                } else {
                    // Sync local storage if DB says it's completed
                    localStorage.setItem("cannalog_onboarding_completed", "true");
                    console.log("[Onboarding] User already completed onboarding according to DB.");
                }
            } catch (err) {
                console.error("[Onboarding] Unexpected error during check:", err);
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
            console.log("[Onboarding] Dismissing in Demo Mode");
            sessionStorage.setItem("cannalog_onboarding_dismissed", "true");
            setIsVisible(false);
            router.push("/");
            return;
        }

        if (!user) return;
        setIsLoading(true);
        console.log("[Onboarding] Saving completion status to DB...");

        try {
            const { error } = await supabase
                .from("profiles")
                .update({ has_completed_onboarding: true })
                .eq("id", user.id);

            if (error) {
                console.error("[Onboarding] Error saving status to DB (Schema might still be updating):", error);
            } else {
                console.log("[Onboarding] Successfully saved status to DB.");
            }
            
            // Always close UI if we reached this point
            setIsVisible(false);
            router.push("/");
        } catch (err) {
            console.error("[Onboarding] Failed to complete onboarding:", err);
            setIsVisible(false);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isVisible) return null;

    const step = ONBOARDING_STEPS[currentStep];
    // Determine if the guide should be at the top or bottom based on the feature being explained
    // Scanner is at bottom -> Guide to Top. Profile/Home header is at top -> Guide to Bottom.
    const isTop = step.path === "/scanner" || step.path === "/profile";

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
                                className="w-12 h-12 rounded-2xl bg-white/5 flex-shrink-0 flex items-center justify-center border border-white/10 shadow-inner"
                                style={{ color: step.color }}
                            >
                                {step.icon}
                            </div>
                            
                            <div className="flex-1 min-w-0 pt-1">
                                <h2 className="text-sm font-black italic tracking-tighter uppercase text-white mb-1">
                                    {step.title}
                                </h2>
                                <p className="text-white/50 text-[11px] leading-snug line-clamp-3">
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
                                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-colors"
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
                            className="w-full mt-4 text-[8px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white/40 transition-colors text-center"
                        >
                            Überspringen
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
