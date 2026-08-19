export const OptionButton = ({ value, label, selected, onClick, full, icon }) => {
  const displayLabel = label ?? value;
  const oxClass =
    displayLabel === "O" ? "oxO" : displayLabel === "X" ? "oxX" : "";

  return (
    <button
      type="button"
      className={`optionButton ${selected ? "selected" : ""} ${full ? "fullOption" : ""} ${icon ? "iconOption" : ""} ${oxClass}`}
      onClick={onClick}
    >
      {icon ? (
        <>
          <span className="optionButtonIcon">{icon}</span>
          <span className="optionLabel">{displayLabel}</span>
        </>
      ) : (
        displayLabel
      )}
    </button>
  );
};
