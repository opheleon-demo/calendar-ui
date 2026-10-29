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

## Authentication and Zoom

The backend now requires a calendar login. Register a calendar user or sign in
with an existing username and password. The tab keeps its short-lived bearer
session in `sessionStorage` and includes it in every protected API request.
If the session expires, sign in again to recover the event draft.

Choose **Connect Zoom** and authorize the organizer's Zoom account in the popup.
**Check connection** verifies access; **Reconnect Zoom** handles denied or revoked
authorization, and **Disconnect Zoom** disables future creation. Allow popups for
the calendar. No Zoom tokens are stored in the frontend. The backend must have its
user-managed Zoom OAuth app, encryption key and callback configured (see the API
README). Use the same hostname for API and UI during local development.

New event saving stays disabled until Zoom is usable. Each new event occurrence
gets a Zoom meeting under the signed-in organizer's connection. The event dialog
shows its join link. Errors stay visible and preserve the draft instead of closing
the dialog as if saving succeeded. **Resume draft** recovers a closed/reloaded
creation form. A submitted draft locks its values and reuses its request identity
on retries to prevent duplicate meetings. To correct an invalid time, the form is
unlocked. **Discard draft** explicitly warns that abandoning pending provisioning
can leave remote meetings unassociated. Reconnect the original Zoom user to
resume a draft started with that account. Drafts are scoped to the calendar
username in this tab; signing out does not discard them.

Times use the browser's IANA timezone. DST gaps move to the next valid instant;
folds use the earlier instant. New recurring series require a number of
occurrences (1–60, default 10) within 10 years; the API creates one accurately
scheduled meeting per occurrence, including daily, weekly, monthly and yearly
series. The first date must match the selected repeat days. Existing events and
unlimited recurring series receive no meetings automatically.

A timeout may have already created a meeting. Retry the same draft to reconcile;
the API never treats an empty Zoom search as permission to create a duplicate.
Persistently uncertain outcomes require maintainer investigation using the
support reference shown in the draft. Later edits and cancellations are not
synchronized; update those meetings in Zoom separately.

## Configuration and checks

`VITE_API_URL` optionally sets the backend base URL (default
`http://localhost:8000`, no trailing slash). Set it before running/building Vite.
Set the backend's `CALENDAR_UI_ORIGIN` to this app's exact origin. Hosted UI and
API should use HTTPS on the same site so the OAuth browser binding cookie works.

```bash
npm ci --ignore-scripts
npm test
npm run lint
npm run build
```

Tests cover authenticated requests and HTTP errors, session expiry, retained
creation drafts and stable retry identity, connection gating, existing-event
editing, calendar login and trusted OAuth popup messages. Zoom calls are mocked;
real account acceptance checks are performed after setup. Local browser launch
was unavailable in the delivery sandbox, so running-app browser/screenshot
checks remain for the delivery verifier.
