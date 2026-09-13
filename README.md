# Pocket Studio

**Make the movie before you shoot it.**

A previsualization sandbox for directing. Write the scene, build the set, block
the actors, work the camera — lens, height, shot size, movement, focus — capture
your shots, cut them together with sound, read back what you actually did, and
export the result. No camera, no crew, no location.

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

Open the app. **The Last Call** — the demo film — is created on first load,
already blocked, shot and cut, so there is something to watch and take apart
within seconds of arriving.

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (runs the type checker) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply / create Prisma migrations |
| `npm run db:studio` | Browse the database |

Desktop-first: the Scene Builder needs a laptop-sized screen and says so on
anything smaller. Everything else reads fine on a narrow window.

---

## The loop

> idea → script → scene → blocking → camera → shots → cut → notes → export

Every section of the app does something real. Nothing is a placeholder.

---

## Films

- **Dashboard** of every film, each card showing its set, genre, scene and shot
  counts, runtime, how far along it is and when you last touched it.
- **▶ Play** on any card with shots in it — jumps straight to the cutting room
  and runs the film from the top. The same button leads the project Overview.
- **New Film** in three steps: title, format, visual mood. The mood picks your
  opening set and light rig; everything stays editable.
- **Director Challenges** — five exercises (Tension, Reveal, Long Take,
  Distance, Misdirection), each with a prompt and constraints, that create a
  film set up for the exercise.
- **Overview** holds the title, logline, format, mood and genre, the film's
  numbers, and a card per scene.
- **Autosave.** There is no save button anywhere. A status line by the title
  says *Saving…* / *Saved ✓* and otherwise stays out of the way. Saves are
  serialised, so two writes can never race each other.

## Script

- A screenplay editor with a live breakdown beside it, and a formatted
  screenplay view to read it back.
- Sluglines are parsed: `INT. APARTMENT — NIGHT` becomes a location, an
  inside/outside, and a time of day. `CONTINUOUS` inherits the time from the
  scene before it rather than defaulting to daylight.
- Capitalised cues above dialogue become cast — `MAYA (O.S.)` is Maya. Props
  named in the action are matched against the prop library.
- Each detected scene shows the set it would use, and **Build** creates it with
  location, time of day and environment already filled in. Nothing is created
  behind your back.

## The set

- **Five environments** — Apartment, Bedroom, Office, Street, Park — and **five
  stylized actors** and **ten props**, all registry-driven.
- Drag from the browser onto the floor to place exactly, or click to drop on an
  open standing mark. Small props land on a table if one is under them.
- Select and move, rotate or scale with gizmos or numeric scrubbers. Undo and
  redo, with a whole drag counting as a single step.
- An eight-pose vocabulary per actor — idle, walk, sit, stand, turn, look, talk,
  phone — easing between poses rather than snapping.
- **Scene inspector**: name, location, time of day, version label, set, and the
  director's notes for the scene.

## Blocking

- Timed beats per actor on a multi-track scene timeline. Drag a beat to move it,
  drag its edge to retime it, scrub to see the set at that moment.
- Positions interpolate between beats, and actors turn to face where they are
  walking unless you turn them deliberately.
- A beat that starts covering ground becomes a walk on its own. Sitting is a
  *state*, so an actor who sits down and then takes a call stays in the chair.
- The scene is exactly as long as its longest decision.

## The camera

- **Lenses** — 16 / 24 / 35 / 50 / 85 / 135mm presets and any focal length in
  between. Changing the lens holds your framing: the camera moves to keep it.
- **Shot sizes** — seven presets that reposition the camera correctly for the
  subject, including seated actors, who need the aim point dropped but not the
  coverage. A live readout tells you what the frame is *actually* reading as.
- **Heights** — ground, waist, chest, eye, high, overhead.
- **Movement** — static, pan, tilt, push in, pull out, truck left/right,
  pedestal, orbit, handheld — previewed on a scrubbable clock. Handheld is
  controlled drift, not random shake.
- **Depth of field** with real optics behind it: pick a stop and a focus target
  and the panel shows the true near and far limits and the hyperfocal distance.
- Multiple cameras per scene, switchable and independently rigged.
- **Set view / Camera view.** Set view is the floor: orbit, gizmos, the camera
  drawn with the frustum it is actually seeing. Camera view is the viewfinder,
  letterboxed to your chosen aspect — 2.39, 1.85, 16:9, 4:3 or 1:1.
- A warning when the camera is standing inside an actor.

## Lighting and composition

- **Six lighting presets** built from a key / fill / back / practical / ambient
  rig, switchable instantly.
- Every light is individually adjustable — intensity, source size, position, and
  colour temperature, which drives the colour.
- **Composition guides**: rule of thirds, centre, golden ratio, true horizon
  (which tracks the camera's tilt), safe areas, eyeline. They are DOM overlays,
  so they can never reach a capture or an export.

## Shots and storyboard

- **Capture Shot** (or `K`) freezes the camera into a shot and grabs the frame
  it was seeing as the storyboard card. A shot is independent of the scene
  camera from that moment on — changing the camera later never touches it.
- A shot records *when* in the scene it was taken, so a close-up can cover a
  beat eight seconds in.
- **Filmstrip** under the monitor, showing what you have taken so far.
- **Storyboard** — cards grouped by scene: drag to reorder, duplicate, delete,
  rename, retime. Shots with no card quietly develop one in the background.
- **Shot editor** — a live preview on its own transport, with duration, scene
  time, shot size, lens, movement, focus and stop, transition and notes, plus
  Duplicate for trying it another way.

## The cut

- Lay the storyboard into a sequence, then reorder, trim, duplicate and delete
  clips without touching the storyboard.
- Playback runs across scenes on an **A/B roll**: two decks alternate, so during
  a dissolve both shots are genuinely live — the outgoing camera keeps moving
  and its actors keep acting while it mixes out. Cuts and fades too.
- Trim in and out per clip; the scrubber shows where every cut falls.
- **Audio** on dialogue, ambience, SFX and music tracks, dragged against
  picture and heard in sync with the cut. Three ways to get sound in:
  - **Library** — twelve sounds synthesised in your browser from oscillators
    and noise: room tone, street at night, rain, a clock, a phone buzzing and
    ringing, knocks, a door, footsteps, a heartbeat, a tension drone, a sting.
    Listen before you place one. Nothing is sampled or licensed from anyone.
  - **Microphone** — record from any system input, with a device picker and a
    level meter. Made for scratch dialogue: say the line, cut to it, hear
    whether the shot is long enough to hold it.
  - **File** — MP3, WAV, OGG, M4A, AAC or WebM from your computer, up to 25 MB.

## "What if?"

- **Try another version** copies a scene whole — cast, props, lights, cameras,
  blocking, shots — and hangs it off the original as an alternative. Every
  internal reference is remapped, so the two can never reach into each other.
- **Compare** plays the versions back to back with their decisions listed side
  by side (*MCU · 50mm · Push In* against *WS · 135mm · Static*), because the
  difference only means anything in sequence.
- Alternatives stay off the scene rail; the film is still the film.

## Director's notes

- Deterministic analysis — never a model, and never a grade. It tells you what
  you did and leaves what it means to you.
- **Pacing**: average shot length, the range, and how that reads.
- **Coverage**: master, medium, close-up, reverse angle, insert — present or
  missing — plus a shot-size histogram.
- **Camera**: static against moving, and the spread of lenses you reached for.
- **Composition**: where your subjects actually land in frame, left / centre /
  right, by projecting them through each shot's camera.
- **Continuity warnings**: crossing the line between two characters, a character
  who never gets a close-up, and cameras standing inside an actor, under the
  floor or outside the set.
- An experiment to try next, chosen from what you have not done yet.

## Export

- Records the cut as it plays, at 720p or 1080p, as WebM.
- Optional burned-in shot labels, timecode and a storyboard-frame corner inset.
  Audio is mixed in from the timeline. Composition guides are never exported.
- The finished file plays in the panel before you download it.

---

## Navigation

**Overview · Script · Scenes · Storyboard · Edit · Notes · Export**

The spec lists six sections; Notes is a seventh, because the director's notes
and continuity warnings needed somewhere to live.

## Keyboard

| Key | Does |
| --- | --- |
| `Space` | Play / pause |
| `K` | Capture shot |
| `1` `2` `3` `4` | Select · move · rotate · scale |
| `F` | Frame the selection |
| `Delete` | Remove the selected beat, or the selected object |
| `⌘Z` / `Ctrl+Z` | Undo |
| `⇧⌘Z` / `⇧Z` | Redo |
| `←` `→` | Step one frame |
| `⇧←` `⇧→` | Previous / next shot |

---

## What is not built

- **AI features.** Script → shot suggestions, the director's assistant, and
  generated voices. The spec puts these last on purpose, and the deterministic
  analysis in Director's Notes covers the ground that does not need a model.
- **Version history for a shot.** Undo and redo cover the current session, and
  "Try another version" covers deliberate alternatives, but there is no way to
  visit a shot's earlier states after a reload. The `ProjectVersion` table
  exists in the schema for exactly this and is not yet written to.

---

## Architecture

```
src/
  app/            routes + API handlers
  components/     ui · viewport · inspector · studio · timeline · storyboard ·
                  edit · script · notes · export · project · dashboard ·
                  challenges
  features/       persistence (autosave) · playback · shots · audio · export ·
                  shortcuts
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

Four decisions worth knowing about.

**Cinematography is a pure library.** Everything about how a frame works —
field of view, shot distance, camera placement for a shot size, depth of field,
movement evaluation — lives in `src/lib/cinematography` with no React and no
three.js imports. The viewport, the inspector, the analysis and the server-side
demo seed all call the same functions, so a framing decision means the same
thing everywhere.

**Three clocks, one stage.** The scene builder runs on scene time, the shot
editor on shot time and the cutting room on sequence time — but actors only
understand scene time. Whoever is driving the view publishes it to
`lib/animation/stageClock`, which is the only thing the blocking reads. That is
why a shot taken eight seconds into a scene plays the right beat when it turns
up second in the cut.

**Sets and actors are procedural, behind an asset registry.** No GLB files ship
with this build, so environments, characters and props are assembled from
primitives in a deliberately stylized, previs-like look. Every definition
already carries an `assetPath`; when a GLB exists, the loader swaps in behind
the registry and nothing else in the app changes.

**The sound library is generated, not sampled.** Every built-in sound is
synthesised at runtime from oscillators and filtered noise, rendered offline and
encoded to WAV, then uploaded through exactly the same path as a microphone take
or a dropped file. That is a licensing decision as much as a technical one:
almost every "free SFX" licence permits *using* a file in a video but forbids
*redistributing* it inside another product, which is what bundling a library is.
Generating them means the library has no copyright surface at all — and for
previs, a sound only has to mark that something happens.

Export works the same way in spirit: frames are composited through a 2D canvas
rather than captured straight off the WebGL one, which is what makes burned-in
overlays possible and is the seam where a server-side FFmpeg encoder would slot
in later.
