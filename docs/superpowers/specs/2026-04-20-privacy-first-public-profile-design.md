# Privacy-First Public Profile - Design Spec

**Datum:** 2026-04-20
**Status:** Draft for Review
**Beschreibung:** Privacy-first public profiles for GreenLog, with social growth through safe public data and strict private boundaries for sensitive cannabis, medical, club, and supply data.

---

## 1. Product Positioning

GreenLog should be social without becoming careless with sensitive cannabis data.

The product promise is:

> Teile deinen Geschmack. Nicht deine Versorgung.

Public profiles are a growth lever for GreenLog: they create discoverability, trust, social proof, reviews, favorites, badges, and profile-based network effects. The privacy model must make this safe by separating public identity and taste signals from private consumption, supply, health, pharmacy, and club operations data.

The guiding rule is:

> Public by choice, private by design.

GreenLog should make privacy visible as a product feature, not hide it in settings.

---

## 2. Privacy Matrix

### Public by Default

These fields may appear on public profiles without extra per-item approval:

| Data | Default | Notes |
|------|---------|-------|
| Username | Public | Required for social profiles |
| Avatar | Public | User-controlled |
| Display name | Public | User-controlled |
| Bio | Public | User-controlled |
| Featured badges | Public | Low sensitivity, strong social value |
| Follower/following counts | Public | Counts only, not necessarily full lists |

### Optional Public

These fields can be shared publicly, but the user must have a clear control:

| Data | Default | Sharing Control |
|------|---------|-----------------|
| Favorite strains | Optional public | Profile privacy settings |
| Tried strains | Optional public | Profile privacy settings |
| Star ratings | Optional public | Per rating or global default |
| Review text | Private until shared | Per review toggle |
| Public activity feed entries | Optional public | Derived only from public source data |
| Club membership label | Private by default | Requires user and organization opt-in |

### Always Private

These fields must never appear in public profiles, public feeds, share links, discover pages, or SEO payloads:

| Data | Reason |
|------|--------|
| Dose | Sensitive consumption or health-adjacent data |
| Batch / Charge | Supply and compliance data |
| Personal stock / Bestand | Sensitive possession data |
| Pharmacy / Apotheke | Health and supply context |
| CSC dispensations / Abgaben | Club compliance data |
| Exact quantities | Compliance and personal risk |
| Private notes | Explicitly private user expectation |
| Medical context | Special-category risk |
| Private grow photos | Location and identity risk |
| Organization inventory | B2B compliance data |
| Destructions, exports, audit details | Organization-internal compliance data |

The backend must enforce this boundary. The frontend must not be the only protection layer.

---

## 3. User Experience

### Public Profile Preview

The profile area should include a primary section named:

**Dein öffentliches Profil**

It shows:

- A live preview of how the profile appears to other users
- Visible blocks: profile info, badges, favorites, tried strains, reviews, activity
- A clear state for each block: public, followers only, or private
- A compact explanation that sensitive data remains private

Suggested copy:

> So sehen andere dein Profil.

> Versorgung, Mengen, Dosis, Charge, Apotheke und Notizen bleiben privat.

### Per-Entry Sharing

When a user creates or edits a review, collection entry, grow entry, or activity-producing action, the UI should show a clear switch:

> Öffentlich teilbar?

For reviews, the preview should explain the split:

Visible publicly:

- Strain
- Stars
- Review text, if enabled
- Public effect tags

Always private:

- Dose
- Charge
- Pharmacy
- Personal notes
- Stock
- Private images

### Onboarding

During onboarding, GreenLog should set expectations early:

> GreenLog schützt sensible Cannabis-Daten automatisch. Du entscheidest, was öffentlich wird.

Recommended onboarding choice:

- Public profile enabled with username, avatar, bio, and badges
- Favorites and reviews ask for consent before becoming public
- Sensitive fields are never publicly shareable

---

## 4. Data and API Design

### Public Profile API

Create or refactor public profile loading so public pages use a dedicated public surface, not general user tables.

Recommended route:

```text
GET /api/public-profiles/[username]
```

This route should only return already-sanitized public data:

- Profile identity fields
- Featured badges
- Public favorites
- Public tried strains
- Public reviews
- Public activities
- Public follower/following counts

It must not select or return private columns, even if the frontend ignores them.

### Public Payloads

Activity feed entries should use a `public_payload` pattern. Public feeds should not render directly from raw private metadata.

Recommended shape:

```text
user_activities
- id
- user_id
- activity_type
- is_public
- public_payload
- private_payload
- created_at
```

If the current implementation keeps a single `metadata` column, implementation should either split it or enforce a sanitizer before insert and before read.

### Profile Preferences

Add a small preference model for public profile blocks:

```text
user_public_preferences
- user_id
- show_badges
- show_favorites
- show_tried_strains
- show_reviews
- show_activity_feed
- show_follow_counts
- default_review_public
```

These preferences control optional public sections. They do not override always-private fields.

### Field-Level Public Flags

Use item-level flags for entities that can appear publicly:

```text
ratings
- is_public
- public_review_text

user_strain_relations
- public_status: private | tried | favorite

grows
- is_public
```

Private details remain in their original tables but are not exposed by public APIs.

---

## 5. Club OS Boundary

GreenLog Club OS should become a separate B2B trust layer, not a public social layer.

Organization features remain internal by default:

- Members
- Roles
- Präventionsbeauftragter
- Batches
- Dispensations
- Destructions
- Compliance exports
- Activity logs
- Inventory

Optional organization public profiles may exist later, but they should only expose safe business identity:

- Organization name
- Type: club or pharmacy
- City or region
- Verification state
- Public description
- Whether a prevention role is assigned, without exposing sensitive member data

The bridge between personal profiles and organizations must be opt-in on both sides:

- The user allows showing affiliation
- The organization allows public affiliation display

No member list should be public by default.

---

## 6. Security and Compliance Principles

This design is not legal advice. It is a product and engineering risk-reduction model for a regulated, privacy-sensitive category.

Implementation principles:

- Private data should be unavailable to public routes at query level.
- Public profile APIs should be covered by tests that assert excluded fields never appear.
- Feed entries should be generated only from sanitized public payloads.
- Sharing controls should be explicit and reversible.
- Defaults should favor public growth for low-risk profile fields and privacy for sensitive cannabis data.
- Public previews should match the actual public API response, not a separate approximation.
- Deleting or privatizing an entry should remove it from public profile and feed surfaces.

---

## 7. Implementation Scope

Recommended first implementation slice:

1. Define the privacy matrix in code as a shared constant or test fixture.
2. Add public profile preferences.
3. Add or harden the public profile API.
4. Build the "Dein öffentliches Profil" preview.
5. Add per-review "Öffentlich teilbar?" control.
6. Ensure feed activities are created only from public payloads.
7. Add tests for public API field exclusion.

Out of scope for the first slice:

- Public organization profiles
- Public club affiliation
- Legal export changes
- Full Club OS redesign
- Complex follower-only visibility

Follower-only visibility can be added after the public/private model is stable.

---

## 8. Open Product Decision

The agreed recommendation is:

- Profiles are public by default for low-risk identity fields.
- Badges are public by default.
- Favorites, tried strains, ratings, reviews, and activities are optional public.
- Sensitive supply, consumption, medical, pharmacy, club, and compliance data is always private.

This gives GreenLog public growth mechanics without treating sensitive cannabis data as ordinary social content.
