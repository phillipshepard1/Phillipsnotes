import { useState, useEffect, useRef, useCallback } from 'react'

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event & { error: string }) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

// Get SpeechRecognition constructor (with webkit prefix for Safari)
const getSpeechRecognition = (): (new () => SpeechRecognition) | null => {
  if (typeof window === 'undefined') return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any
  return win.SpeechRecognition || win.webkitSpeechRecognition || null
}

interface UseSpeechRecognitionOptions {
  onTranscript?: (transcript: string, isFinal: boolean) => void
  onError?: (error: string) => void
  continuous?: boolean
  language?: string
}

interface UseSpeechRecognitionReturn {
  isListening: boolean
  isSupported: boolean
  transcript: string
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const {
    onTranscript,
    onError,
    continuous = false,
    language = 'en-US',
  } = options

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(false)

  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Check support on mount
  useEffect(() => {
    const SpeechRecognitionClass = getSpeechRecognition()
    setIsSupported(!!SpeechRecognitionClass)
  }, [])

  const startListening = useCallback(() => {
    const SpeechRecognitionClass = getSpeechRecognition()
    if (!SpeechRecognitionClass) {
      onError?.('Speech recognition is not supported in this browser')
      return
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.abort()
    }

    const recognition = new SpeechRecognitionClass()
    recognitionRef.current = recognition

    recognition.continuous = continuous
    recognition.interimResults = true
    recognition.lang = language

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }

      const currentTranscript = finalTranscript || interimTranscript
      setTranscript(currentTranscript)
      onTranscript?.(currentTranscript, !!finalTranscript)
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)

      // Don't report "aborted" as an error (happens when we stop manually)
      if (event.error !== 'aborted') {
        onError?.(event.error)
      }

      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    try {
      recognition.start()
    } catch (error) {
      console.error('Failed to start speech recognition:', error)
      onError?.('Failed to start speech recognition')
      setIsListening(false)
    }
  }, [continuous, language, onError, onTranscript])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript('')
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  return {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
  }
}
