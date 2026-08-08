export const OptionButton = ({ value, selected, onClick, full, icon }) => (
  <button
    type="button"
    className={`optionButton ${selected ? "selected" : ""} ${full ? "fullOption" : ""} ${icon ? "iconOption" : ""}`}
    onClick={onClick}
    aria-label={icon ? value : undefined}
  >
    {icon ? <span className="optionButtonIcon">{icon}</span> : value}
  </button>
);
