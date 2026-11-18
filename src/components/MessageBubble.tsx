import React, {useState} from 'react';
import {Check, Copy, Square, Volume2} from 'lucide-react';
import type {ChatMessage} from '../types/chat';
import {MarkdownText} from './MarkdownText';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  isCurrentlySpeaking?: boolean;
  ttsSupported?: boolean;
  onSpeak?: (text: string, messageId: string) => void;
  onStopSpeaking?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isStreaming = false,
  isCurrentlySpeaking = false,
  ttsSupported = false,
  onSpeak,
  onStopSpeaking,
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  if (isUser) {
    return (
      <div className="flex w-full justify-end">
        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-sm bg-[#25252e] px-4 py-3 text-[15px] leading-[1.55] text-[#f4f4f5] shadow-sm border border-white/[0.06] whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full items-start gap-3 sm:gap-3.5 justify-start">
      {/* Minimal Zaya soundwave brand mark */}
      <div
        aria-hidden="true"
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#18181f]"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="8" width="2.5" height="8" rx="1.25" fill="#10a37f" />
          <rect x="9" y="4" width="2.5" height="16" rx="1.25" fill="#f4f4f5" />
          <rect x="14" y="6" width="2.5" height="12" rx="1.25" fill="#10a37f" />
          <rect x="19" y="9" width="2.5" height="6" rx="1.25" fill="#f4f4f5" />
        </svg>
      </div>

      <div className="min-w-0 flex-1 max-w-[90%] sm:max-w-[82%]">
        {message.isError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200 leading-relaxed">
            {message.content}
          </div>
        ) : message.content.length === 0 && isStreaming ? (
          <div className="flex items-center gap-1.5 py-2.5" aria-label="AI soch raha hai">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.3s]" />
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.15s]" />
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" />
          </div>
        ) : (
          <MarkdownText content={message.content} />
        )}

        {!isStreaming && !message.isError && message.content.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1">
            {ttsSupported && onSpeak && onStopSpeaking && (
              <button
                type="button"
                onClick={() =>
                  isCurrentlySpeaking ? onStopSpeaking() : onSpeak(message.content, message.id)
                }
                aria-label={isCurrentlySpeaking ? 'Stop reading aloud' : 'Read reply aloud'}
                className={`flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isCurrentlySpeaking
                    ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                }`}
              >
                {isCurrentlySpeaking ? (
                  <>
                    <Square className="h-3.5 w-3.5 fill-current" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>Suno</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy reply"
              className="flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200 whitespace-nowrap shrink-0"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
