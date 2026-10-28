export default function HelpPage() {
  return (
    <main className="help-page">
      <h1 className="help-title">Help</h1>
      <p className="help-intro">
        The calendar shows one week at a time, Monday to Sunday, from 7 AM to 9 PM.
      </p>

      <section className="help-section">
        <h2>Move between weeks</h2>
        <ul>
          <li>Use the <strong>&larr;</strong> and <strong>&rarr;</strong> buttons to go to the previous or next week.</li>
          <li>Select <strong>Today</strong> to return to the current week.</li>
        </ul>
      </section>

      <section className="help-section">
        <h2>Create an event</h2>
        <ul>
          <li>Click an empty time slot. The upper half of an hour starts the event on the hour, the lower half at half past.</li>
          <li>Enter a title, date, and start and end times, then select <strong>Create</strong>. Pick a <strong>Repeat</strong> option such as Daily or Weekly to make it a recurring event.</li>
          <li>If the new event overlaps an existing one, you will see a conflict notice.</li>
        </ul>
      </section>

      <section className="help-section">
        <h2>Edit, move, or delete an event</h2>
        <ul>
          <li>Click an event to edit its details or delete it.</li>
          <li>Drag an event to another time slot to reschedule it.</li>
          <li>For a recurring event, choose whether the change applies to this event only, this and future events, or all events.</li>
        </ul>
      </section>

      <section className="help-section">
        <h2>Event colors</h2>
        <ul>
          <li><span className="help-swatch help-swatch-single" aria-hidden="true" /> Blue events happen once.</li>
          <li><span className="help-swatch help-swatch-recurring" aria-hidden="true" /> Purple events repeat.</li>
        </ul>
      </section>

      <p className="help-back">
        <a href="/" className="footer-link">Back to calendar</a>
      </p>
    </main>
  );
}
