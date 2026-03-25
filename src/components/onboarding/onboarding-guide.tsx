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

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 sm:p-4 overflow-hidden">
                {/* Backdrop */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />

                {/* Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#121212] border border-white/10 rounded-[2.5rem] shadow-2xl no-scrollbar"
                >
                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 flex gap-1 px-6 pt-6">
                        {ONBOARDING_STEPS.map((_, i) => (
                            <div 
                                key={i} 
                                className={`h-full flex-1 rounded-full transition-all duration-500 ${i <= currentStep ? "bg-[#2FF801]" : "bg-white/10"}`}
                            />
                        ))}
                    </div>

                    {/* Content */}
                    <div className="p-8 pt-12 flex flex-col items-center text-center">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col items-center"
                        >
                            <div 
                                className="w-24 h-24 rounded-3xl bg-white/5 flex items-center justify-center mb-8 border border-white/10 shadow-inner"
                                style={{ color: step.color }}
                            >
                                {step.icon}
                            </div>

                            <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white mb-4">
                                {step.title}
                            </h2>
                            
                            <p className="text-white/60 text-sm leading-relaxed mb-10 max-w-xs">
                                {step.description}
                            </p>
                        </motion.div>

                        {/* Navigation */}
                        <div className="flex w-full gap-3">
                            {currentStep > 0 && (
                                <button
                                    onClick={handleBack}
                                    className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                                >
                                    <ChevronLeft size={18} />
                                    Zurück
                                </button>
                            )}
                            
                            <button
                                onClick={handleNext}
                                disabled={isSaving}
                                className={`flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
                                    currentStep === ONBOARDING_STEPS.length - 1 
                                    ? "bg-[#2FF801] text-black hover:bg-[#2FF801]/90" 
                                    : "bg-white text-black hover:bg-white/90"
                                }`}
                            >
                                {currentStep === ONBOARDING_STEPS.length - 1 ? (
                                    <>
                                        Los geht&apos;s
                                        <CheckCircle2 size={18} />
                                    </>
                                ) : (
                                    <>
                                        Weiter
                                        <ChevronRight size={18} />
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Skip */}
                        <button 
                            onClick={completeOnboarding}
                            className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white/40 transition-colors"
                        >
                            Tutorial überspringen
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
