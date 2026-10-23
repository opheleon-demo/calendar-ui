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

- Register, sign in, and sign out; calendar requests carry the signed-in person's token
- Signing out (or the token expiring, or a 401 from the API) clears all calendar data from the screen; other open tabs follow via the `storage` event
- Weekly calendar view (Mon-Sun, 7am-9pm)
- Click empty slot to create event (with optional recurrence)
- Click event to edit/delete
- Drag and drop to reschedule
- Recurring event edits prompt: "This event only / This and future / All events"
- Color coding: blue = single events, purple = recurring events
- Conflict detection alerts on creation
