# Codex Live Theater / Codex 现场戏剧

Type an idea or paste a play excerpt. The first beat starts as soon as the local parser emits it. Watch two procedurally animated actors from your gold seat.

输入一个想法或粘贴一段剧本。本地解析器生成第一拍后，演员立即开演。你的观众化身坐在金色座位上。

## Run locally

Use Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Run `npm run build` to create a static production build in `dist/`.

## Start a scene

Click **Hamlet meets the ghost**, **Last train out**, or **The borrowed hour**. You can also enter your own idea or paste a script into **Live request**. For a script, use a speaker name in capitals on its own line, or write `MARA: Where are you going?`. Put delivery cues in parentheses and stage directions in brackets or Markdown italics. The cast can cross left, right, or center, step back, and turn toward a named character.

The stage uses WebGL. Speech uses the browser’s available voices and tries to assign a different one to each actor. When speech is unavailable or muted, beat timers drive the show and the surtitles stay visible.

## Direct the cast

Use the buttons or type a note during the performance. **Angrier** and **quieter** change the current gestures and upcoming vocal delivery. **Slower**, **faster**, and **normal** change the pacing. **Pause** and **resume** control the show. **Change ending** lets the current beat finish before the cast performs a replacement finale. **Replay** starts the original request again with fresh direction.

## Parsers and secrets

The built-in parser runs entirely in the browser with no key. The [architecture notes](docs/ARCHITECTURE.md) describe the optional async streaming adapter. **Settings** can store a key in this browser’s `localStorage` for testing a future adapter. Save a blank field to clear it. The shipped stub never sends the key or script to any service.

This repository is public. Never commit keys, tokens, or `.env` files. Browser storage is visible to scripts on the same origin, so a future public integration should keep provider credentials server-side.

## Browser debug hook

```js
window.__theater.startSample('hamlet') // 'station' and 'script' also work
window.__theater.submit('Hamlet meets the ghost')
window.__theater.direct('angrier')
window.__theater.getState()
window.__theater.replay()
```

The state snapshot includes beat timing, cast names and positions, and errors. Times are milliseconds relative to the page’s performance time origin. Submission promises resolve when the parser finishes streaming.
