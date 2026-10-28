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
- Sign in / register; the JWT is kept in `localStorage` and sent as a Bearer token on every API call
- Zoom settings (header → **Zoom**): connect your own Zoom account, see its status, disconnect, and reconnect when Zoom access expires or is revoked
