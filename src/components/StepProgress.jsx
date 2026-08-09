export const StepProgress = ({ total, current }) => (
  <div className="stepProgress" aria-hidden="true">
    {Array.from({ length: total }, (_, i) => (
      <div
        key={i}
        className={i < current ? "stepProgressSegment filled" : "stepProgressSegment"}
      />
    ))}
  </div>
);
