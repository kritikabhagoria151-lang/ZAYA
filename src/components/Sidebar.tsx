import React from 'react';
import {MessageSquare, Plus, Trash2, X} from 'lucide-react';
import type {Conversation} from '../types/chat';
import {PWAInstallButton} from './PWAInstallButton';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string;
  isOpenMobile: boolean;
  isOpenDesktop: boolean;
  onCloseMobile: () => void;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  isOpenMobile,
  isOpenDesktop,
  onCloseMobile,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
}) => {
  const sidebarBody = (
    <div className="flex h-full flex-col bg-[#131317] border-r border-white/[0.08]">
      <div className="flex h-14 items-center justify-between px-4 border-b border-white/[0.06] shrink-0">
        <span className="font-display text-sm font-semibold tracking-tight text-zinc-200">
          Chats
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onCloseMobile();
            }}
            aria-label="Start new chat"
            className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white/[0.07] px-3 py-1.5 text-xs font-medium text-white hover:bg-white/[0.12] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4 text-emerald-400" />
            <span>New Chat</span>
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close sidebar"
            className="lg:hidden flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto chat-scroll p-2.5 space-y-1">
        {conversations.map((conv) => {
          const isActive = conv.id === activeId;
          return (
            <div
              key={conv.id}
              className={`group flex items-center gap-1 rounded-xl transition-colors ${
                isActive ? 'bg-[#222229] text-white' : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  onSelectConversation(conv.id);
                  onCloseMobile();
                }}
                className="flex min-h-[44px] flex-1 min-w-0 items-center gap-2.5 px-3 py-2 text-left text-sm"
              >
                <MessageSquare
                  className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`}
                />
                <span className="truncate font-medium">{conv.title}</span>
              </button>
              {conversations.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conv.id);
                  }}
                  aria-label={`Delete ${conv.title}`}
                  className="mr-1 flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg text-zinc-500 opacity-70 lg:opacity-0 group-hover:opacity-100 hover:bg-white/10 hover:text-red-400 transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-white/[0.06] space-y-2 pb-safe">
        <PWAInstallButton variant="sidebar" />
        <p className="px-1 text-xs text-zinc-500">
          Voice language: Hindi / Hinglish (hi-IN)
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      {isOpenDesktop && (
        <aside className="hidden lg:block lg:w-72 lg:shrink-0 h-full">
          {sidebarBody}
        </aside>
      )}

      {/* Mobile slide-over drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/65 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-[82vw] max-w-[300px] h-full shadow-2xl">
            {sidebarBody}
          </aside>
        </div>
      )}
    </>
  );
};
