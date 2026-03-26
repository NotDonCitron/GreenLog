# GreenLog Social Experience - Design Spec

**Datum:** 2026-03-26
**Status:** Approved
**Beschreibung:** Social Profile, Community Detail, und Discover Seiten im Instagram/TikTok-Stil mit Weiß als Hintergrund

---

## 1. Concept & Vision

Eine moderne, mobile-first Social-Experience für die GreenLog B2B-Plattform. Die Pages sollen clean, luftig und intuitiv sein - inspiriert von Instagram/TikTok's visueller Sprache, aber ohne Self-Promotion-Features (keine Stories, keine eigenen Posts). Der Fokus liegt auf Strain-bezogenen Aktivitäten: Ratings, Grow-Logs, Favorites. Die Plattform dient Club- und Apotheken-Mitgliedern zum Verbinden und Entdecken.

**Key Principles:**
- Weiß als dominierende Farbe (kein dunklen Hintergrund)
- Subtile Depth durch sanfte Grautöne und Schatten
- Green Accent (#2FF801) nur für wichtige CTAs
- Cyan (#00F5FF) für Community-spezifische Elemente
- Read-Only Feed (keine eigenen Posts, keine Reactions/Comments)
- Minimal User Interaction (nur Follow/Unfollow)

---

## 2. Visual Language

### Farbpalette

| Token | Hex | Verwendung |
|-------|-----|-----------|
| background | #FFFFFF | Haupt-Hintergrund |
| surface | #FAFAFA | Card-Hintergründe |
| surface-elevated | #F5F5F5 | Sekundäre Bereiche |
| text-primary | #1A1A1A | Headlines, wichtiger Text |
| text-secondary | #666666 | Body-Text |
| text-tertiary | #999999 | Captions, Timestamps |
| border | #E5E5E5 | Subtile Trennungen |
| accent-primary | #2FF801 | CTAs, Follow-Buttons, aktive Stats |
| accent-secondary | #00F5FF | Community-Elemente |
| card-shadow | rgba(0,0,0,0.04) | Sanfte Schatten |

### Typography

- **Headlines:** font-weight: 800, tracking-tight, size: xl-2xl
- **Body:** font-weight: 400-500, size: sm-base
- **Labels:** font-weight: 700, uppercase, size: xs, color: text-tertiary
- **Badges:** font-weight: 600, uppercase, size: 9-10px

### Components

- **Border-Radius:** 16px (cards), 24px (große containers), full (avatars)
- **Shadows:** `0 2px 8px rgba(0,0,0,0.04)` für Cards
- **Padding:** 16px (compact), 20-24px (standard)
- **Avatar Sizes:** 48px (compact), 64px (profile), 80px (community-logo)

---

## 3. Page: Social Profile (`/user/[username]`)

### Layout Structure

```
┌─────────────────────────────────────┐
│ [←] Username            [Follow]    │  <- Sticky Header (56px)
├─────────────────────────────────────┤
│ ┌────┐                              │
│ │AVAT│ Display Name                  │
│ └────┘ @username                     │
│        Bio (max 2 lines truncated)   │
├─────────────────────────────────────┤
│   Follower  │  Following  │ Ratings │  <- Stats Bar
├─────────────────────────────────────┤
│ [Activity] [Favorites] [Sammlung] [Grows] │  <- Tabs
├─────────────────────────────────────┤
│                                     │
│         Tab Content Area            │
│                                     │
└─────────────────────────────────────┘
```

### Header Section

- **Height:** 120px total
- **Avatar:** 64px, left-aligned, rounded-full, border: 2px solid #E5E5E5
- **Name:** font-weight: 800, size: xl, color: text-primary
- **Username:** font-weight: 500, size: sm, color: text-tertiary
- **Bio:** font-weight: 400, size: sm, color: text-secondary, max 2 lines
- **Follow-Button:** 32px height, #2FF801 background, positioned right

### Stats Bar

- **Height:** 64px
- **Layout:** 3 equal columns, vertical dividers
- **Numbers:** font-weight: 800, size: lg, color: text-primary
- **Labels:** font-weight: 700, uppercase, size: 9px, color: text-tertiary
- **Special:** Ratings-Zahl in #2FF801 (accent)

### Tab Navigation

- **Height:** 48px
- **Tab Items:** font-weight: 600, size: sm
- **Active State:** color: #2FF801, border-bottom: 2px solid #2FF801
- **Inactive State:** color: text-tertiary
- **Tabs:** Activity | Favorites | Sammlung | Grows

### Activity Cards (in Tab Content)

- **Background:** #FAFAFA
- **Border-radius:** 16px
- **Padding:** 16px
- **Shadow:** sanft, subtle
- **Structure:**
  - Header: Avatar (32px) + Name + Timestamp
  - Badge: Activity-Type (Rating/Grow/Favorite) - small pill
  - Content: Strain-Image (falls vorhanden) oder Strain-Name/Info
  - Keine Reactions, keine Comments

---

## 4. Page: Community Detail (`/community/[id]`)

### Layout Structure

```
┌─────────────────────────────────────┐
│ [←]                                  │  <- Sticky Header minimal
├─────────────────────────────────────┤
│ ┌────┐  Community Name               │
│ │LOGO│ Club Badge                     │
│ └────┘                               │
│                                     │
│   Follower  │  Sorten  │  Grows     │  <- Stats Bar
│                                     │
│        [Follow Button]              │
├─────────────────────────────────────┤
│ [+ Strain] [Admin] [Settings]       │  <- Admin Actions (wenn Berechtigung)
├─────────────────────────────────────┤
│                                     │
│         Activity Feed               │
│                                     │
└─────────────────────────────────────┘
```

### Community Header

- **Height:** 200px total
- **Logo:** 80px, left-aligned, rounded-2xl
- **Name:** font-weight: 800, size: 2xl, color: text-primary
- **Type-Badge:** "Club" oder "Apotheke", pill-style, #00F5FF border

### Stats Bar

- **Layout:** 3 columns mit vertical dividers
- **Stats:** Follower (Users icon) | Sorten (Leaf icon) | Grows (Sprout icon)
- **Farbe:** Primary stat in #2FF801

### Admin Actions Bar (conditional)

- **Height:** 72px
- **Layout:** 3 Icon-Buttons, equal spacing
- **Buttons:** [+ Strain] [👥 Admin] [⚙️ Settings]
- **Style:** 48px x 48px, rounded-xl, subtle background

### Feed

- **Activity Cards:** ähnlich User Profile
- **Activity Types:** strain_created, grow_logged, rating_added
- **Community-Context:** Zeigt Community-Name in Card

---

## 5. Page: Discover (`/discover`)

### Layout Structure

```
┌─────────────────────────────────────┐
│ Social                    [+ Icon]  │  <- Header
├─────────────────────────────────────┤
│ [Deine Freunde] [Entdecken]         │  <- Sub-Tabs
├─────────────────────────────────────┤
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ →    │
│ │ A │ │ B │ │ C │ │ D │ │ E │      │  <- Suggestions (Horizontal Scroll)
│ └───┘ └───┘ └───┘ └───┘ └───┘      │
├─────────────────────────────────────┤
│                                     │
│         Activity Feed               │
│         (Alle Activities)          │
│                                     │
└─────────────────────────────────────┘
```

### Suggestions Section (Horizontal Scroll)

- **Height:** 140px
- **Style:** Instagram-Stories-ähnlich aber OHNE eigene Story
- **Items:** User oder Community Avatar + Name + Follow-Button
- **Avatar:** 64px, rounded-full
- **Gradient-Ring:** Multi-color gradient um Avatar
- **"+"-Button:** Rechts-unten am Avatar für Follow
- **Max Visible:** 5 items, dann horizontal scroll
- **NO Stories:** Keine eigenen Stories, keine Self-Promotion

### Sub-Tabs

- **Tabs:** "Deine Freunde & Communities" | "Entdecken"
- **Active:** #2FF801 underline
- **Inactive:** text-tertiary

### Feed Section

- **Content:** Alle public Activities von followed Users
- **Read-Only:** Keine Reactions, keine Comments
- **Empty State:** "Folge Usern um ihren Feed zu sehen" + CTA zu Entdecken

---

## 6. Interaction Model

### Follow Flow

```
[Follow Button] → POST /api/follow-request/{userId}
                 ↓
    ┌─────────────────────────────────┐
    │ Public Profile?                 │
    ├───────────────┬─────────────────┤
    │     JA        │      NEIN       │
    │ Follow        │ Follow-Request  │
    │ direkt        │ gesendet        │
    └───────────────┴─────────────────┘
```

### Read-Only Feed

- Keine ❤️ Reactions
- Keine 💬 Kommentare
- Keine eigenen Posts
- Keine Story-Reels
- Nur: Follow/Unfollow, Feed betrachten

---

## 7. Component Inventory

### FollowButton

| State | Appearance |
|-------|-----------|
| Default | #2FF801 background, white text |
| Following | white/black outline, "Following" text |
| Pending | outline style, "Requested" text |
| Loading | spinner |

### ActivityCard

| Part | Description |
|------|-------------|
| Avatar | 32px, left-aligned |
| Name | font-weight: 600 |
| Timestamp | text-tertiary, relative time |
| Badge | Activity-type pill |
| Content | Strain image/info |

### StatsBar

- 3 columns, vertical dividers
- Number + Label layout
- Special coloring for primary stat

### UserSuggestionItem

- Avatar with gradient ring
- Name below (truncated)
- "+" button overlay

---

## 8. Technical Notes

- **Framework:** Next.js App Router
- **Styling:** Tailwind CSS v4
- **Components:** Shadcn/UI + custom components
- **Icons:** Lucide React
- **Images:** Next/Image für Optimierung
- **Data:** Supabase queries, keine eigens erstellte Posts
