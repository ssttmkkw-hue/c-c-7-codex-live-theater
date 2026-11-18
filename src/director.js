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
      firstFrameAt: this.stage?.firstFrameAt ?? null,
      firstSpeechAt: this.firstSpeechAt ?? null,
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
    this.firstBeatAt = this.startedAt = this.parseDoneAt = this.firstSpeechAt = null
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
        if (this.playing && !this.paused && this.waiting) this.next()
        this.refresh()
      }
    } catch (error) {
      if (abort.signal.aborted) return false
      this.errors.push(String(error))
    }
    if (abort.signal.aborted) return false
    this.parseDoneAt = performance.now()
    if (this.playing && this.waiting && !this.paused) this.next()
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
    if (!this.alternatePlayed && this.ending && this.current) {
      const cast = [...this.names]
      const partner = this.current.speaker || cast[0] || ''
      const speaker = cast.find(name => name !== partner) || partner
      beat = { speaker, line: 'Wait. We can still walk out of here together.', emotion: 'quiet', gesture: 'close', mark: 0, lookAt: speaker === partner ? '' : partner, alternate: true }
      this.alternatePlayed = true
      this.ending = false
    } else if (this.alternatePlayed) {
      beat = null
    }
    if (!beat) {
      if (this.parseDoneAt !== null || this.alternatePlayed) {
        this.playing = false
        if (!this.alternatePlayed) this.stage?.perform(null)
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

  timeLeft(delivery) {
    return delivery.deadline === null
      ? delivery.remaining : Math.max(0, delivery.deadline - performance.now())
  }

  schedule(delivery, owner, remaining) {
    clearTimeout(this.timer)
    Object.assign(delivery, { owner, remaining, deadline: null })
    const ticket = {}
    delivery.ticket = ticket
    if (this.paused) return
    delivery.deadline = performance.now() + remaining
    this.timer = setTimeout(() => {
      if (this.delivery === delivery && delivery.ticket === ticket && !this.paused) this.next()
    }, remaining)
  }

  deliver() {
    const { line, speaker, emotion } = this.current
    const duration = line ? Math.max(1700, 700 + line.length * 48) : 1150
    const canSpeak = line && this.sound && this.speech && window.SpeechSynthesisUtterance
    const delivery = { duration, speech: canSpeak ? 'queued' : 'finished' }
    this.delivery = delivery
    this.stage?.setSpeech(canSpeak ? 'queued' : 'estimated')
    const estimate = duration / this.rate
    this.schedule(delivery, canSpeak ? 'startup' : 'timer', canSpeak ? Math.max(3500, estimate) : estimate)
    if (!canSpeak) return
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
      if (this.delivery !== delivery || delivery.speech !== 'queued') return
      delivery.speech = 'speaking'
      this.firstSpeechAt ??= performance.now()
      this.stage?.setSpeech('speaking')
      this.schedule(delivery, 'speech', Math.max(5500, estimate * 2.5))
    }
    const finish = failed => {
      if (this.delivery !== delivery || delivery.speech === 'finished') return
      delivery.speech = 'finished'
      this.stage?.setSpeech(failed ? 'estimated' : 'finished')
      const minimum = this.current.alternate ? 2300 : 1550
      const settle = this.stage?.estimatedRemaining(minimum) ?? 650 / this.rate
      this.schedule(delivery, 'timer', failed ? duration / this.rate : Math.max(650 / this.rate, settle))
    }
    utterance.onend = () => finish(false)
    utterance.onerror = () => finish(true)
    this.speech.speak(utterance)
  }

  pause() {
    if (!this.playing) return false
    this.paused = !this.paused
    if (this.stage) this.stage.paused = this.paused
    const delivery = this.delivery
    if (this.paused) {
      if (delivery) {
        this.schedule(delivery, delivery.owner, this.timeLeft(delivery))
        if (delivery.speech !== 'finished') this.speech?.pause()
      }
      this.status = 'Paused'
    } else {
      this.status = 'Now performing'
      if (this.waiting) this.next()
      else if (delivery) {
        this.schedule(delivery, delivery.owner, delivery.remaining)
        if (delivery.speech !== 'finished') this.speech?.resume()
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
    const delivery = this.delivery
    if (!sound && delivery && delivery.speech !== 'finished') {
      delivery.speech = 'finished'
      this.speech?.cancel()
      this.speech?.resume()
      this.stage?.setSpeech('estimated')
      this.schedule(delivery, 'timer', this.stage?.estimatedRemaining(delivery.duration) ?? delivery.duration / this.rate)
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
    if (/\b(?:end|ending|finale)\b/.test(note)) {
      if (this.alternatePlayed) return 'The alternate ending is already playing.'
      this.ending = true
      if (this.stage) this.stage.endingQueued = true
      response = 'New ending queued for the next beat.'
      if (this.current && this.waiting && !this.paused) this.next()
    } else if (/\b(?:slow(?:er|ly)?|fast(?:er)?|quick(?:er|ly)?|normal)\b/.test(note)) {
      this.rate = /\bslow(?:er|ly)?\b/.test(note) ? .65 : /\bnormal\b/.test(note) ? 1 : 1.34
      this.stage?.setTempo(this.rate)
      response = this.rate < 1 ? 'Taking it slower.' : this.rate > 1 ? 'Picking up the pace.' : 'Returning to the original pace.'
    } else if (/\b(?:angry|angrier|fury|furious|shout|quiet(?:er|ly)?|soft(?:er|ly)?|whisper|calm(?:er)?)\b/.test(note)) {
      this.emotion = /\b(?:angry|angrier|fury|furious|shout)\b/.test(note) ? 'angry' : 'quiet'
      this.stage?.setMood(this.emotion)
      response = this.emotion === 'angry' ? 'The cast sharpens their delivery.' : 'The cast softens their delivery.'
    } else {
      return 'Try angrier, quieter, slower, faster, pause, resume, change ending, or replay.'
    }
    const delivery = this.delivery
    if (delivery?.owner === 'timer' && previousRate !== this.rate) {
      this.schedule(delivery, 'timer', this.timeLeft(delivery) * previousRate / this.rate)
    }
    this.refresh()
    return response
  }
}
