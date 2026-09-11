# Pocket Studio

**Make the movie before you shoot it.**

An interactive previsualization sandbox for directing: build a set, put actors
in it, rig lights, then work the camera — lens, height, shot size, movement,
focus — and watch the frame change as you decide.

---

## Running it

Requires Node 20+ and a local PostgreSQL server.

```bash
createdb pocket_studio
cp .env.example .env          # then set DATABASE_URL to your user/host
npm install
npx prisma migrate dev
npm run dev
```

Open the app. **The Last Call** — the demo film — is created on first load, so
there is something to direct within seconds of arriving.

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (runs the type checker) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply / create Prisma migrations |
| `npm run db:studio` | Browse the database |

---

## What works today

All ten milestones of the build plan are implemented and tested end to end:
idea → script → scene → blocking → camera → shots → edit → notes → export.

**The whole loop**
- Build a set, block the actors over time, work the camera, capture shots,
  assemble them into a cut and play the film back — all in the browser.
- The demo film ships blocked, shot and cut, so there is something to watch
  within seconds of first launch.

**Script (Milestone 1 / §7)**
- A screenplay editor with a live breakdown: sluglines become candidate scenes,
  capitalised cues become cast, and props named in the action are matched
  against the library.
- `INT. APARTMENT — NIGHT` is parsed into a location, an inside/outside, and a
  time of day — and `CONTINUOUS` inherits the time from the scene before it.
- Nothing is created behind your back: you press Build, and the scenes appear
  with the set, location and time already filled in.

**Films and persistence**
- Project dashboard, three-step new-film flow, Director Challenges that create a
  film from a prompt.
- PostgreSQL + Prisma. Autosave — no save button anywhere. The whole data model
  from the spec (scenes, shots, blocking, timeline, audio, versions) exists in
  the schema; the sections that read it are noted as unbuilt below.

**The set**
- Five environments (Apartment, Bedroom, Office, Street, Park), five stylized
  actors, ten props — all registry-driven.
- Drag from the browser onto the floor to place exactly, or click to drop on an
  open mark. Small props land on a table if one is under them.
- Select, move, rotate, scale with gizmos or numeric scrubbers. Undo/redo, with
  a whole drag counting as one step.
- Eight-pose action vocabulary per actor (idle, walk, sit, stand, turn, look,
  talk, phone) with easing between poses.

**The camera**
- Lens presets and free focal length; changing the lens holds the framing.
- Seven shot-size presets that reposition the camera correctly for the subject —
  including seated actors, who need the aim point dropped but not the coverage.
- Six camera heights, live shot-size readout that tells you what the frame is
  *actually* reading as, and a warning when the camera is inside an actor.
- Ten movement types, previewed on a scrubbable clock. Handheld is controlled
  drift, not random shake.
- Depth of field with real optics behind it — the panel shows the true near/far
  limits and hyperfocal distance for the chosen lens and stop.

**Blocking (Milestone 4)**
- Timed beats per actor on a multi-track scene timeline: drag to move, drag an
  edge to retime, scrub to see the set at that moment.
- Positions interpolate between beats and actors turn to face where they are
  walking, unless you turn them deliberately.
- A beat that starts covering ground becomes a walk on its own; sitting is a
  state, so an actor who sits down and then takes a call stays in the chair.
- The scene is exactly as long as its longest decision.

**Shots and storyboard (Milestone 5)**
- Capture Shot (or `K`) freezes the camera into a shot and grabs the frame the
  camera was seeing as its storyboard card. A shot is independent from the scene
  camera from that moment on — changing the camera later never touches it.
- Storyboard: cards per scene, drag to reorder, duplicate, delete, rename,
  retime. Shots without a card develop one in the background.
- Shot editor: live preview on its own transport, with duration, scene time,
  shot size, lens, movement, focus, transition and notes.

**The cut (Milestone 6)**
- Lay the storyboard into a sequence, then reorder, trim, duplicate and delete
  clips without touching the storyboard.
- Playback across scenes on an A/B roll: two decks alternate, so during a
  dissolve both shots are genuinely live — the outgoing camera keeps moving and
  its actors keep acting while it mixes out. Cuts and fades too.
- Audio: upload sound onto dialogue, ambience, SFX and music tracks, drag clips
  against picture, and hear them in sync when you play the cut.

**"What if?" versions (Milestone 7)**
- Try another version copies a scene whole — cast, props, lights, cameras,
  blocking, shots — and hangs it off the original as an alternative. Every
  internal reference is remapped, so the two can never reach into each other.
- Compare plays the versions back to back with their decisions side by side
  ("MCU · 50mm · Push In" against "WS · 135mm · Static"), because the difference
  only means something in sequence.

**Director's notes (Milestone 8 / §26, §28)**
- Deterministic analysis, never an LLM and never a grade: shot pacing, a
  coverage checklist (master / medium / close-up / reverse / insert), static
  against moving shots, lens range, and where subjects actually land in frame.
- Continuity warnings: crossing the line between two characters, a character who
  never gets a close-up, and cameras standing inside an actor, under the floor
  or outside the set.
- Every number is measured from the project — the 180° check is literally which
  side of a line the camera stood on.

**Export (Milestone 9 / §31)**
- Records the cut as it plays, at 720p or 1080p, as WebM.
- Optional burned-in shot labels, timecode and a storyboard-frame corner inset;
  audio is mixed in from the timeline. Composition guides are never exported.
- Frames are composited through a 2D canvas rather than captured straight off
  the WebGL one — that is what makes burned-in overlays possible, and it is the
  seam where a server-side FFmpeg encoder would slot in later.

**Lighting and composition**
- Six lighting presets built from a key/fill/back/practical/ambient rig; every
  light is individually adjustable, with colour temperature driving colour.
- Composition guides: thirds, centre, golden ratio, true horizon, safe areas,
  eyeline. They are DOM overlays, so they can never reach an export.

**Navigation.** Overview · Script · Scenes · Storyboard · Edit · Notes · Export.
(§6 lists six sections; Notes is a seventh, because §26's director's notes and
§28's continuity warnings need somewhere to live.)

**Keyboard**
`Space` play/pause · `K` capture shot · `1`–`4` select/move/rotate/scale ·
`F` frame selected · `Delete` remove selected beat or object · `⌘Z` / `⇧Z`
undo / redo · `←` `→` step one frame · `⇧←` `⇧→` previous / next shot.

## What is not built yet

Every section of the app now does something real. Two things are deliberately
absent:

- **No built-in sound library.** Audio is whatever you upload. Shipping a stock
  library means shipping someone else's copyright, so it waits on a deliberate
  choice of licence (see below).
- **No AI features** (Milestone 10): script → shot suggestions, the director's
  assistant, generated voices. The spec puts these last on purpose, and the
  deterministic analysis in Director's Notes covers the ground that does not
  need a model.

---

## Architecture

```
src/
  app/            routes + API handlers
  components/     ui · viewport · inspector · studio · timeline · storyboard ·
                  edit · script · notes · export · project · dashboard ·
                  challenges
  features/       persistence (autosave) · playback · shots · export · shortcuts
  stores/         project · scene · sequence · selection · viewport · camera ·
                  timeline
  lib/
    cinematography/  lens + framing + movement maths (no React, no three.js)
    animation/       blocking evaluation + the shared stage clock
    edit/            resolving a list of clips into "what is on screen now"
    script/          screenplay parsing and scene breakdown
    continuity/      pacing, coverage and continuity analysis
    db/              Prisma client, repository, serializers, demo seed
    storage/         object storage behind an interface (frames, audio)
    rendering/       colour helpers
  data/           environments · characters · props · lighting · challenges
  types/          shared document model
```

Two decisions worth knowing about:

**Cinematography is a pure library.** Everything about how a frame works —
field of view, shot distance, camera placement for a shot size, depth of field,
movement evaluation — lives in `src/lib/cinematography` with no React and no
three.js imports. The viewport, the inspector and the server-side demo seed all
call the same functions, so a framing decision means the same thing everywhere.

**Sets and actors are procedural, behind an asset registry.** No GLB files ship
with this build, so environments, characters and props are assembled from
primitives in a deliberately stylized, previs-like look. Every definition
already carries an `assetPath`; when a GLB exists, the loader swaps in behind
the registry and nothing else in the app changes.

**Three clocks, one stage.** The scene builder runs on scene time, the shot
editor on shot time and the cutting room on sequence time — but actors only
understand scene time. Whoever is driving the view publishes it to
`lib/animation/stageClock`, which is the only thing the blocking reads. That is
why a shot taken eight seconds into a scene plays the right beat when it turns
up second in the cut.
