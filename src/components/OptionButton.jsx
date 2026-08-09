export const OptionButton = ({ value, selected, onClick, full, icon }) => (
  <button
    type="button"
    className={`optionButton ${selected ? "selected" : ""} ${full ? "fullOption" : ""} ${icon ? "iconOption" : ""}`}
    onClick={onClick}
  >
    {icon ? (
      <>
        <span className="optionButtonIcon">{icon}</span>
        <span className="optionLabel">{value}</span>
      </>
    ) : (
      value
    )}
  </button>
);
