import React, {useState} from 'react';
import {Download, Share, PlusSquare, X} from 'lucide-react';
import {usePWAInstall} from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({variant = 'header'}) => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = () => {
    if (isInstallable) {
      void install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={isIOS ? 'Install on iPhone or iPad' : 'Install Zaya app'}
        className={
          variant === 'sidebar'
            ? 'flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20 focus-visible:outline-2 focus-visible:outline-emerald-400 whitespace-nowrap shrink-0'
            : 'flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/10 bg-[#1a1a20] px-3 py-2 text-xs font-medium text-[#f4f4f5] transition-colors hover:bg-[#24242d] focus-visible:outline-2 focus-visible:outline-emerald-400 whitespace-nowrap shrink-0'
        }
      >
        <Download className="h-4 w-4 text-emerald-400 shrink-0" />
        <span>{isIOS ? 'Install' : 'Install App'}</span>
      </button>

      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#18181e] p-6 text-[#f4f4f5] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <h3 id="ios-install-title" className="font-display text-lg font-semibold">
                Phone par Install Karein
              </h3>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                aria-label="Close install instructions"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
              Zaya ko apne iPhone ya iPad ke Home Screen par app ki tarah add karne ke liye:
            </p>
            <ol className="mt-4 space-y-3 text-sm text-zinc-200">
              <li className="flex items-start gap-3 rounded-xl bg-[#22222a] p-3">
                <Share className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Safari ke bottom bar mein <strong className="text-white">Share</strong> icon tap karein.
                </span>
              </li>
              <li className="flex items-start gap-3 rounded-xl bg-[#22222a] p-3">
                <PlusSquare className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Neeche scroll karein aur <strong className="text-white">Add to Home Screen</strong> par tap karein.
                </span>
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              Samajh Gaya
            </button>
          </div>
        </div>
      )}
    </>
  );
};
