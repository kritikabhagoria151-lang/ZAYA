import {useCallback, useEffect, useRef, useState} from 'react';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition() {
  const [isSupported] = useState(() => getSpeechRecognitionCtor() !== null);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const manualCancelRef = useRef(false);
  const onCompleteRef = useRef<((transcript: string) => void) | null>(null);

  const stopListening = useCallback((cancel = false) => {
    manualCancelRef.current = cancel;
    if (recognitionRef.current) {
      try {
        if (cancel) {
          recognitionRef.current.abort();
        } else {
          recognitionRef.current.stop();
        }
      } catch {
        // Ignore already-stopped recognition errors
      }
    }
    if (cancel) {
      setIsListening(false);
      setInterimTranscript('');
      finalTranscriptRef.current = '';
      interimTranscriptRef.current = '';
    }
  }, []);

  const startListening = useCallback(
    (onFinalTranscript: (transcript: string) => void) => {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) {
        setError('Aapke browser mein voice typing supported nahi hai. Chrome ya Safari try karein.');
        return;
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }

      setError(null);
      setInterimTranscript('');
      finalTranscriptRef.current = '';
      interimTranscriptRef.current = '';
      manualCancelRef.current = false;
      onCompleteRef.current = onFinalTranscript;

      const recognition = new Ctor();
      recognition.lang = 'hi-IN';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let finalText = '';
        let interimText = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0]?.transcript ?? '';
          if (result.isFinal) {
            finalText += `${text} `;
          } else {
            interimText += text;
          }
        }

        finalTranscriptRef.current = finalText.trim();
        interimTranscriptRef.current = interimText.trim();
        const combined = [finalTranscriptRef.current, interimTranscriptRef.current]
          .filter(Boolean)
          .join(' ')
          .trim();
        setInterimTranscript(combined);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        if (event.error === 'aborted' && manualCancelRef.current) {
          return;
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError('Microphone permission denied hai. Browser settings mein mic allow karein.');
        } else if (event.error === 'no-speech') {
          setError('Koi awaaz sunai nahi di. Dobara mic dabakar boliye.');
        } else if (event.error === 'network') {
          setError('Voice recognition ke liye internet connection zaroori hai.');
        } else {
          setError('Voice samajhne mein thodi problem aayi. Dobara try karein.');
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        const captured = (finalTranscriptRef.current || interimTranscriptRef.current).trim();
        setInterimTranscript('');
        finalTranscriptRef.current = '';
        interimTranscriptRef.current = '';

        if (!manualCancelRef.current && captured.length > 0 && onCompleteRef.current) {
          onCompleteRef.current(captured);
        }
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        setError('Mic start nahi ho paaya. Ek second baad dobara try karein.');
        setIsListening(false);
      }
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    isSupported,
    isListening,
    interimTranscript,
    error,
    clearError,
    startListening,
    stopListening,
  };
}
