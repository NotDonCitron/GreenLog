"use client";

import React, { useState } from "react";
import { FeedbackModal } from "./feedback-modal";
import { MessageSquarePlus } from "lucide-react";

interface FeedbackButtonProps {
  variant?: "floating" | "header";
  canSee?: boolean;
}

export function FeedbackButton({ variant = "floating", canSee = false }: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!canSee) return null;

  if (variant === "header") {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600/20 text-emerald-400 transition-all hover:bg-emerald-600/40 hover:text-emerald-300 active:scale-95"
          aria-label="Feedback"
        >
          <MessageSquarePlus size={20} />
        </button>
        {isOpen && <FeedbackModal onClose={() => setIsOpen(false)} />}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition-all hover:scale-110 hover:bg-emerald-500 active:scale-95 sm:bottom-8 sm:right-8"
        aria-label="Feedback geben"
      >
        <MessageSquarePlus size={28} />
      </button>

      {isOpen && <FeedbackModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
