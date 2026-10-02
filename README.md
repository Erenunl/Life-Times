# Life & Times

Life & Times is an original browser-based persistent life and roleplay simulation game prototype. The long-term idea is a fictional world where players create characters, study, work, improve skills, join communities, travel, build reputations, and experience a continuously progressing game calendar.

This repository is currently at the prototype stage. It includes local character creation and high-school gameplay foundations, plus an optional Supabase-backed multiplayer social foundation for authentication, public character profiles, messages, forums, relationship requests, privacy, blocking, and reporting.

## Technology

- React
- TypeScript with strict mode
- Vite
- React Router
- Plain CSS

The project is designed to run locally with a zero-budget setup and remain compatible with static frontend hosting such as GitHub Pages.

## Getting Started

Install dependencies:

```bash
pnpm install
```

Start the development server:

```bash
pnpm dev
```

Create a production build:

```bash
pnpm build
```

Preview the production build locally:

```bash
pnpm preview
```

The project uses `pnpm-lock.yaml` for reproducible installs. npm can also run the scripts if preferred, but pnpm is the package manager used for the current foundation.

## Folder Structure

```text
src/
  components/  Reusable UI pieces
  config/      Configurable game rules and starting values
  data/        Temporary mock data
  features/    Domain feature helpers
  layouts/     Application layout shells
  pages/       Routed page components
  services/    Persistence abstractions
  styles/      Global and component CSS
  types/       Shared TypeScript domain types
  utils/       Domain utilities such as game-time calculations
```

## Character Creation

The current prototype stores one local player character in browser localStorage through `src/services/storage/characterStorage.ts`. This is a temporary persistence layer that can later be replaced with API/database calls.

Every newly created character starts with the same baseline rules:

- Starting age: 16
- Starting money: $1,500
- Starting life stage: High School
- Starting education status: High School Student

The player cannot choose an arbitrary starting age. The character stores a fictional `birthDate`, generated from the current Life & Times game date so the character starts exactly 16 years old. The app does not persist a static age value; age is derived from the current game date minus the character birth date.

Profile photos are uploaded by the user, cropped client-side to a square 512x512 image, and stored locally for the prototype. There is no avatar creator.

## High School V1

The first gameplay system is the local high-school and academic path foundation. Education progress is stored separately from the character profile through `src/services/storage/educationStorage.ts`, keyed by character id.

Current high-school features:

- Permanent academic direction choice: Quantitative / STEM, Verbal / Humanities, or Balanced
- Direction-based curriculum rotations
- Up to 3 class decisions per real-world day
- 2 real-world hour cooldown after each Attend or Skip decision
- Attendance and skip history based only on explicit class decisions
- Weekly attended/skipped counts using real-world weeks
- Cumulative attendance stats
- Subject performance scores from 0-100
- Letter grades and academic averages derived in reusable education utilities
- Recent education event history
- Automatic biweekly exams every 14 real-world days
- Persistent exam history with score, grade, quantitative/verbal results, attendance counts, and subject snapshots
- One-time exam result notifications for newly processed exams

The high-school system deliberately separates fictional game time from real-world pacing. Fictional game time is used for age and world progression. Real-world time is used for class cooldowns, daily class limits, and weekly participation statistics.

Classes are the preparation mechanic. Biweekly exams are the main academic evaluation mechanic. Exam scoring is based mostly on subject performance and recent class decisions, with small deterministic variance so results are not wildly random. Skipped classes reduce preparation.

Exam periods are tracked from the education start timestamp in 14-day real-world intervals. If a player returns after many missed exam periods, the app generates results only for the most recent four due periods and marks older missed periods as processed without individual exam records. This keeps local history compact while preventing the same old period from being processed repeatedly.

Universities, scholarships, careers, and admission rules are not implemented yet; this system records the academic history those future systems will evaluate. Future admissions can prioritize exam history, individual subject performance, academic direction, and participation.

## Inactivity Death

Characters are mortal. The active character stores `lastActiveAt`, `isDeceased`, `diedAt`, `ageAtDeath`, and `deathReason`. On app startup, the character lifecycle service checks real-world inactivity before gameplay is shown:

- fewer than 90 real-world days inactive: continue normally and refresh `lastActiveAt`
- 90 or more real-world days inactive: mark the character permanently deceased

Existing saves without `lastActiveAt` are migrated to the current real-world timestamp so old prototype characters are not accidentally killed. Deceased characters cannot enter gameplay routes. The app shows a dedicated death screen and offers `Start a New Life`, which archives the deceased character locally and clears only the active character slot. Education progress and other old records remain keyed to the old character id for future legacy, graveyard, family, or history systems. A new character starts from the normal rules: age 16, $1,500, and high school student.

## Multiplayer Social Foundation

Life & Times now includes the first Supabase-backed multiplayer architecture for accounts, public character profiles, player discovery, direct messages, roleplay interactions, directional relationships, and IC/OOC forums.

Frontend data access is separated into repository modules under `src/services/supabase/`. React pages do not call Supabase directly. Local prototype systems remain in `src/services/storage/` and continue to support offline/local gameplay.

### Supabase Setup

1. Create a Supabase project on the free plan.
2. In Supabase Auth, enable email/password authentication.
3. Run the SQL migrations in order:
   - `supabase/migrations/202610020001_social_foundation.sql`
   - `supabase/migrations/202610020002_social_relationships_v2.sql`
4. Copy `.env.example` to `.env.local`.
5. Fill in only frontend-safe values:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Never commit service-role keys or admin secrets. The browser must use only the public anon key.

### Database Tables

The migration creates:

- `characters`
- `conversations`
- `conversation_participants`
- `direct_messages`
- `social_interactions`
- `character_relationships`
- `forum_threads`
- `forum_posts`

Tables use UUID primary keys, timestamps, indexes, foreign keys, and Row Level Security.

### RLS Overview

- Characters can be publicly read by authenticated users, but only the owner can insert/update their character.
- Direct messages can be read only by conversation participants.
- Direct messages can be inserted only by a participant sending as their own active character.
- Relationship rows are directional and private to the source character's owner.
- Relationship mutation happens through the `perform_social_interaction` RPC rather than arbitrary browser-submitted percentages.
- Forum threads/posts are readable by authenticated users.
- Forum creation and replies require the author's active owned character, preventing impersonation and deceased-character posting.

### Social Architecture

The Social page includes player discovery, profile viewing, relationship bubbles, roleplay interaction buttons, DMs, IC/OOC message labels, and a basic unread indicator. Interaction effects are configured in `src/config/socialRules.ts`, while database-side mutation and cooldown enforcement live in the migration RPC.

The Forums page supports IC/OOC threads and replies. Replies inherit the thread's mode.

### Social Relationships V2

The second social migration adds a deeper relationship layer while keeping directional feelings private:

- Directional feelings remain in `character_relationships` and belong only to the source character's owner.
- Mutual relationship status is stored separately in `mutual_relationships`: acquaintance, friend, close friend, or dating.
- Friend, close friend, and dating transitions happen through `social_requests`, with accept/decline state.
- First meeting, request outcomes, breakups, blocking, and decay can be recorded in `relationship_history_events`.
- `social_notifications` stores relationship, message, interaction, forum, block, report, and system notifications.
- `social_privacy_settings` controls direct messages, social interactions, and romantic requests.
- `character_blocks` prevents messages, interactions, and requests between blocked characters.
- `content_reports` stores reports for profiles, direct messages, and forum posts.

Romantic actions are intentionally teen-safe. The current system supports asking for a date and lightweight romantic interactions such as holding hands or giving flowers. Sexual interactions are not part of the game design.

Database RPCs enforce the important social rules instead of trusting browser UI checks. Deceased characters cannot initiate social actions, blocked pairs cannot interact, direct messages require compatible privacy/friendship status, and romantic requests are age-aware. The frontend surfaces these systems in Social through player discovery, requests, relationships, notifications, privacy controls, DMs, reporting, and profile actions.

The relationship model is designed for future gameplay systems such as reputation, school friendships, university access, dating consequences, clubs, careers, family history, and life-stage changes. Those consequence systems are not implemented yet.

## Game-Time Concept

The fictional calendar starts at Game Year 2000. Time progresses faster than real life:

- 30 real-world days = 1 game year
- 1 real-world day = 12 game days
- 1 game year currently has 12 months and 360 days

All game-time logic lives in `src/utils/gameTime.ts`. The current prototype uses the local system clock and a documented epoch timestamp. Later, the same utility can be fed a backend/server timestamp so canonical game time is not trusted to the player's local machine.

## GitHub Pages Note

The app currently uses `HashRouter`, which is practical for GitHub Pages because direct refreshes on nested routes do not require server rewrite rules.

Vite is configured with `base: "./"` in `vite.config.ts` so assets work with local builds and unknown future repository names. Once the final repository name and deployment path are known, review that setting. For a project page such as `https://username.github.io/repository-name/`, a fixed base like `/repository-name/` may be appropriate.

This repo includes `.github/workflows/pages.yml`. After pushing to GitHub, open the repository settings and set Pages source to **GitHub Actions**. Every push to `main` will build the Vite app and deploy the `dist/` output to GitHub Pages.

## Future Backend Plan

Canonical server time, organizations, and persistent non-social progression will be added later. The current frontend keeps some local/mock gameplay data in `src/data/` and `src/services/storage/` so it can gradually be replaced by API-backed data without mixing domain logic into UI components.
