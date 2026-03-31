export default function RecurrencePrompt({ action, onSelect, onCancel }) {
  const actionLabel = action === 'delete' ? 'Delete' : action === 'move' ? 'Move' : 'Edit';

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <h3>{actionLabel} recurring event</h3>
        <p className="prompt-text">This is a recurring event. What would you like to {action}?</p>
        <div className="prompt-buttons">
          <button className="btn btn-full" onClick={() => onSelect('this')}>
            This event only
          </button>
          <button className="btn btn-full" onClick={() => onSelect('future')}>
            This and future events
          </button>
          <button className="btn btn-full" onClick={() => onSelect('all')}>
            All events
          </button>
        </div>
        <button className="btn btn-full btn-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
