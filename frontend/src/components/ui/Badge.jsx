const Badge = ({ tone = "neutral", children, className = "" }) => (
  <span className={`ui-badge ui-badge-${tone} ${className}`.trim()}>{children}</span>
);

export default Badge;
