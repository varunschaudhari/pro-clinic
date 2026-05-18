import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

export function InstallPrompt() {
  const { canInstall, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-[calc(100vw-2rem)] max-w-sm print:hidden">
      <div className="flex items-center gap-3 rounded-xl bg-gray-900 px-4 py-3 shadow-2xl text-white">
        <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span className="font-bold text-sm">C</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Install ClinixIndia</p>
          <p className="text-xs text-gray-400 truncate">Add to home screen for quick access</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={install}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Install
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
