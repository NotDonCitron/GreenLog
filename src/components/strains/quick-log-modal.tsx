"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";

import {
  PRIVATE_QUICK_LOG_SIDE_EFFECTS,
  PUBLIC_QUICK_LOG_EFFECTS,
  QUICK_LOG_STATUSES,
  type QuickLogEffectChip,
  type QuickLogSideEffect,
  type QuickLogStatus,
} from "@/lib/quick-log";

export interface QuickLogSaveInput {
  effectChips: QuickLogEffectChip[];
  sideEffects: QuickLogSideEffect[];
  overallRating: number;
  privateStatus: QuickLogStatus | null;
  privateNote: string;
  settingContext: string;
  isPublic: boolean;
  publicReviewText: string;
}

interface QuickLogModalProps {
  open: boolean;
  strainName: string;
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: QuickLogSaveInput) => void | Promise<void>;
}

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

function toggleValue<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function QuickLogModal({ open, strainName, isSaving, onClose, onSave }: QuickLogModalProps) {
  const [effectChips, setEffectChips] = useState<QuickLogEffectChip[]>([]);
  const [sideEffects, setSideEffects] = useState<QuickLogSideEffect[]>([]);
  const [overallRating, setOverallRating] = useState(4);
  const [privateStatus, setPrivateStatus] = useState<QuickLogStatus | null>(null);
  const [privateNote, setPrivateNote] = useState("");
  const [settingContext, setSettingContext] = useState("");
  const [showPrivateNote, setShowPrivateNote] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [publicReviewText, setPublicReviewText] = useState("");

  const publicReviewLabelId = useMemo(() => "quick-log-public-review", []);

  if (!open) {
    return null;
  }

  const handleSave = () => {
    void onSave({
      effectChips,
      sideEffects,
      overallRating,
      privateStatus,
      privateNote,
      settingContext,
      isPublic,
      publicReviewText,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-3 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-log-title"
        className="relative w-full max-w-lg rounded-lg border border-white/10 bg-[#101418] text-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <h2 id="quick-log-title" className="text-base font-semibold tracking-tight">
              Quick Log
            </h2>
            <p className="mt-1 text-xs text-white/60">
              {strainName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 p-2 text-white/70 hover:bg-white/5 hover:text-white"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#00f5ff]/80">Wirkprofil</p>
            <div className="flex flex-wrap gap-2">
              {PUBLIC_QUICK_LOG_EFFECTS.map((effect) => {
                const isActive = effectChips.includes(effect.value);
                return (
                  <button
                    key={effect.value}
                    type="button"
                    onClick={() => setEffectChips((current) => toggleValue(current, effect.value))}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "border-[#00f5ff]/70 bg-[#00f5ff]/15 text-[#00f5ff]"
                        : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                    }`}
                  >
                    {effect.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Nebenwirkungen</p>
            <p className="text-xs text-white/50">Nebenwirkungen bleiben privat.</p>
            <div className="flex flex-wrap gap-2">
              {PRIVATE_QUICK_LOG_SIDE_EFFECTS.map((effect) => {
                const isActive = sideEffects.includes(effect.value);
                return (
                  <button
                    key={effect.value}
                    type="button"
                    onClick={() => setSideEffects((current) => toggleValue(current, effect.value))}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "border-[#ff716c]/70 bg-[#ff716c]/20 text-[#ffd6d4]"
                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {effect.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Bewertung</p>
            <div className="flex flex-wrap gap-2">
              {STAR_VALUES.map((value) => {
                const isActive = overallRating === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-label={`${value} Sterne`}
                    onClick={() => setOverallRating(value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "border-[#2ff801]/70 bg-[#2ff801]/15 text-[#2ff801]"
                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Privat</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_LOG_STATUSES.map((status) => {
                const isActive = privateStatus === status.value;
                return (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => setPrivateStatus(status.value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "border-[#ffb000]/70 bg-[#ffb000]/15 text-[#ffb000]"
                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {status.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowPrivateNote((current) => !current)}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/5"
            >
              + Private Notiz
            </button>

            {showPrivateNote ? (
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label htmlFor="quick-log-private-note" className="text-xs font-medium text-white/70">
                    Private Notiz
                  </label>
                  <textarea
                    id="quick-log-private-note"
                    value={privateNote}
                    onChange={(event) => setPrivateNote(event.target.value)}
                    className="min-h-20 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#00f5ff]/50"
                    placeholder="Privat halten"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="quick-log-setting-context" className="text-xs font-medium text-white/70">
                    Setting-Kontext
                  </label>
                  <textarea
                    id="quick-log-setting-context"
                    value={settingContext}
                    onChange={(event) => setSettingContext(event.target.value)}
                    className="min-h-20 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#00f5ff]/50"
                    placeholder="Privat halten"
                  />
                </div>
              </div>
            ) : null}
          </section>

          <section className="space-y-2">
            <button
              type="button"
              onClick={() => setIsPublic((current) => !current)}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/5"
            >
              + Öffentlichen Kurzreview hinzufügen
            </button>

            {isPublic ? (
              <div className="space-y-1 pt-1">
                <label htmlFor={publicReviewLabelId} className="text-xs font-medium text-white/70">
                  Öffentlicher Kurzreview
                </label>
                <textarea
                  id={publicReviewLabelId}
                  value={publicReviewText}
                  onChange={(event) => setPublicReviewText(event.target.value)}
                  className="min-h-20 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#00f5ff]/50"
                  placeholder="Kurz und öffentlich"
                />
                <p className="text-xs text-white/50">
                  Öffentlich: Sterne, Wirkchips, Kurzreview. Privat: Nebenwirkungen, Status, Notiz, Dosis, Charge.
                </p>
              </div>
            ) : null}
          </section>

          <div className="flex gap-2 border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/5"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="ml-auto rounded-lg border border-[#2ff801]/50 bg-[#2ff801]/15 px-4 py-2 text-sm font-semibold text-[#2ff801] hover:bg-[#2ff801]/20 disabled:opacity-50"
            >
              Save Log
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
