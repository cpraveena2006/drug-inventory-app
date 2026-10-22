const Button = ({ variant = "primary", size = "md", className = "", children, ...props }) => (
  <button className={`ui-button ui-button-${variant} ui-button-${size} ${className}`.trim()} {...props}>{children}</button>
);

export default Button;
