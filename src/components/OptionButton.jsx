export const OptionButton = ({ value, selected, onClick, full }) => (
  <button
    type="button"
    className={`optionButton ${selected ? "selected" : ""} ${full ? "fullOption" : ""}`}
    onClick={onClick}
  >
    {value}
  </button>
);
