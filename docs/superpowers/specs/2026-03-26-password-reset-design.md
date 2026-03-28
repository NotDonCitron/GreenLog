# Password Reset Flow — Design Spec

## Overview

Add password reset functionality to GreenLog's authentication flow. Users who forget their password can request a recovery email and set a new password.

## Components

### 1. Forgot Password Overlay (Login Page)

**Location:** `/login`
**Trigger:** "Passwort vergessen?" link below login form
**Action:** Opens modal/overlay with email input

**Flow:**
1. User enters email address
2. `supabase.auth.resetPasswordForEmail(email, { redirectTo: '/update-password' })`
3. Show success state: "Check deine E-Mail"

**States:**
- Default: Email input + "Link senden" button
- Loading: Button shows spinner
- Success: "Mail wurde gesendet — check deinen Posteingang"
- Error: Error message with retry option

### 2. Update Password Page

**Location:** `/update-password`
**Access:** Via link in recovery email (contains token in URL fragment)
**Auth:** Uses `supabase.auth.getSession()` which auto-populates from URL fragment

**Flow:**
1. Page loads, extracts token from URL
2. User enters new password + confirmation
3. `supabase.auth.updateUser({ password: newPassword })`
4. Auto-login: `supabase.auth.signInWithPassword({ email, password })`
5. Redirect to `/`

**Validation:**
- Minimum 6 characters
- Password + confirmation must match

**States:**
- Default: Two password inputs
- Loading: Button shows spinner
- Error: Display error message
- Invalid/expired token: Show error + link back to login

## Data Flow

```
[Login Page] --"Passwort vergessen?"--> [Email Overlay]
                                           |
                                  resetPasswordForEmail()
                                           |
                                      [Supabase sends email]
                                           |
                              User clicks link in email
                                           |
                    [/update-password#token=xxx]
                                           |
                          [User sets new password]
                                           |
                               updateUser() + signInWithPassword()
                                           |
                                           v
                                         [/] (logged in)
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Invalid email | Show "Email nicht gefunden" |
| Network error | Show retry button |
| Expired/invalid token | Show error + "Zurück zum Login" link |
| Password too short | Client-side validation before submit |
| Passwords don't match | Client-side validation before submit |

## Technical Notes

- Supabase auth token is passed via URL fragment (`#token=xxx`), not query params — safe from browser history/logs
- `redirectTo` param in `resetPasswordForEmail` tells Supabase where the email link should lead
- After `updateUser`, we re-authenticate with `signInWithPassword` to get a fresh session
- The `/update-password` page should work even if the user has no active session (token is in URL)

## File Changes

| File | Change |
|------|--------|
| `src/app/login/page.tsx` | Add forgot password overlay/modal |
| `src/app/update-password/page.tsx` | New page for setting new password |
| `src/components/ui/modal.tsx` | Create if needed for overlay |

## Out of Scope

- Email template customization (handled in Supabase dashboard)
- Rate limiting on reset requests (handled by Supabase)
- Password strength requirements beyond minimum length
