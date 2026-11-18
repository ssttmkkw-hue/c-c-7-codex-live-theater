import { localParser, aiParser, keyStorage } from './parser.js'

export class Director {
  constructor(stage, refresh) {
    this.stage = stage
    this.refresh = refresh
    this.sound = true
    this.voices = new Map()
    this.errors = []
    this.speech = window.speechSynthesis
  }

  snapshot() {
    return {
      playing: this.playing ?? false,
      paused: this.paused ?? false,
      currentBeatIndex: this.index ?? -1,
      currentSpeaker: this.current?.speaker ?? '',
      currentLine: this.current?.line ?? '',
      currentBeat: this.current ? { ...this.current, emotion: this.current.alternate ? this.current.emotion : this.emotion || this.current.emotion } : null,
      firstBeatAt: this.firstBeatAt ?? null,
      startedAt: this.startedAt ?? null,
      startedWhileParsing: this.startedWhileParsing ?? false,
      parseDoneAt: this.parseDoneAt ?? null,
      actorNames: [...(this.names ?? [])],
      errors: [...this.errors],
      beatsReady: this.beats?.length ?? 0,
      rate: this.rate ?? 1,
      status: this.status ?? 'House open',
    }
  }

  async submit(value) {
    const text = String(value ?? '').trim()
    if (!text) return false
    this.source = text
    this.abort?.abort()
    const abort = new AbortController()
    this.abort = abort
    this.stopDelivery()
    this.stage?.reset()
    this.errors = []
    this.beats = []
    this.names = new Set()
    this.voices.clear()
    this.index = -1
    this.current = null
    this.emotion = ''
    this.rate = 1
    this.playing = true
    this.paused = false
    this.ending = false
    this.alternatePlayed = false
    this.firstBeatAt = this.startedAt = this.parseDoneAt = null
    this.startedWhileParsing = false
    this.status = 'Reading the scene'
    this.refresh()
    try {
      const apiKey = aiParser ? localStorage.getItem(keyStorage) : null
      const parser = apiKey ? aiParser : localParser
      for await (const beat of parser(text, { signal: abort.signal, apiKey })) {
        if (abort.signal.aborted) return false
        this.firstBeatAt ??= performance.now()
        if (beat.speaker) {
          this.names.add(beat.speaker)
          this.stage?.cast(beat.speaker)
        }
        this.beats.push(beat)
        if (!this.paused && this.waiting) this.next()
        this.refresh()
      }
    } catch (error) {
      if (abort.signal.aborted) return false
      this.errors.push(String(error))
    }
    if (abort.signal.aborted) return false
    this.parseDoneAt = performance.now()
    if (this.waiting && !this.paused) this.next()
    this.refresh()
    return true
  }

  stopDelivery() {
    clearTimeout(this.timer)
    this.delivery = null
    this.speech?.cancel()
    this.speech?.resume()
    this.waiting = true
  }

  next() {
    this.stopDelivery()
    const nextIndex = this.index + 1
    let beat = this.beats[nextIndex]
    if (this.ending && this.current) {
      const speaker = [...this.names].find(name => name !== this.current.speaker) || this.current.speaker
      beat = { speaker, line: 'Wait. We can still walk out of here together.', emotion: 'quiet', gesture: 'close', mark: 0, lookAt: this.current.speaker, alternate: true }
      this.alternatePlayed = true
      this.ending = false
    } else if (this.alternatePlayed) {
      beat = null
    }
    if (!beat) {
      if (this.parseDoneAt !== null || this.alternatePlayed) {
        this.playing = false
        this.stage?.perform(null)
        this.status = this.current ? 'Curtain call' : 'No beats found'
      } else {
        this.status = 'Waiting for the next beat'
      }
      this.refresh()
      return
    }
    this.waiting = false
    this.current = beat
    this.index = nextIndex
    if (this.startedAt === null) {
      this.startedAt = performance.now()
      this.startedWhileParsing = this.parseDoneAt === null
    }
    this.status = 'Now performing'
    this.stage?.perform(beat)
    this.refresh()
    this.deliver()
  }

  deliver(speak = true, remaining) {
    const { line, speaker, emotion } = this.current
    const duration = remaining ?? (line ? Math.max(1700, 700 + line.length * 48) : 1150) / this.rate
    const delivery = { at: performance.now(), duration }
    this.delivery = delivery
    this.timer = setTimeout(() => this.next(), duration)
    if (!speak || !line || !this.sound || !this.speech || !window.SpeechSynthesisUtterance) return
    const utterance = new SpeechSynthesisUtterance(line)
    if (!this.voices.has(speaker)) {
      const available = this.speech.getVoices()
      const language = /[\u3400-\u9fff]/u.test(line) ? 'zh' : 'en'
      const matching = available.filter(voice => voice.lang.toLowerCase().startsWith(language))
      const used = new Set(this.voices.values())
      const voice = [...matching, ...available].find(candidate => !used.has(candidate)) || matching[0] || available[0]
      if (voice) this.voices.set(speaker, voice)
    }
    if (this.voices.has(speaker)) utterance.voice = this.voices.get(speaker)
    const deliveryMood = this.current.alternate ? emotion : this.emotion || emotion
    utterance.rate = this.rate * (deliveryMood === 'quiet' ? .88 : 1)
    utterance.pitch = Math.min(1.4, ([...this.names].indexOf(speaker) % 2 ? .84 : 1.12) + (deliveryMood === 'angry' ? .16 : 0))
    utterance.onstart = () => {
      if (this.delivery !== delivery) return
      delivery.started = true
      if (this.paused) return
      clearTimeout(this.timer)
      this.timer = setTimeout(() => this.next(), Math.max(5500, duration * 2.5))
    }
    utterance.onend = () => {
      if (this.delivery !== delivery || this.paused) return
      clearTimeout(this.timer)
      this.timer = setTimeout(() => this.next(), Math.max(240, 1350 / this.rate - (performance.now() - delivery.at)))
    }
    this.speech.speak(utterance)
  }

  pause() {
    if (!this.playing) return false
    this.paused = !this.paused
    if (this.stage) this.stage.paused = this.paused
    if (this.paused) {
      clearTimeout(this.timer)
      if (this.delivery) {
        this.delivery.remaining = Math.max(250, this.delivery.duration - (performance.now() - this.delivery.at))
        this.speech?.pause()
      }
      this.status = 'Paused'
    } else {
      this.status = 'Now performing'
      if (this.waiting) this.next()
      else if (this.delivery) {
        const delivery = this.delivery
        delivery.at = performance.now()
        delivery.duration = delivery.remaining
        this.timer = setTimeout(() => this.next(), delivery.started ? Math.max(5500, delivery.duration * 2.5) : delivery.duration)
        this.speech?.resume()
      }
    }
    this.refresh()
    return true
  }

  replay() {
    return this.source ? this.submit(this.source) : false
  }

  setSound(sound) {
    this.sound = sound
    if (!sound && this.delivery) {
      const remaining = Math.max(250, this.delivery.duration - (performance.now() - this.delivery.at))
      clearTimeout(this.timer)
      this.delivery = null
      this.speech?.cancel()
      this.speech?.resume()
      if (this.paused) this.delivery = { remaining, at: performance.now(), duration: remaining }
      else this.deliver(false, remaining)
    }
    this.refresh()
  }

  direct(value) {
    const note = String(value ?? '').trim().toLowerCase()
    if (/^replay$/.test(note)) return this.replay() ? 'Replaying the scene.' : 'Start a scene first.'
    if (!this.playing) return 'Start a scene first.'
    if (/^pause$|^resume$|^continue$/.test(note)) {
      if ((note === 'pause') !== this.paused) this.pause()
      return this.paused ? 'Performance paused.' : 'Performance resumed.'
    }
    let response
    const previousRate = this.rate
    if (/end|finale/.test(note)) {
      this.ending = true
      if (this.stage) this.stage.endingQueued = true
      response = 'New ending queued for the next beat.'
    } else if (/slow|fast|quick|normal/.test(note)) {
      this.rate = /slow/.test(note) ? .65 : /normal/.test(note) ? 1 : 1.34
      if (this.stage) this.stage.rate = this.rate
      response = this.rate < 1 ? 'Taking it slower.' : this.rate > 1 ? 'Picking up the pace.' : 'Returning to the original pace.'
    } else if (/angr|fury|furious|shout|quiet|soft|whisper|calm/.test(note)) {
      this.emotion = /angr|fury|furious|shout/.test(note) ? 'angry' : 'quiet'
      if (this.stage) this.stage.override = this.emotion
      response = this.emotion === 'angry' ? 'The cast sharpens their delivery.' : 'The cast softens their delivery.'
    } else {
      return 'Try angrier, quieter, slower, faster, pause, resume, change ending, or replay.'
    }
    if (this.delivery && previousRate !== this.rate) {
      const delivery = this.delivery
      const remaining = Math.max(250, delivery.remaining ?? delivery.duration - (performance.now() - delivery.at))
      if (this.paused) {
        delivery.remaining = remaining * previousRate / this.rate
      } else if (!delivery.started) {
        clearTimeout(this.timer)
        this.deliver(false, remaining * previousRate / this.rate)
      }
    }
    this.refresh()
    return response
  }
}
