import { Search, X } from "lucide-react";

const SearchInput = ({ value, onChange, placeholder = "Search...", className = "" }) => (
  <label className={`ui-search-input ${className}`.trim()}>
    <Search size={17} />
    <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} />
    {value && <button type="button" aria-label="Clear search" onClick={() => onChange("")}><X size={14} /></button>}
  </label>
);

export default SearchInput;
