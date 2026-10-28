export default function HelpPage() {
  return (
    <main className="help-page">
      <h1>Help</h1>
      <p>Use the weekly calendar to plan and manage your events.</p>
      <ul>
        <li>Use the left and right arrows to change weeks, or Today to return to the current week.</li>
        <li>Click an empty time slot to create an event. Enter a title, date, and start and end times, then select Create.</li>
        <li>Choose a Repeat option when creating an event to make it recurring.</li>
        <li>Click an event to edit its details or delete it. Drag an event to another time slot to reschedule it.</li>
        <li>When prompted for a recurring event, choose whether your change applies to this event only, this and future events, or all events.</li>
      </ul>
      <p>Blue events are single events; purple events repeat.</p>
      <a href="/">Back to calendar</a>
    </main>
  );
}
