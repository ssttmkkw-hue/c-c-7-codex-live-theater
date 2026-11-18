# Codex Live Theater / Codex 现场戏剧

Type a short script, or just an idea. A fast parser turns it into a streamable performance, and the actors start performing on stage as soon as the first beat is ready.

输入一段短剧本，或只写一个想法。系统快速解析成可流式播放的演出，演员在第一段节拍就绪后立刻上台开演。

This is an independent experiment built with Codex CLI. It should feel like live improvisation — much faster than generating an AI comic or video — while keeping the tradition of theater: actors, a stage, a seated audience, and a director who can still call out notes mid-show.

这是一个由 Codex 独立尝试的实验项目。希望它像现场即兴一样快，比 AI 漫剧 / 视频生成快得多，同时保留戏剧的传统：演员、舞台、坐在观众席里的人，以及中途还能喊一嗓子的导演。

## Status / 状态

Just getting started. A playable first version will be built here in two Codex rounds.

本仓库刚创建，可玩的第一版会由 Codex 分两轮做出来。

## Run / 运行

```bash
npm install
npm run dev
```

## Notes / 说明

- No API key is required for the default local parser.
- If you later plug in a streaming AI parser, enter the key in the UI. It is stored only in localStorage and must never be committed.
- This repository is public. Do not commit tokens, secrets, or `.env` files.

默认本地解析器不需要 API key。若以后接入流式 AI 解析器，请在界面里填写密钥，只保存在 localStorage，绝不要提交到仓库。本仓库是公开的，请不要提交 token、密钥或 `.env`。
