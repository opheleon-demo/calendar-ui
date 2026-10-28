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
- Optional Zoom meeting per event: tick "Create Zoom meeting" (shown once Zoom is connected; otherwise a connect prompt appears). The join link is saved on the event, follows title/time edits, and is removed when the event is deleted. If Zoom fails, the event still saves and a notice says the link was not created.
- Events can end on a later day than they start (e.g. across midnight)
