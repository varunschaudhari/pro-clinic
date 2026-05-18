import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

export function UpdateToast() {
  const [needReload, setNeedReload] = useState(false);
  const [dismissed, setDismissed]   = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let firstController = navigator.serviceWorker.controller;

    const handleControllerChange = () => {
      // A new SW took over — only show toast if there was already a controller
      // (i.e. this isn't the very first install)
      if (firstController) {
        setNeedReload(true);
      }
      firstController = navigator.serviceWorker.controller;
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () =>
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
  }, []);

  if (!needReload || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-[calc(100vw-2rem)] max-w-sm print:hidden">
      <div className="flex items-center gap-3 rounded-xl bg-gray-900 px-4 py-3 shadow-2xl text-white">
        <RefreshCw className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Update available</p>
          <p className="text-xs text-gray-400">Reload to get the latest version.</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            Reload
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
