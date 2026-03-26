"use client";

import { useState } from "react";
import { X, Loader2, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface InviteAdminModalProps {
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteAdminModal({ organizationId, onClose, onSuccess }: InviteAdminModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: inviteError } = await supabase
        .from("organization_invites")
        .insert({
          organization_id: organizationId,
          email: email.trim().toLowerCase(),
          role: "admin",
        })
        .select()
        .single();

      if (inviteError) {
        setError(inviteError.message);
        return;
      }

      onSuccess();
    } catch (err) {
      setError("Ein unerwarteter Fehler ist aufgetreten.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-black/60"
        >
          <X size={16} />
        </button>

        <h2 className="text-xl font-black italic tracking-tighter mb-6">
          Admin einladen
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-black/60 mb-2">
              E-Mail Adresse
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              className="w-full px-4 py-3 rounded-xl border border-black/20 focus:border-[#00F5FF] focus:outline-none focus:ring-2 focus:ring-[#00F5FF]/20 transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#00F5FF] text-black font-bold hover:bg-[#00F5FF]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <UserPlus size={18} />
            )}
            Einladung senden
          </button>
        </form>
      </div>
    </div>
  );
}
