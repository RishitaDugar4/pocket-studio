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

Milestones 1–3 of the build plan are implemented and tested end to end.

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

**Lighting and composition**
- Six lighting presets built from a key/fill/back/practical/ambient rig; every
  light is individually adjustable, with colour temperature driving colour.
- Composition guides: thirds, centre, golden ratio, true horizon, safe areas,
  eyeline. They are DOM overlays, so they can never reach an export.

**Keyboard**
`Space` play/pause · `1`–`4` select/move/rotate/scale · `F` frame selected ·
`Delete` remove · `⌘Z` / `⇧Z` undo / redo · `←` `→` step one frame.

## What is not built yet

Script editor, shot capture, storyboard, sequence editor, transitions, audio,
"what if?" versions, continuity analysis and export. Each of those sections says
so in the app and points back to the Scene Builder. Nothing pretends to work.

---

## Architecture

```
src/
  app/            routes + API handlers
  components/     ui · viewport · inspector · studio · timeline · project
  features/       persistence (autosave) · shortcuts
  stores/         project · scene · selection · viewport · camera · timeline
  lib/
    cinematography/  lens + framing + movement maths (no React, no three.js)
    db/              Prisma client, repository, serializers, demo seed
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
