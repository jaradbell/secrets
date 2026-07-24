import { useCallback, useEffect, useRef, useState } from 'react'

export type VoiceStatus = 'idle' | 'listening' | 'thinking' | 'responding'

/** Minimal typing for the (still vendor-prefixed) Web Speech API. */
type Recognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult:
    | ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start(): void
  stop(): void
}

function createRecognition(): Recognition | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition
    webkitSpeechRecognition?: new () => Recognition
  }
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
  return Ctor ? new Ctor() : null
}

const THINK_MS = 1700
const RESPOND_MS = 2600

/**
 * Voice input for the orb control. Owns the microphone stream, a live RMS
 * level meter (exposed as a mutable ref so the shader can read it every frame
 * without re-rendering React), and speech recognition where the browser
 * supports it. Drives the four interaction states:
 *
 *   idle → listening → thinking → responding → idle
 *
 * Listening ends on tap or when recognition detects the user stopped talking.
 */
export function useVoiceInput() {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [error, setError] = useState<string | null>(null)

  /** Live mic level, 0..1 — read imperatively by the orb shader. */
  const levelRef = useRef(0)

  const statusRef = useRef<VoiceStatus>('idle')
  const transcriptRef = useRef('')
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<AudioContext | null>(null)
  const rafRef = useRef(0)
  const recRef = useRef<Recognition | null>(null)
  const timersRef = useRef<number[]>([])

  const setBoth = (s: VoiceStatus) => {
    statusRef.current = s
    setStatus(s)
  }

  const teardownMic = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    if (recRef.current) {
      const rec = recRef.current
      recRef.current = null
      rec.onresult = null
      rec.onend = null
      rec.onerror = null
      try {
        rec.stop()
      } catch {
        // already stopped
      }
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    void audioRef.current?.close().catch(() => {})
    audioRef.current = null
    levelRef.current = 0
  }, [])

  const finish = useCallback(() => {
    if (statusRef.current !== 'listening') return
    teardownMic()
    setBoth('thinking')
    timersRef.current.push(
      window.setTimeout(() => {
        const heard = transcriptRef.current.trim()
        setResponse(heard ? `I heard: \u201C${heard}\u201D` : 'I didn\u2019t catch that \u2014 tap and try again.')
        setBoth('responding')
        timersRef.current.push(
          window.setTimeout(() => setBoth('idle'), RESPOND_MS),
        )
      }, THINK_MS),
    )
  }, [teardownMic])

  const start = useCallback(async () => {
    if (statusRef.current !== 'idle') return
    setTranscript('')
    setResponse('')
    setError(null)
    transcriptRef.current = ''

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('Microphone unavailable')
      return
    }
    streamRef.current = stream

    // RMS level meter → levelRef, fast attack / slow release.
    const audio = new AudioContext()
    audioRef.current = audio
    const analyser = audio.createAnalyser()
    analyser.fftSize = 512
    audio.createMediaStreamSource(stream).connect(analyser)
    const data = new Uint8Array(analyser.fftSize)
    const loop = () => {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128
        sum += v * v
      }
      const target = Math.min(1, Math.sqrt(sum / data.length) * 4)
      levelRef.current =
        target > levelRef.current
          ? levelRef.current * 0.6 + target * 0.4
          : levelRef.current * 0.92
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    // Speech recognition where available (Chrome/Edge/Safari 17+). Without it
    // the control still meters the mic and runs the full state loop.
    const rec = createRecognition()
    if (rec) {
      recRef.current = rec
      rec.continuous = true
      rec.interimResults = true
      rec.lang = 'en-US'
      rec.onresult = (e) => {
        let text = ''
        for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript
        transcriptRef.current = text
        setTranscript(text)
      }
      // Fires when the engine decides the user stopped talking — treat it as
      // a natural end of the utterance.
      rec.onend = () => finish()
      rec.onerror = () => {} // onend follows and handles the transition
      try {
        rec.start()
      } catch {
        recRef.current = null
      }
    }

    setBoth('listening')
  }, [finish])

  const toggle = useCallback(() => {
    if (statusRef.current === 'idle') void start()
    else if (statusRef.current === 'listening') finish()
    // thinking / responding: ignore taps and let the cycle complete
  }, [start, finish])

  useEffect(
    () => () => {
      teardownMic()
      timersRef.current.forEach((id) => clearTimeout(id))
    },
    [teardownMic],
  )

  return { status, transcript, response, error, levelRef, toggle, start, finish }
}
