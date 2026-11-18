import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Menu, PanelLeft, Plus, Volume2, VolumeX} from 'lucide-react';
import {ChatComposer} from './components/ChatComposer';
import {MessageBubble} from './components/MessageBubble';
import {OfflineIndicator} from './components/OfflineIndicator';
import {PWAInstallButton} from './components/PWAInstallButton';
import {Sidebar} from './components/Sidebar';
import {useSpeechRecognition} from './hooks/useSpeechRecognition';
import {useSpeechSynthesis} from './hooks/useSpeechSynthesis';
import type {ChatMessage, Conversation} from './types/chat';

const STORAGE_KEY = 'baatcheet_conversations_v1';

const STARTER_PROMPTS = [
  {
    title: 'Solve a Doubt',
    prompt: 'Photosynthesis kya hota hai? Step-by-step ek simple example ke saath samjhao.',
  },
  {
    title: 'Make Short Notes',
    prompt: "Newton's Laws of Motion ke short bullet-point notes bana do revision ke liye.",
  },
  {
    title: 'Start a Quiz',
    prompt: 'Mera Class 10 Science ka ek quick quiz lo — ek baar mein ek question poochna!',
  },
  {
    title: 'Learn in English',
    prompt: 'Explain quadratic equations in simple English with one easy solved example.',
  },
];

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createEmptyConversation(): Conversation {
  return {
    id: createId(),
    title: 'New Chat',
    messages: [],
    updatedAt: Date.now(),
  };
}

function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return [createEmptyConversation()];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [createEmptyConversation()];
    const parsed = JSON.parse(raw) as Conversation[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [createEmptyConversation()];
    }
    return parsed;
  } catch {
    return [createEmptyConversation()];
  }
}

function deriveTitle(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= 34) return clean;
  return `${clean.slice(0, 34).trim()}…`;
}

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeId, setActiveId] = useState<string>(() => conversations[0]?.id ?? '');
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollBottomRef = useRef<HTMLDivElement | null>(null);

  const {
    isSupported: ttsSupported,
    speakerEnabled,
    isSpeaking,
    speakingMessageId,
    toggleSpeaker,
    speak,
    stopSpeaking,
  } = useSpeechSynthesis();

  const {
    isSupported: sttSupported,
    isListening,
    interimTranscript,
    error: speechError,
    clearError: clearSpeechError,
    startListening,
    stopListening,
  } = useSpeechRecognition();

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeId) ?? conversations[0];
  }, [conversations, activeId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch {
      // Ignore storage quota errors
    }
  }, [conversations]);

  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({behavior: 'smooth', block: 'end'});
  }, [activeConversation?.messages.length, activeConversation?.messages[activeConversation.messages.length - 1]?.content]);

  const handleStopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsGenerating(false);
    setStreamingMsgId(null);
  }, []);

  const sendMessage = useCallback(
    async (overrideText?: string) => {
      const textToSend = (overrideText ?? inputText).trim();
      if (!textToSend || isGenerating || !activeConversation) return;

      stopSpeaking();
      if (!overrideText) {
        setInputText('');
      }

      const targetConvId = activeConversation.id;
      const userMsg: ChatMessage = {
        id: createId(),
        role: 'user',
        content: textToSend,
        createdAt: Date.now(),
      };
      const assistantMsgId = createId();
      const assistantPlaceholder: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        createdAt: Date.now() + 1,
      };

      const historyPayload = [
        ...activeConversation.messages
          .filter((m) => !m.isError && m.content.trim().length > 0)
          .map((m) => ({role: m.role, content: m.content})),
        {role: 'user' as const, content: textToSend},
      ];

      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== targetConvId) return conv;
          const nextTitle = conv.messages.length === 0 ? deriveTitle(textToSend) : conv.title;
          return {
            ...conv,
            title: nextTitle,
            updatedAt: Date.now(),
            messages: [...conv.messages, userMsg, assistantPlaceholder],
          };
        }),
      );

      setIsGenerating(true);
      setStreamingMsgId(assistantMsgId);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      let accumulatedReply = '';
      let hadError = false;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({messages: historyPayload}),
          signal: controller.signal,
        });

        if (!response.ok) {
          let errMsg = 'Server se jawaab nahi mil paaya.';
          try {
            const errJson = (await response.json()) as {error?: string};
            if (errJson.error) errMsg = errJson.error;
          } catch {
            // Keep default message
          }
          throw new Error(errMsg);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Response stream available nahi hai.');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const {value, done} = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, {stream: true});
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const evt of events) {
            const line = evt.trim();
            if (!line.startsWith('data:')) continue;
            const jsonStr = line.slice(5).trim();
            if (!jsonStr) continue;

            try {
              const payload = JSON.parse(jsonStr) as {
                text?: string;
                done?: boolean;
                error?: string;
              };

              if (payload.error) {
                throw new Error(payload.error);
              }

              if (payload.text) {
                accumulatedReply += payload.text;
                const snapshot = accumulatedReply;
                setConversations((prev) =>
                  prev.map((conv) => {
                    if (conv.id !== targetConvId) return conv;
                    return {
                      ...conv,
                      updatedAt: Date.now(),
                      messages: conv.messages.map((m) =>
                        m.id === assistantMsgId ? {...m, content: snapshot} : m,
                      ),
                    };
                  }),
                );
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message !== 'Unexpected end of JSON input') {
                throw parseErr;
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          // User stopped generation; keep partial reply if any
        } else {
          hadError = true;
          const errMessage =
            err instanceof Error
              ? err.message
              : 'Network error aa gaya. Please internet check karke dobara try karein.';
          setConversations((prev) =>
            prev.map((conv) => {
              if (conv.id !== targetConvId) return conv;
              return {
                ...conv,
                messages: conv.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: accumulatedReply
                          ? `${accumulatedReply}\n\n(${errMessage})`
                          : errMessage,
                        isError: !accumulatedReply,
                      }
                    : m,
                ),
              };
            }),
          );
        }
      } finally {
        abortControllerRef.current = null;
        setIsGenerating(false);
        setStreamingMsgId(null);

        if (!hadError && accumulatedReply.trim().length > 0 && speakerEnabled && ttsSupported) {
          speak(accumulatedReply, assistantMsgId);
        }
      }
    },
    [activeConversation, inputText, isGenerating, speak, speakerEnabled, stopSpeaking, ttsSupported],
  );

  const handleToggleMic = useCallback(() => {
    if (isListening) {
      stopListening(false);
      return;
    }
    stopSpeaking();
    startListening((spokenText) => {
      void sendMessage(spokenText);
    });
  }, [isListening, sendMessage, startListening, stopListening, stopSpeaking]);

  const handleCancelMic = useCallback(() => {
    stopListening(true);
  }, [stopListening]);

  const handleNewChat = useCallback(() => {
    handleStopGeneration();
    stopSpeaking();
    const existingEmpty = conversations.find((c) => c.messages.length === 0);
    if (existingEmpty) {
      setActiveId(existingEmpty.id);
      return;
    }
    const created = createEmptyConversation();
    setConversations((prev) => [created, ...prev]);
    setActiveId(created.id);
  }, [conversations, handleStopGeneration, stopSpeaking]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      if (id === activeId) return;
      handleStopGeneration();
      stopSpeaking();
      setActiveId(id);
    },
    [activeId, handleStopGeneration, stopSpeaking],
  );

  const handleDeleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== id);
        if (filtered.length === 0) {
          const fallback = createEmptyConversation();
          setActiveId(fallback.id);
          return [fallback];
        }
        if (id === activeId) {
          setActiveId(filtered[0].id);
        }
        return filtered;
      });
    },
    [activeId],
  );

  const messages = activeConversation?.messages ?? [];

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#0f0f12] text-[#f4f4f5]">
      <Sidebar
        conversations={conversations}
        activeId={activeConversation?.id ?? ''}
        isOpenMobile={isMobileSidebarOpen}
        isOpenDesktop={isDesktopSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
      />

      <div className="flex min-w-0 flex-1 flex-col h-full">
        {/* Compact sticky top bar (56px height) */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/[0.07] bg-[#0f0f12]/90 px-3 backdrop-blur-md sm:px-5 pt-safe">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              aria-label="Open chat history"
              className="lg:hidden flex h-11 w-11 items-center justify-center rounded-xl text-zinc-300 hover:bg-white/[0.07] hover:text-white transition-colors shrink-0"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setIsDesktopSidebarOpen((v) => !v)}
              aria-label={isDesktopSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              className="hidden lg:flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/[0.07] hover:text-white transition-colors shrink-0"
            >
              <PanelLeft className="h-5 w-5" />
            </button>

            <span className="font-display text-base sm:text-lg font-semibold tracking-tight text-white whitespace-nowrap shrink-0">
              Zaya
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <PWAInstallButton variant="header" />

            {ttsSupported && (
              <button
                type="button"
                onClick={toggleSpeaker}
                aria-pressed={speakerEnabled}
                aria-label={speakerEnabled ? 'Mute AI voice replies' : 'Turn on AI voice replies'}
                className={`flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-emerald-400 ${
                  speakerEnabled
                    ? 'border-emerald-500/35 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                    : 'border-white/10 bg-[#1a1a20] text-zinc-400 hover:bg-[#24242d] hover:text-zinc-200'
                }`}
              >
                {speakerEnabled ? (
                  <Volume2 className={`h-4 w-4 shrink-0 ${isSpeaking ? 'animate-pulse text-emerald-300' : ''}`} />
                ) : (
                  <VolumeX className="h-4 w-4 shrink-0" />
                )}
                <span className="sm:hidden">{speakerEnabled ? 'On' : 'Off'}</span>
                <span className="hidden sm:inline">
                  {speakerEnabled ? 'Speaker On' : 'Speaker Off'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNewChat}
              aria-label="New chat"
              title="New Chat"
              className="lg:hidden flex h-11 w-11 items-center justify-center rounded-xl text-zinc-300 hover:bg-white/[0.07] hover:text-white transition-colors shrink-0"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Scrollable message feed */}
        <main className="flex-1 overflow-y-auto chat-scroll px-3 py-5 sm:px-6">
          <div className="mx-auto flex w-full max-w-3xl flex-col">
            <OfflineIndicator />

            {messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-10 sm:py-16 text-center">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#18181f] shadow-lg">
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="4" y="8" width="2.5" height="8" rx="1.25" fill="#10a37f" />
                    <rect x="9" y="4" width="2.5" height="16" rx="1.25" fill="#f4f4f5" />
                    <rect x="14" y="6" width="2.5" height="12" rx="1.25" fill="#10a37f" />
                    <rect x="19" y="9" width="2.5" height="6" rx="1.25" fill="#f4f4f5" />
                  </svg>
                </div>

                <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white max-w-md text-balance">
                  Namaste! Main Zaya hoon — aapka Student Saathi.
                </h1>
                <p className="mt-2.5 max-w-md text-sm sm:text-[15px] leading-relaxed text-zinc-400">
                  Doubts poochiye, short notes banwaiye, ya quiz kheliye — Hindi, English ya Hinglish mein.
                </p>

                <div className="mt-8 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 text-left">
                  {STARTER_PROMPTS.map((item) => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => void sendMessage(item.prompt)}
                      className="group flex min-h-[64px] flex-col justify-center rounded-2xl border border-white/[0.08] bg-[#16161b] px-4 py-3.5 transition-colors hover:border-white/20 hover:bg-[#1e1e25] focus-visible:outline-2 focus-visible:outline-emerald-400"
                    >
                      <span className="text-sm font-medium text-white group-hover:text-emerald-300 transition-colors">
                        {item.title}
                      </span>
                      <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">
                        {item.prompt}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6 pb-4">
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isStreaming={isGenerating && streamingMsgId === msg.id}
                    isCurrentlySpeaking={isSpeaking && speakingMessageId === msg.id}
                    ttsSupported={ttsSupported}
                    onSpeak={speak}
                    onStopSpeaking={stopSpeaking}
                  />
                ))}
                <div ref={scrollBottomRef} className="h-2" />
              </div>
            )}
          </div>
        </main>

        {/* Bottom thumb-zone composer */}
        <ChatComposer
          value={inputText}
          onChange={setInputText}
          onSend={() => void sendMessage()}
          onStopGeneration={handleStopGeneration}
          isGenerating={isGenerating}
          isListening={isListening}
          speechSupported={sttSupported}
          interimTranscript={interimTranscript}
          speechError={speechError}
          onClearSpeechError={clearSpeechError}
          onToggleMic={handleToggleMic}
          onCancelMic={handleCancelMic}
        />
      </div>
    </div>
  );
}
