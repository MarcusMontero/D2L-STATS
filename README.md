# District 2 League (D2L) - Courtside Control Panel
### Official Web Control Panel & Live Stat Tracker • Ayala Alabang Village

Built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Supabase Realtime**, **Zustand**, **jsPDF**, and **PapaParse**.

---

## 🏀 Brand Palette & Identity
- **Primary Background**: Deep Forest Green (`#06180E`, `#0B3B24`, `#0E3E26`)
- **Highlights & Accents**: Gold & Bronze (`#D4AF37`, `#F5D77F`)
- **Live / Action Indicators**: Basketball Orange (`#FF6B00`)
- **Typography**: Condensed Athletic font styling paired with clean tabular numbers for clock and statistics.

---

## ⚡ 7 Core League Management Pages

### 1. Live Stat Tracker (`/`)
- **Top Scoreboard**: Live scores, team logos, digital game clock (with start/stop, +/- 10s, +/- 1s, direct edit), quarter selector (Q1-Q4, OT), team fouls with **Bonus** (5 fouls) alerts, timeouts remaining tracker, possession arrow.
- **Dual Full Roster View**: Scrollable full roster for both Home & Away teams (not restricted to 5 players). Staff can tap any player on or off court to log a stat without opening a substitution popup first.
- **1-Tap On-Court Toggle**: Direct single-tap button right on any player's row to toggle `ON COURT` / `BENCH` status for minutes tracking and box score accuracy.
- **Tactile Courtside Keypad**: Large tap-friendly buttons for **2PT Make, 2PT Miss, 3PT Make, 3PT Miss, FT Make, FT Miss, Personal Foul, Tech Foul, Offensive Rebound, Defensive Rebound, Assist, Turnover, Steal, Block**.
- **Instant Undo**: 1-Tap Undo button that immediately reverses the last action and automatically adjusts scores and fouls.
- **Audio & Haptics**: Built-in Web Audio API synthesizers for referee whistles, shot swishes, rim clanks, and buzzer sound effects with haptic vibration support.

### 2. Live Game Log
- Running chronological timestamped feed of every recorded stat event, grouped by quarter.
- Filtering by quarter, team, or player search term.
- Real-time deletion and correction with automatic score recalculation.

### 3. Box Score & PDF Export
- Post-game / live box score with Ayala Alabang Village location tag, game officials, date, and quarter score grid.
- Starters vs Bench split tables with standard metrics: `MIN`, `PTS`, `FGM-FGA`, `FG%`, `3PM-3PA`, `3P%`, `FTM-FTA`, `FT%`, `OREB`, `DREB`, `REB`, `AST`, `STL`, `BLK`, `TO`, `PF`, `+/-`.
- **Export Official PDF**: Generates high-resolution downloadable PDF box score with custom D2L crest styling.
- **Share Recap**: Formats and copies a quick recap text ready to post in team WhatsApp/Viber groups.

### 4. Teams & Standings
- Official division standings table ranked by Win Percentage (`WIN%`), Points For (`PPG`), Points Against (`OPP PPG`), Point Differential (`DIFF`), and Streak.
- Comprehensive team profile modal with season averages (`PPG`, `FG%`, `3P%`, `FT%`, `APG`, `RPG`, `BPG`, `SPG`), division info, and full team roster.

### 5. Players & Leaderboards
- Sortable player leaderboard with photos, jerseys, and team tags.
- Sort by `PPG`, `RPG`, `APG`, `BPG`, `SPG`, or `FG%` with top 3 podium highlights.
- Detailed Player Bio & Season Profile (Height, Weight, Age, Hometown/Ayala Alabang enclave, Per-game stats).

### 6. Schedule & Results
- Matchup calendar grouped by month with division and status filters (`Upcoming`, `Live`, `Final`).
- Final scores link straight to each game's official box score.
- **CSV Schedule Import / Export**: Quickly import games from league spreadsheets with PapaParse.
- **Printable Schedule PDF**: 1-Click PDF export of the complete league schedule.

### 7. League & Season Setup
- Multi-league & multi-season administration (e.g. D2L Season 10, Ayala Alabang Masters Cup).
- Team and division management.
- **Roster CSV Import / Export**: Upload team rosters straight from emailed CSV files with automated column mapping.
- **Staff Accounts & Roles**: Multi-device collaboration roles (`admin`, `stat_offense`, `stat_defense`, `stat_keeper`) with Supabase Realtime synchronization and offline event queuing.

---

## 🛠️ Tech Stack & Architecture
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript throughout
- **State Management**: Zustand with persistent storage + optimistic updates
- **Realtime Sync**: Supabase Realtime & BroadcastChannel (for multi-device concurrent statting)
- **Styling**: Tailwind CSS with custom athletic themes and glowing courtside accents
- **Audio / Haptics**: Web Audio API Sound Synthesizer & `navigator.vibrate`
- **PDF Engine**: jsPDF & jsPDF-AutoTable
- **CSV Engine**: PapaParse
- **Database Schema**: Postgres schema ready for Supabase in `supabase/schema.sql`

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run the development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to view the courtside control panel.
