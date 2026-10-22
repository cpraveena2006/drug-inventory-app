const ProgressBar = ({ value, max = 100, tone = "teal", label }) => {
  const percentage = max > 0 ? Math.max(0, Math.min(100, (Number(value) / Number(max)) * 100)) : 0;
  return <div className="ui-progress-wrap" aria-label={label || `${Math.round(percentage)}%`}><div className={`ui-progress ${tone}`}><span style={{ width: `${percentage}%` }} /></div>{label && <span>{label}</span>}</div>;
};

export default ProgressBar;
