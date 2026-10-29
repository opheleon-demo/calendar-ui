export default function HelpPage() {
  return (
    <main className="help-page">
      <h1>Help</h1>
      <p>Use the weekly calendar to plan and manage your events.</p>
      <ul>
        <li>Use the left and right arrows to change weeks, or Today to return to the current week.</li>
        <li>Click an empty time slot to create an event. Enter a title, date, and start and end times, then select Create.</li>
        <li>Choose a Repeat option when creating an event to make it recurring.</li>
        <li>Click an event to edit or delete it, or drag it to another time slot to reschedule.</li>
        <li>When changing a recurring event, choose whether to apply the change to this event only, this and future events, or all events.</li>
      </ul>
      <p>Blue events are single events; purple events are recurring events.</p>
      <a className="page-link" href="/">Back to calendar</a>
    </main>
  );
}
