import React, {useEffect, useRef} from 'react';
import {ArrowUp, Mic, MicOff, Square, X} from 'lucide-react';

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (text?: string) => void;
  onStopGeneration: () => void;
  isGenerating: boolean;
  isListening: boolean;
  speechSupported: boolean;
  interimTranscript: string;
  speechError: string | null;
  onClearSpeechError: () => void;
  onToggleMic: () => void;
  onCancelMic: () => void;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  value,
  onChange,
  onSend,
  onStopGeneration,
  isGenerating,
  isListening,
  speechSupported,
  interimTranscript,
  speechError,
  onClearSpeechError,
  onToggleMic,
  onCancelMic,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 136)}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isGenerating) {
        onSend();
      }
    }
  };

  const canSend = value.trim().length > 0 && !isGenerating && !isListening;

  return (
    <div className="shrink-0 bg-gradient-to-t from-[#0f0f12] via-[#0f0f12]/95 to-transparent px-3 pt-2 pb-safe sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        {speechError && (
          <div
            role="alert"
            className="mb-2 flex items-center justify-between gap-2 rounded-2xl border border-red-500/30 bg-red-950/60 px-3.5 py-2 text-xs text-red-200"
          >
            <span>{speechError}</span>
            <button
              type="button"
              onClick={onClearSpeechError}
              aria-label="Dismiss microphone error"
              className="flex min-h-[28px] min-w-[28px] items-center justify-center rounded-lg text-red-300 hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {isListening && (
          <div
            role="status"
            aria-live="polite"
            className="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-[#16221e] px-4 py-2.5 text-sm text-emerald-100 shadow-lg"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400 animate-pulse" />
              <span className="truncate">
                {interimTranscript || 'Sun raha hoon... Hindi ya Hinglish mein boliye'}
              </span>
            </div>
            <button
              type="button"
              onClick={onCancelMic}
              className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-emerald-200 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex items-end gap-1.5 rounded-3xl border border-white/10 bg-[#1a1a20] p-1.5 shadow-lg focus-within:border-white/20 transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isListening}
            placeholder={isListening ? 'Bolne ke baad auto-send hoga...' : 'Kuch bhi poochiye...'}
            aria-label="Message input"
            className="max-h-[136px] min-h-[44px] flex-1 resize-none bg-transparent px-3.5 py-2.5 text-[15px] leading-snug text-[#f4f4f5] placeholder:text-zinc-500 focus:outline-none disabled:opacity-60"
          />

          <div className="flex items-center gap-1 shrink-0 pb-0.5 pr-0.5">
            {speechSupported && (
              <button
                type="button"
                onClick={onToggleMic}
                disabled={isGenerating}
                aria-label={isListening ? 'Stop voice recording and send' : 'Start voice input in Hindi/Hinglish'}
                title={isListening ? 'Tap to finish & send' : 'Bol kar bhejein (hi-IN)'}
                className={`flex h-11 w-11 items-center justify-center rounded-full transition-all focus-visible:outline-2 focus-visible:outline-emerald-400 disabled:opacity-40 ${
                  isListening
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/25 scale-105'
                    : 'bg-white/[0.07] text-zinc-200 hover:bg-white/[0.14] hover:text-white'
                }`}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            )}

            {isGenerating ? (
              <button
                type="button"
                onClick={onStopGeneration}
                aria-label="Stop AI response"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#0f0f12] transition-transform active:scale-95 hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-emerald-400"
              >
                <Square className="h-4 w-4 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSend()}
                disabled={!canSend}
                aria-label="Send message"
                className={`flex h-11 w-11 items-center justify-center rounded-full transition-all focus-visible:outline-2 focus-visible:outline-emerald-400 ${
                  canSend
                    ? 'bg-emerald-500 text-[#07130f] hover:bg-emerald-400 active:scale-95'
                    : 'bg-white/[0.06] text-zinc-600 cursor-not-allowed'
                }`}
              >
                <ArrowUp className="h-5 w-5 stroke-[2.25]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
