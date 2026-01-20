# J&J MedTech Purim 2026 - Costume Contest App

A real-time, mobile-first web application for a corporate Purim costume contest with phased voting system.

## Features

- **Phase 1: Registration** - Users upload costume photos with details
- **Phase 2: Eurovision-Style Voting** - Users vote for top 3 favorites (12, 10, 8 points)
- **Phase 3: Finals** - Top 3 finalists compete with single-vote system
- **Phase 4: Winners** - Celebration screen with top 3 winners
- **Live Leaderboard** - Real-time updates via Supabase subscriptions
- **Admin Dashboard** - Control contest phases and view statistics

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + Shadcn/UI
- **Animations:** Framer Motion
- **Backend:** Supabase (PostgreSQL + Realtime)
- **State Management:** Zustand
- **Icons:** Lucide React

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_PASSWORD=your_admin_password
```

3. Set up Supabase:
   - Create a new Supabase project
   - Run the migration in `supabase/migrations/001_initial_schema.sql`
   - Create a storage bucket named `costumes` with public read access
   - Enable Row Level Security (RLS) policies as defined in the migration

4. Add logo:
   - Place the J&J MedTech logo at `public/assets/logo.png`

5. Run the development server:
```bash
npm run dev
```

## Project Structure

```
├── app/
│   ├── page.tsx              # Phase 1: Registration
│   ├── vote/page.tsx          # Phase 2: Voting
│   ├── finals/page.tsx       # Phase 3: Finals
│   ├── live/page.tsx         # Live leaderboard (projector view)
│   ├── winners/page.tsx      # Phase 4: Winners
│   ├── admin/page.tsx        # Admin dashboard
│   └── actions/contest.ts    # Server actions
├── components/
│   ├── ui/                   # Shadcn UI components
│   ├── upload-form.tsx       # Image upload form
│   ├── costume-gallery.tsx   # Gallery view
│   ├── voting-selector.tsx   # Voting interface
│   ├── leaderboard-chart.tsx  # Animated leaderboard
│   └── countdown-timer.tsx   # Timer component
├── lib/
│   ├── supabase/             # Supabase clients
│   ├── store/                # Zustand store
│   └── utils.ts              # Utilities
└── supabase/
    └── migrations/           # Database migrations
```

## Usage

1. **Admin Setup:**
   - Navigate to `/admin`
   - Enter admin password
   - Use phase control buttons to manage contest flow

2. **User Flow:**
   - Phase 1: Users visit homepage and upload costumes
   - Phase 2: Admin starts voting phase, users vote for top 3
   - Phase 3: Admin starts finals, top 3 compete
   - Phase 4: Admin shows winners, celebration screen displays

3. **Live View:**
   - Navigate to `/live` for full-screen projector view
   - Updates in real-time as votes come in

## Notes

- All text is in Hebrew (RTL)
- Phone numbers are used as unique identifiers
- One vote per phase per phone number
- Images are stored in Supabase Storage
- Real-time updates use Supabase Realtime subscriptions
