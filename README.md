# The Reel Room

A 3D way into IU's Media Collections Online: search for a film and an upright reel rolls to it, the camera
follows the frame along a twisting amber film strip into a projector, and it plays on the screen.

Built with Vite, React 19, three.js, React Three Fiber, drei, and @react-three/postprocessing.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run lint
```

## How it fits together

| Path | What it does |
|---|---|
| `public/models/reel-room.glb` | The model, exported from Blender: reel, strip, projector, screen, floor |
| `public/textures/film-atlas.png` | The film strip frames, rendered in Blender (16 cells: 2 leader, 12 films, 2 tail) |
| `src/data/films.ts` | The film list and search. Order must match the atlas |
| `src/data/strip.ts` | Strip centre line and the constants shared with the Blender scene, plus the feed maths |
| `src/scene/ReelRoom.tsx` | Loads the model, swaps in web materials, runs the roll → find → feed → project sequence |
| `src/scene/Atmosphere.tsx` | Lights, warm reflection environment, fog, dust |
| `src/state/useReel.ts` | Small zustand store: the UI sends commands, the scene reports its phase back |
| `src/ui/Overlay.tsx` | Search, suggestions, status line and the "now projecting" panel |

**The feed.** The strip's texture offset (`feed`) slides the frames along the strip; the reel's rotation is
derived from how much film moved, so the two always agree. A search picks a feed value that brings the
film to the flat run before the twist, then feeds it through to the projector gate.

## Editing the model

The source scene is `~/Documents/MCO Reel Room/mco-reel-room.blend` (the "Atlas" scene in the same file
renders `film-atlas.png`). After changing it, export glTF Binary with *Apply Modifiers* on and animations,
cameras and lights off, and replace `public/models/reel-room.glb`. Keep these object names, which the code
looks up: `Reel_Spin`, `Film_Strip`, `Screen`, `Projector_LensGlass`, `Floor`. If the strip's shape changes,
re-export its centre line into `src/data/strip.ts`.

## Not done yet

- Only 3 of the 12 films are real MCO records; search is a hard-coded tag match, not the collection.
- The screen shows the frame's stamp and title, not footage.
- No reduced-motion "skip to the screen" path or plain results list yet; the bundle is one ~1.4 MB chunk.
