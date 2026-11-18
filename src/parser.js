export const samples = {
  hamlet: { title: 'Hamlet meets the ghost', text: 'Hamlet meets the ghost' },
  station: { title: 'Last train out', text: 'A rainy-night argument between two strangers in a train station' },
  script: { title: 'The borrowed hour', text: '[At closing time. Mara crosses to center.]\nMARA: You said you only needed an hour.\nELI (quietly): I didn’t say whose.\n[Mara steps back.]\nMARA: Then put it back before anyone notices.\nELI: Listen. The clocks have already stopped.' },
}

/** @typedef {{speaker:string,line:string,emotion:string,gesture:string,mark:number,lookAt:string,action?:string}} Beat */
/** @typedef {(text:string, options?:{signal?:AbortSignal,apiKey?:string}) => AsyncIterable<Beat>} StreamingParser */

function mood(text) {
  if (/angr|shout|furious|yell|stern/i.test(text)) return 'angry'
  if (/whisper|quiet|sad|slow/i.test(text)) return 'quiet'
  if (/fear|startle|\?$/.test(text)) return 'uneasy'
  return 'intent'
}

function beat(speaker, line, mark, cue = '', lookAt = '') {
  const emotion = mood(cue || line)
  return { speaker, line, emotion, gesture: emotion === 'angry' ? 'point' : emotion === 'quiet' ? 'close' : 'open', mark, lookAt }
}

const named = /^([\p{L}][\p{L}\p{N} .’'-]{0,35}?)(?:\s*\(([^)]+)\))?\s*:\s*(.*)$/u
const heading = /^([A-Z][A-Z0-9 ’'-]{0,30}?)(?:\s*\(([^)]+)\))?$/
const direction = /^(?:\[(.+)\]|\((.+)\)|\*{1,2}(.+?)\*{1,2}|_(.+)_)$/
const title = name => name.toLowerCase().replace(/(^|\s)\p{L}/gu, match => match.toUpperCase())

function stageMark(text, fallback) {
  if (/exits?|leaves? the stage/i.test(text)) return fallback < 0 ? -5.6 : 5.6
  if (/enters?/i.test(text)) return fallback < 0 ? -1.85 : 1.85
  if (/\b(?:center|centre|middle)\b/i.test(text)) return 0
  if (/\bleft\b/i.test(text)) return -2.4
  if (/\bright\b/i.test(text)) return 2.4
  if (/steps? back|retreat/i.test(text)) return fallback < 0 ? -2.9 : 2.9
  if (/cross|approach/i.test(text)) return fallback < 0 ? -.8 : .8
  return fallback
}

function* scriptBeats(lines) {
  const names = new Map()
  const marks = new Map()
  let speaker = ''
  let cue = ''
  const register = name => {
    const normalized = title(name.trim())
    if (!names.has(normalized)) names.set(normalized, names.size % 2 ? 1.85 : -1.85)
    return normalized
  }
  function makeLine(line) {
    const inline = line.match(/^\(([^)]+)\)\s*(.*)/)
    if (inline) {
      cue = inline[1]
      line = inline[2]
    }
    if (!line) return
    const mark = stageMark(cue, marks.get(speaker) ?? names.get(speaker))
    marks.set(speaker, mark)
    const look = cue.match(/(?:faces?|looks? at|turns? to)\s+([\p{L}][\p{L}'’-]*)/iu)
    const result = beat(speaker, line, mark, cue, look ? title(look[1]) : '')
    cue = ''
    return result
  }
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    const character = line.match(named) || line.match(heading)
    if (character) {
      speaker = register(character[1])
      cue = character[2] || ''
      if (character[3]) {
        const result = makeLine(character[3])
        if (result) yield result
      }
      continue
    }
    const action = line.match(direction)
    if (action) {
      const content = action.slice(1).find(Boolean)
      if (line.startsWith('(') && speaker && !/\b(enters?|exits?|crosses?|walks?|steps?|turns?|looks?)\b/i.test(content)) {
        cue = content
        continue
      }
      const subject = content.match(/(?:^|[.!]\s+)([\p{Lu}][\p{L}'’-]*)\s+(?:enters?|exits?|crosses?|walks?|steps?|turns?|looks?|moves?|approaches?)\b/u)
      const actor = subject ? register(subject[1]) : speaker
      const mark = stageMark(content, marks.get(actor) ?? names.get(actor) ?? 0)
      if (actor) marks.set(actor, mark)
      const look = content.match(/(?:faces?|looks? at|turns? to)\s+([\p{L}][\p{L}'’-]*)/iu)
      yield { ...beat(actor, '', mark, content, look ? title(look[1]) : ''), action: content }
      continue
    }
    if (speaker) {
      const result = makeLine(line)
      if (result) yield result
    }
  }
}

function* ideaBeats(text) {
  let cast, lines
  if (/hamlet|ghost/i.test(text)) {
    cast = ['Hamlet', 'Ghost']
    lines = ['Speak. I’ll go no further.', 'Mark me, Hamlet. The morning comes, and I must go.', 'You wear my father’s face. What would you have of me?', 'Remember me. But leave your mother to her conscience.', 'Then let the night remember what I swear.']
  } else if (/train|station|rain|strangers/i.test(text)) {
    cast = ['Mara', 'Eli']
    lines = ['That’s my bag. Put it down.', 'I was moving it out of the rain.', 'You carried it halfway to the tracks.', 'I thought the last train was coming. Listen.', 'That isn’t a train. Take my hand.']
  } else {
    const pair = text.match(/\b([A-Z][a-z]+)\s+(?:meets|and|confronts)\s+([A-Z][a-z]+)\b/)
    cast = pair ? pair.slice(1) : ['Ari', 'Jules']
    const premise = text.replace(/\s+/g, ' ').replace(/[.!?]+$/, '').slice(0, 140)
    lines = [`You left me a note. “${premise}.” Is this where it happens?`, 'It was supposed to happen after you left.', 'You could have told me. I would have stayed.', 'Then stay now. We still have a choice.', 'All right. Show me what you saw.']
  }
  for (const [index, line] of lines.entries()) {
    const actor = index % 2
    const sign = actor ? 1 : -1
    yield beat(cast[actor], line, sign * (index < 2 ? 1.65 : index < 4 ? .95 : 1.35), index === 3 ? 'quietly' : '', cast[1 - actor])
  }
}

/** @type {StreamingParser} */
export async function* localParser(text, { signal } = {}) {
  const lines = text.trim().split(/\r?\n/)
  const scripted = lines.some(line => named.test(line.trim()) || (lines.length > 1 && heading.test(line.trim())))
  for (const item of scripted ? scriptBeats(lines) : ideaBeats(text.trim())) {
    if (signal?.aborted) return
    yield item
    await new Promise(resolve => setTimeout(resolve, 24))
  }
}

export const keyStorage = 'codex-live-theater-api-key'

/** Replace this slot with a StreamingParser adapter to enable an AI provider. */
export const aiParser = null
