# Refactoring Backlog — April 2026

## Priorität: Mittel

Diese Tasks wurden bei der `/simplify`-Runde (7. April) identifiziert, aber bewusst nicht angefasst (zu riskant / zu viel Aufwand ohne Tests).

---

## 1. Membership-Check Helper (`src/lib/organization-membership.ts`)

**Problem:** Das Membership-Query ist 9× in 6 Dateien dupliziert:
```typescript
supabase.from("organization_members")
  .select("role, membership_status")
  .eq("organization_id", organizationId)
  .eq("user_id", user.id)
  .eq("membership_status", "active")
  .single();
```

**Betroffene Dateien:**
- `api/organizations/[organizationId]/route.ts` (3× — GET, PATCH, DELETE)
- `api/organizations/[organizationId]/activities/route.ts`
- `api/organizations/[organizationId]/analytics/strains/route.ts`
- `api/organizations/[organizationId]/analytics/export/route.ts`
- `api/communities/[id]/invite/route.ts`
- `api/organizations/[organizationId]/invites/route.ts`

**Ansatz:**
```typescript
// src/lib/organization-membership.ts
export async function getUserMembership(supabase, organizationId: string, userId: string, fields = "role, membership_status") {
  const { data, error } = await supabase
    .from("organization_members")
    .select(fields)
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("membership_status", "active")
    .single();
  return { data, error };
}
```

**Risiken:**
- Unterschiedliche Fehlerbehandlung pro Route (403 vs 404)
- Manche brauchen nur `role`, andere `role + membership_status`
- Breaking Change wenn sich das Query ändert

**Empfehlung:** Erst Tests schreiben, dann refactoren.

---

## 2. Role-Strings im Frontend auf `USER_ROLES` umstellen

**Problem:** In React-Komponenten stehen noch überall Rohstrings (`"gründer"`, `"admin"`, `"member"`, `"viewer"`). Nur die API-Routen wurden bei `/simplify` auf `USER_ROLES` umgestellt.

**Betroffene Dateien (geschätzt):**
- RoleBadge-Komponente
- Organization-Member-Listen
- Invite-Flows
- Dropdown-Menüs für Rollen-Auswahl

**Aufwand:** Mittel (20+ Dateien, aber jeder Replace ist trivial)

**Empfehlung:** Mit VS Code Search & Replace alle `"gründer"`, `"admin"` etc. durch Konstanten ersetzen.

---

## 3. `isAppAdmin` in `badges.ts` konsolidieren

**Problem:** `badges.ts` hat eine eigene Admin-Prüfung auf `APP_ADMIN_IDS`. Nach `/simplify` gibt es jetzt auch `isAppAdmin()` in `src/lib/auth.ts`. Beide sind identisch.

**Betroffene Dateien:**
- `src/lib/badges.ts` — eigene Implementierung entfernen, Import aus `auth.ts` nutzen
- `src/app/api/strains/[id]/image/route.ts` — bereits umgestellt

**Risiko:** Niedrig — identischer Code, nur ein Import-Pfad-Änderung.

---

## 4. Promise.all für parallele Membership + Org Queries

**Problem:** In `api/organizations/[organizationId]/route.ts` GET-Handler:
```typescript
// Query 1: membership (wartet)
// Query 2: organization (wartet auf Query 1 — aber braucht Ergebnis nicht!)
```

**Fix:**
```typescript
const [{ data: membership, error: membershipError }, { data: organization, error: orgError }] = await Promise.all([
  supabase.from("organization_members").select("role, membership_status")...,
  supabase.from("organizations").select("*").eq("id", organizationId).single()
]);
```

**Risiko:** Niedrig — Fehlerhandling verdoppelt sich.

---

## 5. Leafly `STRAIN_TYPES`-Validierung aktivieren

**Problem:** Die Konstanten `STRAIN_TYPES` und `DEFAULT_SOURCE` wurden in `import/leafly/route.ts` extrahiert, aber noch nicht genutzt (ESLint warnt: "unused").

**Nutzen:** Beim Import könnte der Strain-Typ validiert werden:
```typescript
if (!STRAIN_TYPES.includes(scrapedData.type)) {
  scrapedData.type = DEFAULT_SOURCE;
}
```

**Risiko:** Sehr niedrig — nur default-Wert nutzen.

---

## Abgeschlossen (7. April)

- [x] Token-Helper dedupliziert (`generateInviteToken`, `hashToken` → `src/lib/invites.ts`)
- [x] `USER_ROLES` + `ORG_STATUS_VALUES` → `src/lib/roles.ts`
- [x] `sanitizeSlug()` → `src/lib/sanitize.ts`
- [x] `isValidEmail()` → `src/lib/validation.ts`
- [x] `isAppAdmin()` → `src/lib/auth.ts`
- [x] 37-fach `includes()` → 1× `matchAll()` + Set in Leafly-Import
- [x] `toLocaleDateString()` → ISO slice in CSV-Export
- [x] WHAT-Kommentare aus API-Routen entfernt
- [x] Redundanter String-Check bei Bild-Löschung entfernt
