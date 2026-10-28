import { useState } from 'react';
import * as api from '../api';
import { RECONNECT_TEXT } from '../zoom';

export default function ZoomSettings({ status, notice, onStatusChange, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleConnect() {
    setBusy(true);
    setError(null);
    try {
      window.location.assign(await api.startZoomAuthorization());
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    setBusy(true);
    setError(null);
    try {
      onStatusChange(await api.disconnectZoom());
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  let body;
  if (!status) {
    body = <p className="prompt-text">Checking Zoom connection&hellip;</p>;
  } else if (!status.configured && status.status === 'not_connected') {
    body = <p className="prompt-text">Zoom is not configured on this server.</p>;
  } else if (status.status === 'connected') {
    body = (
      <>
        <p className="zoom-status">
          <span className="status-dot status-ok" />
          Connected{status.zoom_email ? ` as ${status.zoom_email}` : ''}
        </p>
        <p className="prompt-text">
          Disconnecting removes access to your Zoom account. Your events and their saved Zoom links stay as they are.
        </p>
        <button className="btn btn-danger" onClick={handleDisconnect} disabled={busy}>
          Disconnect Zoom
        </button>
      </>
    );
  } else if (status.status === 'reconnect_required') {
    body = (
      <>
        <p className="notice notice-warning">{RECONNECT_TEXT}</p>
        <div className="zoom-actions">
          <button className="btn btn-primary" onClick={handleConnect} disabled={busy || !status.configured}>
            Reconnect Zoom
          </button>
          <button className="btn" onClick={handleDisconnect} disabled={busy}>
            Disconnect
          </button>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <p className="zoom-status">
          <span className="status-dot" />
          Not connected
        </p>
        <p className="prompt-text">
          Connect your own Zoom account to add Zoom meetings to your events.
        </p>
        <button className="btn btn-primary" onClick={handleConnect} disabled={busy}>
          Connect Zoom
        </button>
      </>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Zoom</h3>
        {notice && <p className={`notice notice-${notice.kind}`}>{notice.text}</p>}
        {error && <p className="notice notice-error">{error}</p>}
        {body}
        <div className="modal-actions">
          <div className="modal-actions-right">
            <button className="btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
