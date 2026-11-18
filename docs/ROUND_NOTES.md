# Codex Live Theater round notes

## Round 1

Commit `d2169d3` shipped a playable Vite app with a Three.js stage, a seated gold avatar, procedural actors, surtitles, browser speech synthesis, and a streaming local parser for ideas and scripts. Actors turned toward one another and moved their mouths during dialogue. Director’s notes could change emotion, adjust the tempo, or queue an alternate ending.

The round 1 Chromium and SwiftShader measurement for “Hamlet meets the ghost,” using the local parser without an API key, was:

| Milestone | Time after submission |
| --- | ---: |
| First beat object | 2.2 ms |
| Performance start (`startedAt`) | 6.1 ms |
| First line visible in state | 21.2 ms |
| Full parse complete (five beats) | Approximately 1418 ms |

At the first visible line, `parseDoneAt` was still `null` and `beatsReady` was 1. The parser uses a 24 ms yield between beats. Main-thread work in headless Chromium likely contributed to the longer wall-clock parse time. The original checks also confirmed that Angrier set the emotion and returned “The cast sharpens their delivery.” Change ending produced “Wait. We can still walk out of here together.”

## Round 2

- The stage starts higher on desktop, with a smaller masthead and title. A closer camera and larger actors make faces and silhouettes easier to read. The stage keeps a fixed height at a given viewport width when a director’s note appears.
- Speech has larger arm accents, weight shifts, and changes in gaze. Anger adds a point and forward lean with a recoil from the listener. Unease and quiet delivery have separate poses. Walking uses a distance-driven foot lift and two-joint leg posing to keep the contact foot near the boards. The Ghost glides with a cool-toned mantle, luminous crown and drifting motes.
- Projected name labels highlight the speaker. A moving light follows the active mark. Changing the ending shifts the lighting and sends both actors toward center for a shared gesture. Slower reduces the animation and blocking tempo. Pause freezes movement and dims the stage.
- The status shows streaming while beats are arriving and keeps the first-beat start acknowledgment visible for the whole show. The first beat still starts as soon as it arrives.
- The local idea parser has distinct haunted, space, and kitchen scenes in addition to Hamlet, the station sample, and the generic fallback. Pasted dialogue and bracketed stage directions still use the script path.

## Round 2 verification

In headless Chromium with SwiftShader and sound off, Hamlet’s first beat arrived in 1.8–2.4 ms. Playback started in 2.0–2.5 ms, and a DOM observer saw the first surtitle update in 2.3–3.3 ms. At that update, the queue contained one beat and `parseDoneAt` was still `null`. These measurements capture state and DOM updates, before the browser’s paint and audio timing.

Desktop captures at 1280 and 1920 and a mobile capture at 390 showed the active speaker’s label and lighting. The directing check confirmed the lower tempo, a frozen pose during pause, and the alternate line with its own blocking and quiet delivery. No browser errors were reported. The production build succeeded with a bundle-size advisory.

## Round 3

- Each beat has one advancement deadline. A muted beat or the settle after speech can be retimed in place. Queued and speaking utterances retain their rate and their own deadlines, and the next utterance uses the latest rate. Pause preserves the remaining time for the current deadline. Obsolete speech callbacks and timers cannot advance a replacement run.
- Each beat has a preparation, an accent and a settle. The listener reacts after the accent, with a recoil for anger. Slower stretches the hold and release while the cast stands still. The ending cue lights the stage as soon as it is queued. The replacement finale plays once and ends with both actors on separate marks under a shared light.
- The station scene swaps the night scenery for a platform sign and canopy on the first beat. Speaker labels get first choice of space. Other labels move or hide when crowded. Script cues resolve multiword cast names already encountered, and phone layouts put the quick notes beside playback.
- The production build uses relative asset URLs for the repository subpath.

### Round 3 timing

Times are milliseconds after the submission call in headless Chromium with SwiftShader at 1280 px. The frame column records the first animation-loop render that contains the beat, which is a proxy for visible response. The test did not measure physical display presentation. Cold runs followed a page load or reload. Warm runs reused the page.

| Run | Sound | Beat arrival | First surtitle mutation | First acting frame |
| --- | --- | ---: | ---: | ---: |
| Cold Hamlet | Off | 2.9 | 3.6 | 18.4 |
| Warm station | Off | 1.4 | 1.6 | 15.8 |
| Warm script sample | Off | 2.8 | 2.9 | 8.2 |
| Warm 2,501-line paste | Off | 2.7 | 2.9 | 23.6 |
| Cold Hamlet | On | 1.5 | 1.9 | 6.5 |
| Warm station | On | 0.9 | 1.1 | 10.9 |
| Warm script sample | On | 1.0 | 1.1 | 7.2 |
| Warm 2,501-line paste | On | 1.6 | 1.8 | 17.3 |

With 4× CPU throttling, arrival took 3.5–9.8 ms, surtitles took 3.9–10.9 ms and the first acting render took 27.7–94.3 ms. In every run the first surtitle appeared on beat index 0 with `parseDoneAt === null`. Chromium reported no native speech start in the timing runs. A controlled synthesis stub exercised delayed start, mouth gating, pause and resume, rate changes, and callbacks delivered after replay or replacement. It does not provide audio onset timing.

Muted stage captures at 390, 1280 and 1920 px hid the desk and cue text. Playback checks covered the finale requested on the last original beat and during pause, a repeated finale note, mobile note submission, and the text fallback with WebGL and synthesis disabled. The production build was served locally under the repository path.

## Remaining limitations

- The local parser uses keyword-based scenes and a generic fallback. Unusual prompts may only influence character names or the opening line. The station is the only alternate set.
- Gestures and mouth motion are procedural. Speech synthesis depends on installed browser voices, and a voice already speaking may finish at its original speed after a tempo note.
- Walking approximates planted feet during turns and starts or stops. Scripts with several actors or close marks can still overlap onstage. Secondary labels can be hidden when space runs out.
- Full parse and render timing depend on browser load and WebGL performance. When WebGL is unavailable, the surtitles and controls still work.

## Run and inspect

```sh
npm install
npm run dev
npm run build
```

Open the Vite URL, choose a sample or enter an idea or script, and use the director’s notes during playback. In the browser console:

```js
const theater = window.__theater
theater.setSound(false)
theater.startSample('hamlet') // Also accepts 'station', 'script', or a sample title
theater.getState() // Beat, timing, actor names and poses, playback state, and errors
theater.direct('angrier')
theater.direct('quieter')
theater.direct('slower')
theater.direct('change ending')
theater.pause() // Toggle pause or resume
theater.replay()
theater.submit('Ari and Jules argue over a recipe in a bakery.')
```

`startSample` and `submit` return a promise that resolves when parsing finishes. To inspect startup, read `getState()` as soon as the first surtitle appears, before awaiting that promise. Compare `firstBeatAt`, `startedAt`, `firstFrameAt`, `firstSpeechAt`, and `parseDoneAt` using the same page’s `performance.now()` clock. The frame and speech timestamps stay null until their respective render or browser callback.
