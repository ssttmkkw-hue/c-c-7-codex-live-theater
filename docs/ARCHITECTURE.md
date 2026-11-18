# Architecture

## Parser and playback

[src/parser.js](../src/parser.js) accepts a script or an idea and yields one beat at a time. Each beat has a speaker, a line, an emotion, a gesture, an audience-relative horizontal stage mark, and a look-at name. Silent directions use an empty line and carry optional action text for the surtitles. A short yield between beats lets the browser render while the parser produces the queue.

[src/director.js](../src/director.js) appends beats as they arrive and starts playback immediately when the queue goes from empty to ready. It keeps separate timestamps for the first beat, playback start, and parse completion. Starting another request aborts the old stream and cancels its speech and timers. Replay resubmits the saved input. The director applies emotion and pacing overrides without rewinding the queue. A finale note replaces the remaining queue at the next beat boundary.

Speech advances beats on utterance completion. Timers cover silent beats, unavailable or failed speech, and utterances that stall. Voice selection prefers the dialogue language and looks for unused voices before sharing one.

## Stage and animation

[src/stage.js](../src/stage.js) builds the proscenium, scenery, seats, avatar, and performers with Three.js primitives and procedural geometry. The stage can animate two performers before the parser has discovered both names. The rig separates the torso, head, arms, and legs. Frame-by-frame interpolation combines breathing, walking, speech gestures, and turns. Pause holds the pose, and pacing scales the movement clock. A resize observer updates the renderer and camera framing.

## Optional streaming AI adapter

Replace the `aiParser` slot in [src/parser.js](../src/parser.js) with an adapter matching `StreamingParser`. The director passes the text, an abort signal, and the locally saved key if an adapter and a key are both present. Emit normalized beat objects as soon as complete records arrive, respect cancellation, and throw on stream failure so the director can report it. The local parser remains the default. The repository needs no provider SDK, proxy, or credentials to run.
