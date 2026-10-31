import { useEffect, useState } from 'react';
import { fetchHealth } from '../api';

export default function ApiStatusFooter() {
  const [status, setStatus] = useState('Checking');

  useEffect(() => {
    let disposed = false;
    let pending = null;
    let timeout;

    async function check() {
      if (pending || disposed) return;
      const controller = new AbortController();
      pending = controller;
      timeout = setTimeout(() => {
        controller.abort();
        pending = null;
        if (!disposed) setStatus('Offline');
      }, 5000);

      try {
        await fetchHealth(controller.signal);
        if (!disposed && !controller.signal.aborted) setStatus('Online');
      } catch {
        if (!disposed && !controller.signal.aborted) setStatus('Offline');
      } finally {
        // A cancelled request may settle after a later check has started.
        if (pending === controller) {
          clearTimeout(timeout);
          pending = null;
        }
      }
    }

    check();
    const interval = setInterval(check, 30000);
    return () => {
      disposed = true;
      clearInterval(interval);
      clearTimeout(timeout);
      pending?.abort();
    };
  }, []);

  return (
    <footer className="api-status-footer">
      <span role="status" aria-live="polite" aria-atomic="true">API status: {status}</span>
    </footer>
  );
}
