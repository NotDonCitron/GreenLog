"use client";

import React, { useState, useEffect } from "react";
import { X, Send, CheckCircle2, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { usePathname } from "next/navigation";

interface FeedbackModalProps {
  onClose: () => void;
}

export function FeedbackModal({ onClose }: FeedbackModalProps) {
  const pathname = usePathname();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [priority, setPriority] = useState("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ title: string; description: string } | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Automatischer technischer Kontext
  const [technicalContext, setTechnicalContext] = useState<any>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTechnicalContext({
        userAgent: navigator.userAgent,
        language: navigator.language,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        url: window.location.href,
        pathname: pathname,
        timestamp: new Date().toISOString(),
      });
    }
  }, [pathname]);

  const refineWithAI = async () => {
    if (!description || description.length < 5) {
      setError("Bitte gib zuerst eine kurze Beschreibung ein.");
      return;
    }

    setIsRefining(true);
    setError(null);
    setAiSuggestion(null);

    try {
      const response = await fetch("/api/feedback/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          description, 
          context: technicalContext 
        }),
      });

      if (!response.ok) throw new Error("KI-Optimierung fehlgeschlagen.");

      const data = await response.json();
      if (data.title && data.description) {
        setAiSuggestion(data);
      }
      
    } catch (err: any) {
      setError(err.message || "MiniMax konnte das Ticket nicht optimieren.");
    } finally {
      setIsRefining(false);
    }
  };

  const applySuggestion = () => {
    if (aiSuggestion) {
      setTitle(aiSuggestion.title);
      setDescription(aiSuggestion.description);
      setAiSuggestion(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error: insertError } = await supabase
        .from("feedback_tickets")
        .insert({
          user_id: userData.user?.id || null,
          title,
          description,
          category,
          priority,
          page_url: technicalContext.url,
          context: technicalContext,
        });

      if (insertError) throw insertError;

      setIsSuccess(true);
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      console.error("Error submitting feedback:", err);
      setError(err.message || "Fehler beim Senden des Feedbacks.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="w-full max-w-md rounded-2xl bg-zinc-900 p-8 text-center shadow-2xl border border-emerald-500/30">
          <CheckCircle2 className="mx-auto mb-4 text-emerald-500" size={64} />
          <h2 className="text-2xl font-bold text-white mb-2">Danke für dein Feedback!</h2>
          <p className="text-zinc-400">Deine Freunde (und Claude Code) kümmern sich darum.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-zinc-900 shadow-2xl border border-zinc-800 animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">Ticket erstellen</h2>
            <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20">Alpha Beta Feedback</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="relative group">
            <label className="block text-sm font-medium text-zinc-400 mb-1">Kurzer Titel</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Fehler beim Strain-Login"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Kategorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="bug">Bug 🐛</option>
                <option value="feature">Wunsch / Feature ✨</option>
                <option value="design">Design / Layout 🎨</option>
                <option value="content">Inhalt / Text ✍️</option>
                <option value="other">Sonstiges ❓</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Priorität</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="low">Niedrig (Schön wärs)</option>
                <option value="medium">Mittel (Wichtig)</option>
                <option value="high">Hoch (Bitte fixen!)</option>
                <option value="critical">Kritisch (Nichts geht mehr!)</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-zinc-400">Beschreibung</label>
              <button 
                type="button"
                onClick={refineWithAI}
                disabled={isRefining || !description || !!aiSuggestion}
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-500 hover:text-emerald-400 disabled:opacity-30 transition-colors"
              >
                {isRefining ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <Sparkles size={14} />
                )}
                <span>KI-Zauberstab (MiniMax)</span>
              </button>
            </div>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (aiSuggestion) setAiSuggestion(null);
              }}
              placeholder="Was genau ist passiert? Was hast du gemacht?"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* KI-Vorschlag Vorschau */}
          {aiSuggestion && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">Vorschlag von MiniMax</span>
              </div>
              <div className="space-y-2 mb-4">
                <p className="text-sm font-bold text-white leading-tight">
                  <span className="text-zinc-500 font-normal mr-1">Titel:</span> {aiSuggestion.title}
                </p>
                <p className="text-xs text-zinc-300 leading-relaxed italic">
                  "{aiSuggestion.description}"
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={applySuggestion}
                  className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-500 active:scale-95"
                >
                  Übernehmen
                </button>
                <button
                  type="button"
                  onClick={() => setAiSuggestion(null)}
                  className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-bold text-zinc-400 transition-all hover:text-white hover:border-zinc-700 active:scale-95"
                >
                  Ignorieren
                </button>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800/50">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Technischer Kontext (Auto-Capture)</p>
            <p className="text-[11px] text-zinc-400 font-mono truncate">
              URL: {technicalContext.pathname || "/"} | Env: {process.env.NODE_ENV}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition-all hover:bg-emerald-500 disabled:opacity-50 active:scale-95 shadow-lg shadow-emerald-900/20"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <Send size={20} />
                <span>Ticket senden</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
