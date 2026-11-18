import {useCallback, useEffect, useRef, useState} from 'react';

const SPEAKER_STORAGE_KEY = 'baatcheet_speaker_enabled';

function cleanTextForSpeech(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' code snippet ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitIntoChunks(text: string, maxLen = 190): string[] {
  if (text.length <= maxLen) return [text];
  const sentences = text.match(/[^.!?।]+[.!?।]*\s*/g) ?? [text];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    if ((current + ' ' + trimmed).trim().length <= maxLen) {
      current = (current + ' ' + trimmed).trim();
    } else {
      if (current) chunks.push(current);
      if (trimmed.length <= maxLen) {
        current = trimmed;
      } else {
        const words = trimmed.split(/\s+/);
        let wordBuf = '';
        for (const w of words) {
          if ((wordBuf + ' ' + w).trim().length <= maxLen) {
            wordBuf = (wordBuf + ' ' + w).trim();
          } else {
            if (wordBuf) chunks.push(wordBuf);
            wordBuf = w;
          }
        }
        current = wordBuf;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function pickBestVoice(voices: SpeechSynthesisVoice[], text: string): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  const preferredLangs = hasDevanagari
    ? ['hi-IN', 'hi_IN', 'en-IN', 'en_IN', 'en-GB', 'en-US']
    : ['en-IN', 'hi-IN', 'en_IN', 'hi_IN', 'en-GB', 'en-US'];
  for (const lang of preferredLangs) {
    const match = voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase());
    if (match) return match;
  }
  const indianVoice = voices.find((v) => /india|hindi|hinglish/i.test(v.name));
  if (indianVoice) return indianVoice;
  return voices.find((v) => v.lang.startsWith('en')) ?? voices[0];
}

export function useSpeechSynthesis() {
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [speakerEnabled, setSpeakerEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = window.localStorage.getItem(SPEAKER_STORAGE_KEY);
    return saved === null ? true : saved === 'true';
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const playbackSessionRef = useRef(0);

  useEffect(() => {
    if (!isSupported) return;
    const updateVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    updateVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', updateVoices);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', updateVoices);
    };
  }, [isSupported]);

  const stopSpeaking = useCallback(() => {
    playbackSessionRef.current += 1;
    if (isSupported) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingMessageId(null);
  }, [isSupported]);

  const speak = useCallback(
    (rawText: string, messageId?: string) => {
      if (!isSupported) return;
      const cleaned = cleanTextForSpeech(rawText);
      if (!cleaned) return;

      window.speechSynthesis.cancel();
      const sessionId = playbackSessionRef.current + 1;
      playbackSessionRef.current = sessionId;

      const chunks = splitIntoChunks(cleaned);
      const voice = pickBestVoice(voicesRef.current, cleaned);
      const defaultLang = /[\u0900-\u097F]/.test(cleaned) ? 'hi-IN' : 'en-IN';

      setIsSpeaking(true);
      setSpeakingMessageId(messageId ?? null);

      const speakChunk = (index: number) => {
        if (playbackSessionRef.current !== sessionId) return;
        if (index >= chunks.length) {
          setIsSpeaking(false);
          setSpeakingMessageId(null);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(chunks[index]);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang;
        } else {
          utterance.lang = defaultLang;
        }
        utterance.rate = 1.02;
        utterance.pitch = 1.0;

        utterance.onend = () => {
          speakChunk(index + 1);
        };
        utterance.onerror = () => {
          if (playbackSessionRef.current === sessionId) {
            setIsSpeaking(false);
            setSpeakingMessageId(null);
          }
        };

        window.speechSynthesis.speak(utterance);
      };

      speakChunk(0);
    },
    [isSupported],
  );

  const toggleSpeaker = useCallback(() => {
    setSpeakerEnabled((prev) => {
      const next = !prev;
      window.localStorage.setItem(SPEAKER_STORAGE_KEY, String(next));
      if (!next) {
        stopSpeaking();
      }
      return next;
    });
  }, [stopSpeaking]);

  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  return {
    isSupported,
    speakerEnabled,
    isSpeaking,
    speakingMessageId,
    toggleSpeaker,
    speak,
    stopSpeaking,
  };
}
