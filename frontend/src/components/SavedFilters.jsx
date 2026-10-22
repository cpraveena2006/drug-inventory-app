import { useEffect, useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export default function SavedFilters({ storageKey, value, onLoad }) {
  const [filters, setFilters] = useState([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      setFilters(Array.isArray(saved) ? saved : []);
    } catch (error) {
      toast.error("Could not read saved filters from this browser");
      console.error("Saved filter load failed", error);
    }
  }, [storageKey]);

  const persist = (next) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setFilters(next);
    } catch (error) {
      toast.error("Could not save filters in this browser");
      console.error("Saved filter persistence failed", error);
    }
  };

  const save = (event) => {
    event.preventDefault();
    const label = name.trim();
    if (!label) return;
    const next = [...filters.filter((filter) => filter.name.toLowerCase() !== label.toLowerCase()), { name: label, value }];
    persist(next);
    setSelected(label);
    setName("");
    toast.success("Filter saved");
  };

  const load = (event) => {
    const filter = filters.find((item) => item.name === event.target.value);
    setSelected(filter?.name || "");
    if (filter) onLoad(filter.value);
  };

  const remove = () => {
    if (!selected) return;
    persist(filters.filter((filter) => filter.name !== selected));
    setSelected("");
    toast.success("Saved filter removed");
  };

  return <div className="saved-filters" aria-label="Saved filters">
    <form onSubmit={save}>
      <input aria-label="Saved filter name" placeholder="Name this filter" value={name} maxLength={40} onChange={(event) => setName(event.target.value)} />
      <button type="submit" aria-label="Save current filter" title="Save current filter" disabled={!name.trim()}><Bookmark size={14} /> Save</button>
    </form>
    <select aria-label="Load saved filter" value={selected} onChange={load}>
      <option value="">Saved filters</option>
      {filters.map((filter) => <option key={filter.name} value={filter.name}>{filter.name}</option>)}
    </select>
    <button type="button" aria-label="Delete selected saved filter" title="Delete selected filter" onClick={remove} disabled={!selected}><Trash2 size={14} /></button>
  </div>;
}
