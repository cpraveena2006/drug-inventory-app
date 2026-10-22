import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Edit2, Plus, Trash2 } from "lucide-react";
import api from "../api/axios";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import ProgressBar from "../components/ui/ProgressBar";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import SavedFilters from "../components/SavedFilters";
import { downloadCsv } from "../utils/exportCsv";

const emptyForm = {
  name: "", genericName: "", category: "", manufacturer: "", composition: "",
  unit: "strip", unitPrice: "", reorderThreshold: 50, requiresPrescription: false,
};
const PAGE_SIZE = 10;
const currency = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(Number(value) || 0);

const Drugs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [drugs, setDrugs] = useState([]);
  const [search, setSearch] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [deleteDrug, setDeleteDrug] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const canEdit = user?.role === "admin" || user?.role === "pharmacist";

  const fetchDrugs = async (searchTerm = globalSearch, categoryFilter = category, pageNumber = page) => {
    setLoading(true);
    try {
      const params = { page: pageNumber, limit: PAGE_SIZE };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (categoryFilter !== "all") params.category = categoryFilter;
      const { data } = await api.get("/drugs", { params });
      setDrugs(data.items);
      setTotal(data.pagination.total);
      setCategories(data.categories);
      setError("");
    } catch (err) {
      const message = err.response?.data?.message || "Failed to load drugs";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => fetchDrugs(), 250);
    return () => window.clearTimeout(timer);
  }, [globalSearch, category, page]);
  useEffect(() => {
    const handleSearch = (event) => {
      const value = event.detail || "";
      setSearch(value);
      setGlobalSearch(value);
      setPage(1);
    };
    window.addEventListener("app:global-search", handleSearch);
    return () => window.removeEventListener("app:global-search", handleSearch);
  }, []);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearch = (event) => {
    event.preventDefault();
    setGlobalSearch(search);
    setPage(1);
  };
  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };
  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };
  const openEdit = (drug) => {
    setForm({
      name: drug.name, genericName: drug.genericName || "", category: drug.category || "",
      manufacturer: drug.manufacturer || "", composition: drug.composition || "",
      unit: drug.unit, unitPrice: drug.unitPrice, reorderThreshold: drug.reorderThreshold,
      requiresPrescription: drug.requiresPrescription,
    });
    setEditingId(drug._id);
    setShowForm(true);
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/drugs/${editingId}`, form);
        toast.success("Drug details updated");
      } else {
        await api.post("/drugs", form);
        toast.success("Drug added to inventory");
      }
      setShowForm(false);
      await fetchDrugs(search);
    } catch (err) {
      const message = err.response?.data?.message || "Failed to save drug";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async () => {
    if (!deleteDrug) return;
    try {
      await api.delete(`/drugs/${deleteDrug._id}`);
      toast.success("Drug deleted");
      setDeleteDrug(null);
      await fetchDrugs(search);
    } catch (err) {
      const message = err.response?.data?.message || "Failed to delete drug";
      setError(message);
      toast.error(message);
      setDeleteDrug(null);
    }
  };

  return (
    <div className="page inventory-page">
      <div className="page-intro">
        <div><span className="page-eyebrow">INVENTORY CATALOG</span><h2>Drug catalog</h2><p>Manage medicines, pricing and stock thresholds in one place.</p></div>
        <div className="page-action-group">
          <Button variant="secondary" onClick={() => downloadCsv("drug-catalog.csv", [
            { label: "Drug", value: (drug) => drug.name },
            { label: "Generic name", value: (drug) => drug.genericName },
            { label: "Category", value: (drug) => drug.category },
            { label: "Manufacturer", value: (drug) => drug.manufacturer },
            { label: "Unit", value: (drug) => drug.unit },
            { label: "Unit price", value: (drug) => drug.unitPrice },
            { label: "Stock", value: (drug) => drug.totalStock },
            { label: "Reorder threshold", value: (drug) => drug.reorderThreshold },
          ], drugs)}><Download size={15} /> Export page CSV</Button>
          {canEdit && <Button onClick={openCreate}><Plus size={16} /> Add drug</Button>}
        </div>
      </div>
      <section className="inventory-toolbar">
        <form className="inventory-search" onSubmit={handleSearch}><span className="search-mark">⌕</span><input placeholder="Search by drug, generic name or category..." value={search} onChange={(event) => setSearch(event.target.value)} /><Button type="submit" variant="secondary" size="sm">Search</Button></form>
        <select className="filter-select" aria-label="Filter by category" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>
          <option value="all">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <SavedFilters storageKey="medistock:saved-filters:drugs" value={{ search: globalSearch, category }} onLoad={(saved) => {
          setSearch(saved.search || "");
          setGlobalSearch(saved.search || "");
          setCategory(saved.category || "all");
          setPage(1);
        }} />
        <span className="results-count"><strong>{total}</strong> records</span>
      </section>
      {error && <div className="error-banner" role="alert">{error}</div>}
      <section className="inventory-panel">
        {loading ? <div className="table-loading">{Array.from({ length: 6 }, (_, index) => <Skeleton className="skeleton-row" key={index} />)}</div> : drugs.length ? <>
          <div className="table-scroll"><table className="data-table inventory-table"><thead><tr><th>DRUG</th><th>CATEGORY</th><th>MANUFACTURER</th><th>UNIT PRICE</th><th>STOCK LEVEL</th><th>AVAILABILITY</th>{canEdit && <th>ACTIONS</th>}</tr></thead>
            <tbody>{drugs.map((drug) => {
              const low = drug.isLowStock;
              const threshold = Number(drug.reorderThreshold) || 0;
              const totalStock = Number(drug.totalStock) || 0;
              return <tr key={drug._id}>
                <td><div className="drug-cell"><span className="drug-mini-icon">{drug.name?.slice(0, 1)?.toUpperCase()}</span><div><strong>{canEdit ? <button className="text-link" onClick={() => navigate(`/drugs/${drug._id}`)}>{drug.name}</button> : drug.name}</strong><span>{drug.genericName || drug.composition || "Generic name not provided"}</span></div></div></td>
                <td>{drug.category || <span className="muted-dash">—</span>}</td><td>{drug.manufacturer || <span className="muted-dash">—</span>}</td>
                <td className="price-cell">{currency(drug.unitPrice)}<small>/ {drug.unit}</small></td>
                <td><div className="stock-cell"><div><strong>{totalStock.toLocaleString("en-IN")}</strong><span> {drug.unit}s</span></div><ProgressBar value={totalStock} max={Math.max(threshold * 2, totalStock, 1)} tone={low ? "warning" : "teal"} /><small>Reorder at {threshold}</small></div></td>
                <td><span className={`status-pill ${low ? "status-pending" : "status-delivered"}`}><i />{low ? "Low stock" : "Sufficient"}</span></td>
                {canEdit && <td><div className="table-actions"><button aria-label={`Edit ${drug.name}`} title="Edit drug" onClick={() => openEdit(drug)}><Edit2 size={15} /></button>{user.role === "admin" && <button className="delete-action" aria-label={`Delete ${drug.name}`} title="Delete drug" onClick={() => setDeleteDrug(drug)}><Trash2 size={15} /></button>}</div></td>}
              </tr>;
            })}</tbody></table></div>
          <div className="pagination-bar"><span>Showing <strong>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</strong> of <strong>{total}</strong> drugs</span><div><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage(page + 1)}>Next</button></div></div>
        </> : <EmptyState title="No drugs found" message={globalSearch ? "Try a different search or clear your filters." : "Your drug catalog is ready for its first entry."} action={canEdit && <Button size="sm" onClick={openCreate}><Plus size={14} /> Add drug</Button>} />}
      </section>
      {showForm && <Modal title={editingId ? "Edit drug" : "Add a drug"} onClose={() => setShowForm(false)} className="form-modal" labelledBy="drug-form-title">
        <form className="modal-form" onSubmit={handleSubmit}>
          <p className="modal-subtitle">Drug details and reorder settings</p>
          {error && <div className="error-banner" role="alert">{error}</div>}
          <div className="form-grid">
            <label className="form-field">Drug name<input name="name" value={form.name} onChange={handleChange} required autoFocus /></label>
            <label className="form-field">Generic name<input name="genericName" value={form.genericName} onChange={handleChange} /></label>
            <label className="form-field">Category<input name="category" value={form.category} onChange={handleChange} /></label>
            <label className="form-field">Manufacturer<input name="manufacturer" value={form.manufacturer} onChange={handleChange} /></label>
            <label className="form-field form-span-two">Composition<input name="composition" value={form.composition} onChange={handleChange} /></label>
            <label className="form-field">Unit<select name="unit" value={form.unit} onChange={handleChange}><option value="strip">Strip</option><option value="bottle">Bottle</option><option value="vial">Vial</option><option value="box">Box</option><option value="tube">Tube</option></select></label>
            <label className="form-field">Unit price (₹)<input type="number" step="0.01" min="0" name="unitPrice" value={form.unitPrice} onChange={handleChange} required /></label>
            <label className="form-field">Reorder threshold<input type="number" min="0" name="reorderThreshold" value={form.reorderThreshold} onChange={handleChange} /></label>
          </div>
          <label className="form-checkbox"><input type="checkbox" name="requiresPrescription" checked={form.requiresPrescription} onChange={handleChange} /> Requires prescription</label>
          <div className="modal-actions"><Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Save changes" : "Add drug"}</Button></div>
        </form>
      </Modal>}
      {deleteDrug && <ConfirmDialog title="Delete drug?" message={`Delete ${deleteDrug.name}? This only works if it has no active stock.`} onClose={() => setDeleteDrug(null)} onConfirm={handleDelete} />}
    </div>
  );
};

export default Drugs;
