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
- Help link in the footer opens `/help`, with brief calendar guidance and a link back
- Help and footer links support keyboard navigation with visible focus indicators

## Help page and hosting

`/help` (also `/help/`) renders a separate help view without fetching calendar events.
The footer stays in normal document flow below the calendar so it does not cover
time slots or event controls. Help text wraps to fit narrow screens.

Run `npm run build` and publish the entire `dist/` directory. The build includes
both `index.html` and `help/index.html`, sharing the same application assets.
Configure the static host to serve directory index files, including resolving
`/help` to `/help/index.html` (a redirect to `/help/` is also supported). This lets
direct visits and refreshes work without requiring an SPA fallback. No production
host configuration is tracked in this repository.

For local validation, run `npm run lint`, `npm run build`, and `npm run preview`.
Open `/help` directly and refresh, then follow the calendar footer link using both
a click and Tab/Enter. Check desktop and narrow layouts for visible focus,
readable help text, and a footer that does not overlap the calendar.

See [local verification results](docs/help-verification.md) for checked routes,
hosting behavior, and checks that still need a working browser.
