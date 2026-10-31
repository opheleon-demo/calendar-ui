# Calendar UI

Simple React weekly calendar that connects to the calendar-api backend.

## Quick Start

```bash
npm install
npm run dev
# → http://localhost:5173
```

Requires the backend running on http://localhost:8000.

## Features

- Weekly calendar view (Mon-Sun, 7am-9pm)
- Click empty slot to create event (with optional recurrence)
- Click event to edit/delete
- Drag and drop to reschedule
- Recurring event edits prompt: "This event only / This and future / All events"
- Color coding: blue = single events, purple = recurring events
- Conflict detection alerts on creation

## API availability footer

The footer shows `API status: Checking` until the first health request finishes.
It requests `/health` using the same backend address as event requests in
`src/api.js`, immediately on mount and every 30 seconds. Only HTTP 200 with parsed
JSON containing `status: "ok"` shows `Online`. Network errors, other HTTP status
codes, invalid or unexpected JSON, and a five-second timeout show `Offline`.
The timeout includes reading the response body. A later successful check restores
`Online` automatically; refreshes retain the previous status while checking.

Health requests are independent of event loading and do not disable calendar
controls. Requests bypass the browser cache, never overlap active checks, and are
aborted on timeout or unmount. Unmount also clears timers; late cancelled responses
cannot change the status. The footer uses explicit text and a polite live region,
with wrapping and normal document flow for narrow screens.

## Local checks

```bash
npm ci --ignore-scripts
npm test
npm run lint
npm run build
```

Component tests use controlled timers for failures, recovery, refresh, timeout,
unmount cleanup, and StrictMode, and exercise calendar navigation and the event
modal during health failure. For a manual integration check, start the API at
`http://localhost:8000` and this app at `http://localhost:5173`; confirm `Online`,
stop the API to observe `Offline` on the next refresh, then restart it to observe
recovery. Check the footer at desktop and 320px widths.
