import './style.css'
import { TheaterStage } from './stage.js'
import { Director } from './director.js'
import { samples, keyStorage } from './parser.js'

const byId = id => document.getElementById(id)
const stageNode = byId('stage')
let stage
let stageError
try {
  stage = new TheaterStage(stageNode)
} catch {
  stageError = '3D rendering is unavailable in this browser.'
  stageNode.classList.add('unavailable')
  const message = document.createElement('p')
  message.textContent = 'Stage view unavailable. Follow the performance in the surtitles.'
  stageNode.append(message)
}

const script = byId('script')
const note = byId('note')
const feedback = byId('feedback')

function display(id, value) {
  if (byId(id).textContent !== value) byId(id).textContent = value
}

function refresh() {
  const state = director.snapshot()
  const current = state.currentBeat
  const status = state.playing && !state.paused && state.startedAt !== null && state.currentBeatIndex === 0
    ? 'First beat ready · now performing'
    : state.status
  const statusText = byId('status').lastElementChild
  if (statusText.textContent !== status) statusText.textContent = status
  display('beat-count', current ? `BEAT ${String(state.currentBeatIndex + 1).padStart(2, '0')} · ${state.parseDoneAt === null ? 'STREAMING' : 'LIVE'}` : 'STANDBY')
  display('speaker', current?.line ? current.speaker : current ? 'STAGE DIRECTION' : 'THE HOUSE')
  display('line', current?.line || current?.action || (state.errors.length ? 'The scene could not be read.' : 'The stage is set. Start a scene to bring it to life.'))
  byId('pause').disabled = !state.playing
  display('pause', state.paused ? '▶  Resume' : 'Ⅱ  Pause')
  byId('replay').disabled = !director.source
  byId('sound').setAttribute('aria-pressed', String(director.sound))
  display('sound', director.sound ? '♪  Sound on' : '♪  Sound off')
  const buttons = byId('notes').querySelectorAll('button')
  buttons[0].setAttribute('aria-pressed', String(director.emotion === 'angry'))
  buttons[1].setAttribute('aria-pressed', String(state.rate < 1))
  buttons[2].setAttribute('aria-pressed', String(Boolean(director.ending)))
}

const director = new Director(stage, refresh)

function submit(text) {
  script.value = String(text ?? '')
  feedback.textContent = ''
  return director.submit(text)
}

function startSample(name = 'hamlet') {
  const key = String(name).toLowerCase()
  const sample = Object.hasOwn(samples, key) ? samples[key] : Object.values(samples).find(item => item.title.toLowerCase() === key)
  return submit((sample ?? samples.hamlet).text)
}

function direct(text) {
  const result = director.direct(text)
  feedback.textContent = result
  return result
}

for (const [name, sample] of Object.entries(samples)) {
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = sample.title
  const arrow = document.createElement('span')
  arrow.textContent = '↗'
  arrow.setAttribute('aria-hidden', 'true')
  button.append(arrow)
  button.addEventListener('click', () => startSample(name))
  byId('samples').append(button)
}

byId('request').addEventListener('submit', event => {
  event.preventDefault()
  submit(script.value)
})
byId('direction').addEventListener('submit', event => {
  event.preventDefault()
  direct(note.value)
  note.value = ''
})
byId('notes').addEventListener('click', event => {
  if (event.target.matches('button')) direct(event.target.textContent)
})
byId('pause').addEventListener('click', () => director.pause())
byId('replay').addEventListener('click', () => direct('replay'))
byId('sound').addEventListener('click', () => director.setSound(!director.sound))
byId('settings').addEventListener('click', () => {
  byId('key').value = ''
  byId('key').placeholder = ''
  try {
    if (localStorage.getItem(keyStorage)) byId('key').placeholder = 'Key saved · blank clears it'
  } catch { /* The dialog still opens when storage is blocked. */ }
  byId('config').showModal()
})
byId('key-form').addEventListener('submit', event => {
  event.preventDefault()
  const key = byId('key').value.trim()
  try {
    if (key) localStorage.setItem(keyStorage, key)
    else localStorage.removeItem(keyStorage)
  } catch {
    feedback.textContent = 'Browser storage is unavailable.'
  }
  byId('key').value = ''
  byId('config').close()
})

window.__theater = {
  startSample,
  submit,
  direct,
  replay: () => director.replay(),
  pause: () => director.pause(),
  setSound: value => director.setSound(Boolean(value)),
  getState() {
    const state = director.snapshot()
    if (stageError) state.errors.push(stageError)
    state.castPositions = stage ? Object.fromEntries([...stage.names].map(([name, actor]) => [
      name, { x: actor.root.position.x, facing: actor.root.rotation.y, mouth: actor.mouth.scale.y },
    ])) : {}
    return state
  },
}
refresh()
