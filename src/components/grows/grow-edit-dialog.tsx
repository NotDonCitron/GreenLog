'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase/client';
import type { Grow } from '@/lib/types';

interface GrowEditDialogProps {
  grow: Grow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (grow: Grow) => void;
}

export function GrowEditDialog({ grow, open, onOpenChange, onSaved }: GrowEditDialogProps) {
  const [title, setTitle] = useState(grow.title);
  const [growNotes, setGrowNotes] = useState(grow.grow_notes ?? '');
  const [isPublic, setIsPublic] = useState(grow.is_public);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(grow.title);
    setGrowNotes(grow.grow_notes ?? '');
    setIsPublic(grow.is_public);
    setErrorMessage(null);
  }, [grow, open]);

  async function handleSave() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage('Name ist erforderlich');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const response = await fetch(`/api/grows/${grow.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          title: trimmedTitle,
          grow_notes: growNotes.trim() || null,
          is_public: isPublic,
        }),
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const message = body?.error?.message || 'Grow konnte nicht gespeichert werden';
        const details = body?.error?.details;
        setErrorMessage(typeof details === 'string' ? `${message}: ${details}` : message);
        return;
      }

      onSaved(body.data.grow);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--background)] border border-[var(--border)]/50 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-tight text-[var(--foreground)]">
            Grow bearbeiten
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
              Name
            </Label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              className="bg-[var(--background)] border border-[var(--border)]/50"
            />
          </div>

          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
              Notizen
            </Label>
            <Textarea
              value={growNotes}
              onChange={(event) => setGrowNotes(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Setup, Medium, Plan..."
              className="bg-[var(--background)] border border-[var(--border)]/50"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-[var(--border)]/50 bg-[var(--card)] p-3">
            <div className="flex items-center gap-2">
              {isPublic ? <Eye size={14} className="text-[#2FF801]" /> : <EyeOff size={14} className="text-[var(--muted-foreground)]" />}
              <div>
                <p className="text-xs font-bold text-[var(--foreground)]">Öffentlich sichtbar</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  Andere können diesen Grow sehen
                </p>
              </div>
            </div>
            <Switch checked={isPublic} onCheckedChange={(checked) => setIsPublic(checked)} />
          </div>

          {errorMessage && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {errorMessage}
            </p>
          )}

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-gradient-to-r from-[#2FF801] to-[#2fe000] text-black font-black"
          >
            {isSaving ? <Loader2 className="mr-2 animate-spin" size={16} /> : <Save className="mr-2" size={16} />}
            Speichern
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
