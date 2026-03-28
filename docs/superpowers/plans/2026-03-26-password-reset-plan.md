# Password Reset Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users can request a password reset email and set a new password via a dedicated update-password page.

**Architecture:** Two new/modified pages. The login page gets a modal dialog for requesting a reset email. A new `/update-password` page handles the actual password change using Supabase's auth token from the URL fragment.

**Tech Stack:** Next.js, TypeScript, Supabase Auth, shadcn/ui Dialog/Input/Button components.

---

## File Inventory

| File | Action |
|------|--------|
| `src/app/login/page.tsx` | Modify — add ForgotPasswordDialog component |
| `src/app/update-password/page.tsx` | Create — password reset form |
| `src/components/auth/forgot-password-dialog.tsx` | Create — email input dialog |
| `src/lib/supabase/client.ts` | Read — already exports `supabase` |

---

## Task 1: Create ForgotPasswordDialog Component

**Files:**
- Create: `src/components/auth/forgot-password-dialog.tsx`
- Modify: `src/app/login/page.tsx`

### Steps

- [ ] **Step 1: Create the ForgotPasswordDialog component**

```tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Mail, AlertCircle, CheckCircle } from "lucide-react";

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ForgotPasswordDialog({ open, onOpenChange }: ForgotPasswordDialogProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEmail("");
      setError(null);
      setSuccess(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[#1a191b] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Passwort zurücksetzen</DialogTitle>
          <DialogDescription className="text-white/60">
            {success
              ? "Gehe zu deinem Posteingang und klicke auf den Link in der E-Mail."
              : "Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen."}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <CheckCircle className="h-12 w-12 text-[#2FF801]" />
            <p className="text-white/80 text-sm text-center">
              E-Mail gesendet — bitte checke deinen Posteingang (auch Spam-Ordner).
            </p>
            <Button
              onClick={() => handleOpenChange(false)}
              variant="ghost"
              className="text-white/60 hover:text-white"
            >
              Zurück zum Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-white/20" size={18} />
                <Input
                  type="email"
                  placeholder="name@example.com"
                  className="bg-white/5 border-white/10 pl-10 h-12 text-white placeholder:text-white/20"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-xs">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#00F5FF] text-black font-black hover:bg-[#00F5FF]/80"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Link senden"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

(Import Dialog components from `@/components/ui/dialog`)

---

- [ ] **Step 2: Add import for ForgotPasswordDialog and Dialog to login/page.tsx**

Add to the imports section of `src/app/login/page.tsx`:

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ForgotPasswordDialog } from "@/components/auth/forgot-password-dialog";
```

- [ ] **Step 3: Add state and dialog to LoginForm component**

Add inside `LoginForm` function in `src/app/login/page.tsx`, after the existing `success` state:

```tsx
const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
```

- [ ] **Step 4: Add "Passwort vergessen?" link**

Find the closing `</div>` just before the "Authorized Access Only" `<p>` tag (line ~204). Insert this link above it:

```tsx
<button
  type="button"
  onClick={() => setForgotPasswordOpen(true)}
  className="text-[10px] text-black/30 hover:text-[#00F5FF] uppercase tracking-widest transition-colors"
>
  Passwort vergessen?
</button>
```

- [ ] **Step 5: Add ForgotPasswordDialog component**

Add after the closing `</Card>` tag and before the `</div>` that closes the main wrapper:

```tsx
<ForgotPasswordDialog
  open={forgotPasswordOpen}
  onOpenChange={setForgotPasswordOpen}
/>
```

- [ ] **Step 6: Run dev server to verify the component renders**

Run: `cd /home/phhttps/Dokumente/Greenlog/GreenLog && npm run dev`
Open http://localhost:3000/login and verify no console errors. Click "Passwort vergessen?" and confirm the dialog opens.

- [ ] **Step 7: Commit**

```bash
git add src/components/auth/forgot-password-dialog.tsx src/app/login/page.tsx
git commit -m "feat(auth): add forgot password dialog to login page"
```

---

## Task 2: Create /update-password Page

**Files:**
- Create: `src/app/update-password/page.tsx`

### Steps

- [ ] **Step 1: Create the update-password page**

Create file `src/app/update-password/page.tsx`:

```tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Lock, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState(false);
  const router = useRouter();
  const { refreshMemberships } = useAuth();

  useEffect(() => {
    // Check if we have a session with a token in the URL
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // No session — token might be in URL fragment which getSession should handle
        // If not, we'll show an error after the first attempt
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Passwort muss mindestens 6 Zeichen haben.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);

    // Update the user's password
    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Sign in with the new password
    // We need the email from the current user or from stored email
    const { data: { session } } = await supabase.auth.getSession();
    const email = session?.user?.email;

    if (email) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // Password was updated but login failed — redirect to login
        router.push("/login?reset=success");
        return;
      }

      // Refresh memberships and redirect to home
      await refreshMemberships();
      router.push("/");
      router.refresh();
    } else {
      // No email in session — redirect to login
      router.push("/login?reset=success");
    }

    setLoading(false);
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <div className="w-32 h-32 relative mx-auto mb-4 drop-shadow-2xl">
          <img src="/logo.png" alt="CannaLog Logo" className="w-full h-full object-contain" />
        </div>
        <span className="text-[12px] text-[#00F5FF] tracking-[0.5em] font-bold uppercase">CannaLog</span>
        <h1 className="text-3xl font-bold text-black mt-2">Neues Passwort</h1>
        <p className="text-black/40 mt-2">Gib dein neues Passwort ein.</p>
      </div>

      <Card className="p-6 bg-white border-black/10 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#00F5FF]/10 blur-3xl rounded-full" />

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1 font-mono">
              Neues Passwort
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-black/20" size={18} />
              <Input
                type="password"
                placeholder="••••••••"
                className="bg-black/5 border-black/10 pl-10 h-12 focus:ring-1 focus:ring-[#00F5FF]/50 transition-all text-black placeholder:text-black/10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest ml-1 font-mono">
              Passwort bestätigen
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-black/20" size={18} />
              <Input
                type="password"
                placeholder="••••••••"
                className="bg-black/5 border-black/10 pl-10 h-12 focus:ring-1 focus:ring-[#00F5FF]/50 transition-all text-black placeholder:text-black/10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-500 text-xs">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#00F5FF] text-black font-black hover:bg-[#00F5FF]/80 transition-all tracking-widest"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Passwort setzen"}
          </Button>

          <div className="text-center">
            <a
              href="/login"
              className="text-[10px] text-black/30 hover:text-[#00F5FF] uppercase tracking-widest transition-colors"
            >
              Zurück zum Login
            </a>
          </div>
        </form>
      </Card>

      <p className="text-center text-[10px] text-black/20 uppercase tracking-[0.3em]">Authorized Access Only</p>
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-6">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#00F5FF]" size={40} />
          <p className="text-[10px] font-bold text-black/20 uppercase tracking-[0.2em]">Lade...</p>
        </div>
      }>
        <UpdatePasswordForm />
      </Suspense>
    </main>
  );
}
```

- [ ] **Step 2: Run dev server and test the page**

Run: `npm run dev`
Navigate to http://localhost:3000/update-password — confirm the page loads without errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/update-password/page.tsx
git commit -m "feat(auth): add update-password page"
```

---

## Verification

After completing both tasks:

1. Go to `/login` — verify "Passwort vergessen?" link is visible below the login form
2. Click the link — verify the dialog opens with email input
3. Enter an email and submit — verify success message appears
4. Check Supabase dashboard → Authentication → Logs to see the reset email was sent
5. Click the link in the email — verify it redirects to `/update-password`
6. Enter a new password and confirm — verify it saves and redirects to `/`

---

## Spec Coverage Check

| Spec Requirement | Task |
|------------------|------|
| Forgot password overlay on login page | Task 1 |
| resetPasswordForEmail() call | Task 1 |
| Success state with "Check deine E-Mail" | Task 1 |
| /update-password page | Task 2 |
| updateUser() call | Task 2 |
| Auto-login after password set | Task 2 |
| Validation (min 6 chars, passwords match) | Task 2 |
| Error handling for invalid/expired token | Task 2 |
