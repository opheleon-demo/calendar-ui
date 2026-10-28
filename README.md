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
- Footer with a **Help** link to `/help`, a short guide to the calendar controls

## Help Page

`/help` is a separate Vite HTML entry (`help/index.html` → `src/help.jsx`), so
`npm run build` emits `dist/help/index.html` and static hosts serve `/help` directly and on
refresh without rewrite rules. `src/main.jsx` also renders the help page when the path is
`/help`, covering hosts (and the dev server) that fall back to `index.html` instead. Help text lives in
`src/components/HelpPage.jsx`; the shared footer is `src/components/AppFooter.jsx`. When
calendar controls change, update the help text to match.
