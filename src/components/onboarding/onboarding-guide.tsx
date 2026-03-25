"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    X, 
    ChevronRight, 
    ChevronLeft, 
    Sparkles, 
    Users, 
    Globe, 
    User as UserIcon, 
    Camera,
    CheckCircle2
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";

interface Step {
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
}

const ONBOARDING_STEPS: Step[] = [
    {
        title: "Willkommen bei CannaLog",
        description: "Dein digitaler Begleiter für alles rund um Cannabis. Entdecke, tracke und teile deine Erfahrungen mit der Community.",
        icon: <Sparkles size={48} />,
        color: "#00F5FF"
    },
    {
        title: "Social & Sammlungen",
        description: "Besuche Profile anderer Nutzer, um deren Sammlungen zu entdecken. Du kannst anderen folgen, um ihre neuesten Aktivitäten zu sehen.",
        icon: <Users size={48} />,
        color: "#2FF801"
    },
    {
        title: "World Collection",
        description: "Durchsuche unsere globale Datenbank nach Sorten. Füge sie deiner eigenen Sammlung hinzu und vervollständige dein digitales Sticker-Album.",
        icon: <Globe size={48} />,
        color: "#fbbf24"
    },
    {
        title: "Dein Profil & Stats",
        description: "Behalte deine Statistiken im Blick. Sammle Ratings, schalte Badges frei und präsentiere deine Expertise in deiner neuen Stats-Bar.",
        icon: <UserIcon size={48} />,
        color: "#A3E4D7"
    },
    {
        title: "Schneller Scanner",
        description: "Nutze den Kamera-Button, um Etiketten sofort zu erfassen und Details zu Sorten blitzschnell abzurufen.",
        icon: <Camera size={48} />,
        color: "#00F5FF"
    }
];

export function OnboardingGuide() {
    const { user, isDemoMode } = useAuth();
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [isSaving, setIsLoading] = useState(false);

    useEffect(() => {
        console.log("[Onboarding] Component mounted.");
    }, []);

    useEffect(() => {
        async function checkOnboarding() {
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
            const { data, error } = await supabase
                .from("profiles")
                .select("has_completed_onboarding")
                .eq("id", user.id)
                .single();

            if (error) {
                console.error("[Onboarding] Error fetching profile:", error);
                // Fallback: If profile doesn't exist yet, show it anyway (it will be created during login/signup)
                setIsVisible(true);
                return;
            }

            console.log("[Onboarding] Data found:", data);
            // Show if value is NOT explicitly true
            if (data?.has_completed_onboarding !== true) {
                console.log("[Onboarding] Showing guide...");
                setIsVisible(true);
            } else {
                console.log("[Onboarding] User already completed onboarding.");
            }
        }

        checkOnboarding();
    }, [user, isDemoMode]);

    const handleNext = () => {
        if (currentStep < ONBOARDING_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            void completeOnboarding();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const completeOnboarding = async () => {
        if (isDemoMode) {
            console.log("[Onboarding] Dismissing in Demo Mode");
            sessionStorage.setItem("cannalog_onboarding_dismissed", "true");
            setIsVisible(false);
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

            if (!error) {
                console.log("[Onboarding] Successfully saved status.");
                setIsVisible(false);
            } else {
                console.error("[Onboarding] Error saving status:", error);
            }
        } catch (err) {
            console.error("[Onboarding] Failed to complete onboarding:", err);
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
                    onClick={() => {}} // Disable closing by backdrop click
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
