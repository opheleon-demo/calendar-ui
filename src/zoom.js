// Zoom connection messages and the redirect result the API's OAuth callback
// appends to the UI URL (?zoom=connected or ?zoom=error&zoom_reason=...).

export const ZOOM_REDIRECT_MESSAGES = {
  connected: { kind: 'success', text: 'Your Zoom account is connected.' },
  denied: {
    kind: 'error',
    text: 'The Zoom connection was not made because authorization was cancelled or denied.',
  },
  invalid_state: {
    kind: 'error',
    text: 'The Zoom connection was not made because the authorization link expired or was already used. Please try again.',
  },
  exchange_failed: {
    kind: 'error',
    text: 'The Zoom connection was not made because Zoom could not complete the authorization. Please try again.',
  },
};

export const RECONNECT_TEXT =
  'Your Zoom authorization expired or was revoked in Zoom. Reconnect to keep using Zoom.';

export function readZoomRedirect() {
  const params = new URLSearchParams(window.location.search);
  const result = params.get('zoom');
  if (!result) return null;
  const key = result === 'connected' ? 'connected' : params.get('zoom_reason');
  return ZOOM_REDIRECT_MESSAGES[key] || ZOOM_REDIRECT_MESSAGES.exchange_failed;
}

export function clearZoomRedirect() {
  const url = new URL(window.location.href);
  url.searchParams.delete('zoom');
  url.searchParams.delete('zoom_reason');
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
}
