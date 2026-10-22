const Table = ({ children, className = "" }) => (
  <div className={`ui-table-scroll ${className}`.trim()}><table className="data-table ui-data-table">{children}</table></div>
);

export default Table;
