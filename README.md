# Sports AI Coach 🏃‍♂️📹

**A live AI coach that watches you move and talks you through it — in real time, through your webcam.**

Point your camera at yourself doing squats, shadow boxing, a cricket shot, whatever — Sports AI Coach tracks your body with on-device pose detection, figures out what you're doing wrong (or right), and a Gemini-powered "coach" gives you actual spoken-style feedback, like a real trainer standing next to you. Not "Your elbow angle is 87 degrees" — more like "Lock that elbow in, it's flaring out a bit."

## What it actually does

1. **Pose tracking in the browser** — MediaPipe tracks your joints live through the webcam, no server roundtrip needed for the skeleton itself.
2. **Angle + rep math** — For each activity there's a config of which joint angles matter, what the "ideal" range looks like, and (for reps-based stuff) thresholds for counting a rep up/down.
3. **AI coaching, live** — That pose/angle data (plus camera frames) gets sent to Gemini 2.5 Flash with an activity-specific coaching persona, and it spits back one short, natural-sounding cue — never robotic, always in character as "the coach."
4. **Fitness data integration** — Heart rate, SpO2, and cadence feed in too, and trigger their own urgent callouts when something looks off (HR too high, SpO2 dropping, etc).
5. **Sessions get saved** — Every session (reps, duration, form scores, feedback log, fitness snapshots) goes into MongoDB, so there's a history view and AI-generated analytics insights after the fact.

## Activities it coaches

**Sports:** Cricket Batting, Cricket Bowling, Basketball Shooting, Shadow Boxing
**Workouts:** Push-ups, Squats, Plank Hold, Jumping Jacks, Lunges
**Yoga:** Sun Salutation (Surya Namaskar)

Each one has its own coaching personality and its own set of joint angles it actually cares about — a squat coach watches knees/hips/back, a boxing trainer watches your guard and arm angles, etc.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + TypeScript
- **MediaPipe Tasks Vision** — in-browser pose landmark detection
- **Google GenAI (Gemini 2.5 Flash)** — the actual "coach" generating live feedback, plus end-of-session analytics insights
- **MongoDB / Mongoose** — sessions, user profiles, feedback logs
- **Tailwind CSS 4** + Framer Motion for the UI

## Getting started

### Prerequisites

- Node.js 18+
- A MongoDB connection string (Atlas free tier works fine)
- A [Gemini API key](https://aistudio.google.com/apikey)

### Installation

```bash
git clone https://github.com/Arjun941/sportsAI.git
cd sportsAI
npm install
```

### Environment variables

Make a `.env.local` file in the project root:

```bash
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
```

(Good news — `.env*` is already in `.gitignore` here, so you're not at risk of leaking keys when you push.)

### Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), allow camera access, pick an activity, and let the coach do its thing.

### Other scripts

```bash
npm run build      # Production build
npm run start        # Start production server
npm run lint           # Lint the codebase
```

## Project structure

```
app/
├── page.tsx                     # Activity selection home page
├── session/[id]/page.tsx          # Live coaching session (camera + pose + feedback)
├── history/page.tsx                # Past sessions
└── api/
    ├── coach/route.ts               # Main live coaching endpoint (Gemini + pose data)
    ├── fitness-feedback/route.ts      # Heart rate / SpO2 / cadence-triggered callouts
    ├── analytics-insights/route.ts     # Post-session AI insights
    ├── sessions/route.ts                # Session CRUD
    └── profile/route.ts                   # User profile CRUD

components/
├── SessionView.tsx               # Core live session UI
├── RealtimeFeedback.tsx           # Displays live coach feedback
├── AnalyticsModal.tsx              # Post-session insights view
├── ActivityCard.tsx                 # Activity picker cards
└── ProfileModal.tsx / ProfileButton.tsx  # Profile management

lib/
├── activities.ts                  # All activity definitions, coaching prompts, angle configs
├── analyticsInsights.ts            # Generates post-session AI insight text
├── mongodb.ts                       # DB connection
└── models/                            # Session & UserProfile schemas
```

## A small heads-up

There's a leftover `build_error.log` checked into the repo (a Tailwind build error from a past run) — harmless, but probably worth deleting and adding `*.log` to `.gitignore` if it's not already covered.

## License

No license specified yet — so technically all rights reserved by default. Add one (MIT is the easy default) if you want others to freely use/fork this.
