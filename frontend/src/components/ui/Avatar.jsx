const Avatar = ({ name = "", className = "" }) => {
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
  return <span className={`ui-avatar ${className}`.trim()} aria-label={name || "Unknown"}>{initials}</span>;
};

export default Avatar;
