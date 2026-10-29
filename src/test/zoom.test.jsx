import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventModal from '../components/EventModal';
import App from '../App';
import * as api from '../api';
import { draftKey, readDraft } from '../draft';

const response = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data });

beforeEach(() => { sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function modal(props = {}) {
  return render(<EventModal username="alice" slotTime={new Date(2026, 2, 1, 9)}
    zoomConnected onConnectZoom={vi.fn()} onClose={vi.fn()} onSave={vi.fn()} {...props} />);
}

describe('authenticated API requests', () => {
  it('uses bearer auth and stable creation identity and throws actionable HTTP errors', async () => {
    api.setSession({ username: 'alice', access_token: 'session-token' });
    const fetch = vi.fn().mockResolvedValue(response(409, { detail: { code: 'zoom_connection_required', message: 'Connect Zoom first' } }));
    vi.stubGlobal('fetch', fetch);
    await expect(api.createEvent({ title: 'draft' }, 'stable-key')).rejects.toMatchObject({ code: 'zoom_connection_required', message: 'Connect Zoom first' });
    expect(fetch.mock.calls[0][1].headers).toMatchObject({ Authorization: 'Bearer session-token', 'Idempotency-Key': 'stable-key' });
    expect(fetch.mock.calls[0][1].credentials).toBe('include');
  });

  it('expires the calendar session on 401 without deleting organizer drafts', async () => {
    api.setSession({ username: 'alice', access_token: 'expired' });
    sessionStorage.setItem(draftKey('alice'), JSON.stringify({ title: 'keep me' }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(401, { detail: 'Invalid authentication credentials' })));
    await expect(api.fetchEvents('2026-01-01', '2026-01-08')).rejects.toThrow('Invalid authentication');
    expect(api.getSession()).toBeNull();
    expect(readDraft('alice').title).toBe('keep me');
  });
});

describe('event drafts', () => {
  it('blocks creation until Zoom is connected and offers recovery', () => {
    const onConnectZoom = vi.fn();
    modal({ zoomConnected: false, onConnectZoom });
    expect(screen.getByRole('button', { name: 'Create' }).disabled).toBe(true);
    fireEvent.click(screen.getByText('Connect / reconnect Zoom'));
    expect(onConnectZoom).toHaveBeenCalledOnce();
  });

  it('preserves values and request identity through failed save and remount', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error('Retry this same draft'));
    const view = modal({ onSave });
    await user.type(screen.getByLabelText('Title'), 'Planning');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Retry this same draft');
    const identity = onSave.mock.calls[0][1];
    expect(screen.getByLabelText('Title').matches(':disabled')).toBe(true);
    view.unmount();
    const retry = vi.fn().mockResolvedValue({});
    modal({ onSave: retry });
    expect(screen.getByLabelText('Title').value).toBe('Planning');
    await user.click(screen.getByRole('button', { name: 'Retry creation' }));
    expect(retry.mock.calls[0][1]).toBe(identity);
    expect(retry.mock.calls[0][0].title).toBe('Planning');
    await waitFor(() => expect(readDraft('alice')).toBeNull());
  });

  it('keeps draft editable on invalid schedules and limits recurring series explicitly', async () => {
    const user = userEvent.setup();
    modal({ onSave: vi.fn().mockRejectedValue(Object.assign(new Error('Invalid duration'), { code: 'invalid_schedule' })) });
    await user.type(screen.getByLabelText('Title'), 'Daily planning');
    await user.selectOptions(screen.getByLabelText('Repeat'), 'DAILY');
    expect(screen.getByLabelText('Number of occurrences (1–60)').value).toBe('10');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await screen.findByText('Invalid duration');
    expect(screen.getByLabelText('Title').matches(':disabled')).toBe(false);
  });

  it('never requires a new connection when editing an existing event', () => {
    modal({ event: { id: 5, title: 'Existing', start: '2026-03-01T09:00:00Z', end: '2026-03-01T10:00:00Z', zoom_join_url: 'https://zoom.us/j/100' }, zoomConnected: false });
    expect(screen.getByRole('button', { name: 'Save' }).disabled).toBe(false);
    expect(screen.getByRole('link', { name: 'Join Zoom meeting' }).getAttribute('href')).toBe('https://zoom.us/j/100');
  });
});

describe('calendar session and OAuth UI', () => {
  it('logs in using the calendar JSON endpoint and loads authenticated events', async () => {
    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async (url, options) => {
      calls.push([url, options]);
      if (url.endsWith('/auth/login')) return response(200, { access_token: 'new-token', expires_in: 3600 });
      if (url.endsWith('/zoom/connection')) return response(200, { connected: false });
      return response(200, []);
    }));
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Username'), 'alice');
    await user.type(screen.getByLabelText('Password'), 'test-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByText('Signed in as alice');
    await waitFor(() => expect(calls.some(([url]) => url.includes('/events?'))).toBe(true));
    expect(calls.find(([url]) => url.includes('/events?'))[1].headers.Authorization).toBe('Bearer new-token');
  });

  it('shows denied authorization and ignores messages from an untrusted origin', async () => {
    api.setSession({ username: 'alice', access_token: 'new-token' });
    const popup = { location: { href: '' }, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(popup);
    vi.stubGlobal('fetch', vi.fn(async url => {
      if (url.endsWith('/zoom/connect')) return response(200, { url: 'https://zoom.us/oauth/authorize?state=opaque' });
      if (url.endsWith('/zoom/connection')) return response(200, { connected: false });
      return response(200, []);
    }));
    render(<App />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Connect Zoom' }));
    await waitFor(() => expect(popup.location.href).toContain('zoom.us/oauth/authorize'));
    act(() => window.dispatchEvent(new MessageEvent('message', { origin: 'https://untrusted.example', source: popup, data: { type: 'calendar-zoom', status: 'denied' } })));
    expect(screen.queryByText(/Zoom authorization was denied/)).toBeNull();
    act(() => window.dispatchEvent(new MessageEvent('message', { origin: new URL(api.BASE).origin, source: popup, data: { type: 'calendar-zoom', status: 'denied' } })));
    expect(await screen.findByText(/Zoom authorization was denied/)).toBeTruthy();
  });
  it('creates through the calendar form and retries a timeout with unchanged payload and identity', async () => {
    api.setSession({ username: 'alice', access_token: 'new-token' });
    const submissions = [];
    vi.stubGlobal('fetch', vi.fn(async (url, options) => {
      if (url.endsWith('/zoom/connection')) return response(200, { connected: true, zoom_user_id: 'host-a' });
      if (url.endsWith('/events') && options.method === 'POST') {
        submissions.push(options);
        if (submissions.length === 1) return response(503, { detail: { code: 'zoom_outcome_uncertain', message: 'Retry this same draft to reconcile' } });
        return response(200, { event: { id: 1, zoom_meeting_id: '100' }, conflicts: [] });
      }
      return response(200, []);
    }));
    const user = userEvent.setup();
    const view = render(<App />);
    await screen.findByText('Zoom connected (host-a)');
    fireEvent.click(view.container.querySelector('.time-slot'));
    await user.type(screen.getByLabelText('Title'), 'Team meeting');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await screen.findByText('Retry this same draft to reconcile');
    expect(screen.getByLabelText('Title').value).toBe('Team meeting');
    await user.click(screen.getByRole('button', { name: 'Retry creation' }));
    await waitFor(() => expect(screen.queryByText('New Event')).toBeNull());
    expect(submissions).toHaveLength(2);
    expect(submissions[0].body).toBe(submissions[1].body);
    expect(submissions[0].headers['Idempotency-Key']).toBe(submissions[1].headers['Idempotency-Key']);
    expect(JSON.parse(submissions[0].body)).toMatchObject({ title: 'Team meeting', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    expect(readDraft('alice')).toBeNull();
  });

});
