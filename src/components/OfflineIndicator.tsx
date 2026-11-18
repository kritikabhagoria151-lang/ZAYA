import React from 'react';
import {WifiOff} from 'lucide-react';
import {useOnlineStatus} from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto mb-2 flex w-fit items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/80 px-3.5 py-2 text-xs font-medium text-amber-200 shadow-lg backdrop-blur-md"
    >
      <WifiOff className="h-3.5 w-3.5 text-amber-400 shrink-0" />
      <span>Internet offline hai — purani chats saved hain, naye reply ke liye connect karein.</span>
    </div>
  );
};
