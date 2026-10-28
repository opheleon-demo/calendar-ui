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
- Footer Help link opens `/help`, with calendar guidance and a link back to `/`

## Help page and hosting

The footer appears below the calendar and on the help page. Its native Help link
supports keyboard navigation, a visible focus outline, and Enter activation.
Help content wraps to fit narrow screens and uses the existing calendar colors.
The help page does not load calendar events or require the backend.

`npm run build` creates both `dist/index.html` and `dist/help/index.html`.
Serve the entire `dist` directory at the site root with directory-index support
(`/help` should serve `help/index.html`, optionally redirecting to `/help/`).
Both `/help` and `/help/` render Help on direct visits and refreshes; no SPA
fallback is needed for this route. If the host does not support directory indexes,
configure an explicit `/help` rewrite to `/help/index.html`.

For local production checks, run `npm run build` and `npm run preview`, then open
`http://localhost:4173/help` directly and refresh. Check the footer link from `/`,
Tab focus and Enter activation, and desktop and narrow layouts. Confirm that
calendar navigation and clicking an empty slot still work.
