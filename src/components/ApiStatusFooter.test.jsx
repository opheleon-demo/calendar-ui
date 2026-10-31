// @vitest-environment jsdom
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ApiStatusFooter from './ApiStatusFooter';
import App from '../App';

const ok = () => new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
const deferred = () => {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
};
const flush = () => act(async () => {});
const advance = ms => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('API status footer', () => {
  it('starts Checking and requests the public health URL without caching', async () => {
    const request = deferred();
    fetch.mockReturnValue(request.promise);
    render(<ApiStatusFooter />);
    expect(screen.getByRole('status').textContent).toBe('API status: Checking');
    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/health', {
      signal: expect.any(AbortSignal), cache: 'no-store',
    });
    request.resolve(ok());
    await flush();
    expect(screen.getByRole('status').textContent).toBe('API status: Online');
  });

  it.each([
    ['network rejection', () => Promise.reject(new TypeError('Network failure'))],
    ['HTTP 503', () => Promise.resolve(new Response('{"status":"ok"}', { status: 503 }))],
    ['HTTP 201', () => Promise.resolve(new Response('{"status":"ok"}', { status: 201 }))],
    ['invalid JSON', () => Promise.resolve(new Response('not json'))],
    ['unexpected status', () => Promise.resolve(new Response('{"status":"down"}'))],
    ['missing status', () => Promise.resolve(new Response('{}'))],
    ['null body', () => Promise.resolve(new Response('null'))],
  ])('shows Offline for %s and recovers on the 30-second refresh', async (_, response) => {
    fetch.mockImplementationOnce(response).mockResolvedValueOnce(ok());
    render(<ApiStatusFooter />);
    await flush();
    expect(screen.getByRole('status').textContent).toBe('API status: Offline');
    await advance(29999);
    expect(fetch).toHaveBeenCalledTimes(1);
    await advance(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status').textContent).toBe('API status: Online');
    expect(vi.getTimerCount()).toBe(1);
  });

  it('aborts after five seconds, ignores late results, and checks again without overlap', async () => {
    const first = deferred();
    const second = deferred();
    fetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise).mockResolvedValue(ok());
    render(<ApiStatusFooter />);
    const firstSignal = fetch.mock.calls[0][1].signal;
    await advance(4999);
    expect(screen.getByRole('status').textContent).toBe('API status: Checking');
    expect(fetch).toHaveBeenCalledTimes(1);
    await advance(1);
    expect(firstSignal.aborted).toBe(true);
    expect(screen.getByRole('status').textContent).toBe('API status: Offline');
    await advance(25000);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][1].signal.aborted).toBe(false);
    first.resolve(ok());
    await flush();
    expect(screen.getByRole('status').textContent).toBe('API status: Offline');
    // The old request must not clear the new request's timeout.
    await advance(5000);
    expect(fetch.mock.calls[1][1].signal.aborted).toBe(true);
    second.resolve(ok());
    await flush();
    await advance(25000);
    expect(screen.getByRole('status').textContent).toBe('API status: Online');
  });

  it('times out even when response headers arrive but the JSON body stalls', async () => {
    const body = deferred();
    fetch.mockResolvedValue({ status: 200, json: () => body.promise });
    render(<ApiStatusFooter />);
    await flush();
    await advance(5000);
    expect(screen.getByRole('status').textContent).toBe('API status: Offline');
    body.resolve({ status: 'ok' });
    await flush();
    expect(screen.getByRole('status').textContent).toBe('API status: Offline');
  });

  it('cancels the request and all timers on unmount, ignoring a late response', async () => {
    const request = deferred();
    fetch.mockReturnValue(request.promise);
    const view = render(<ApiStatusFooter />);
    const signal = fetch.mock.calls[0][1].signal;
    view.unmount();
    expect(signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    request.resolve(ok());
    await flush();
    await advance(60000);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('cleans up the interval after a completed check and supports StrictMode remounts', async () => {
    const request = deferred();
    fetch.mockReturnValueOnce(request.promise).mockResolvedValue(ok());
    const view = render(<StrictMode><ApiStatusFooter /></StrictMode>);
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
    await flush();
    expect(screen.getByRole('status').textContent).toBe('API status: Online');
    request.resolve(new Response('{"status":"down"}'));
    await flush();
    expect(screen.getByRole('status').textContent).toBe('API status: Online');
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps calendar navigation and event creation usable during a health outage', async () => {
    fetch.mockImplementation(url => url.endsWith('/health')
      ? Promise.reject(new TypeError('Offline'))
      : Promise.resolve(new Response('[]')));
    render(<App />);
    await flush();
    expect(screen.getByRole('status').textContent).toBe('API status: Offline');
    const heading = screen.getByRole('heading').textContent;
    fireEvent.click(screen.getByRole('button', { name: '→' }));
    await flush();
    expect(screen.getByRole('heading').textContent).not.toBe(heading);
    fireEvent.click(document.querySelector('.time-slot'));
    expect(screen.getByRole('heading', { name: 'New Event' })).toBeTruthy();
    expect(fetch.mock.calls.filter(([url]) => url.endsWith('/health'))).toHaveLength(1);
  });
});
