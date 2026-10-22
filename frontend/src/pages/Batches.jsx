import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { Boxes, CalendarDays, Clock3, Download, PackageCheck, Plus, ShieldCheck } from "lucide-react";
import api from "../api/axios";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import SearchInput from "../components/ui/SearchInput";
import ProgressBar from "../components/ui/ProgressBar";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import SavedFilters from "../components/SavedFilters";
import { downloadCsv } from "../utils/exportCsv";

const emptyForm = { drug: "", supplier: "", batchNumber: "", manufactureDate: "", expiryDate: "", quantityReceived: "", warehouseLocation: "Main Warehouse" };
const formatDate = (value) => value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const Batches = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [batches, setBatches] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [alerts, setAlerts] = useState({ expiringSoon: [], expired: [] });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ all: 0, active: 0, expiringSoon: 0, expired: 0 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const canEdit = user?.role === "admin" || user?.role === "pharmacist";

  const fetchAll = async (pageNumber = page, searchTerm = search, filterType = filter) => {
    setLoading(true);
    try {
      const batchParams = { page: pageNumber, limit: 20, search: searchTerm };
      if (filterType !== "all") batchParams.expiryState = filterType;
      const [batchRes, drugRes, supplierRes, alertRes] = await Promise.all([
        api.get("/batches", { params: batchParams }), api.get("/drugs"), api.get("/suppliers"),
        api.get("/batches/alerts/expiry", { params: { days: 30 } }),
      ]);
      setBatches(batchRes.data.items);
      setTotal(batchRes.data.pagination.total);
      setCounts(batchRes.data.counts);
      setDrugs(drugRes.data); setSuppliers(supplierRes.data); setAlerts(alertRes.data);
      setError("");
    } catch (err) {
      const message = err.response?.data?.message || "Failed to load batches";
      setError(message);
      toast.error(message);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => fetchAll(), 250);
    return () => window.clearTimeout(timer);
  }, [page, search, filter]);
  useEffect(() => {
    if (searchParams.get("receive") === "1" && canEdit) {
      setShowForm(true);
      const next = new URLSearchParams(searchParams);
      next.delete("receive");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, canEdit]);
  useEffect(() => {
    const handleSearch = (event) => {
      setSearch(event.detail || "");
      setPage(1);
    };
    window.addEventListener("app:global-search", handleSearch);
    return () => window.removeEventListener("app:global-search", handleSearch);
  }, []);

  const expiredIds = useMemo(() => new Set(alerts.expired.map((batch) => batch._id)), [alerts]);
  const expiringSoonIds = useMemo(() => new Set(alerts.expiringSoon.map((batch) => batch._id)), [alerts]);
  const pageCount = Math.max(1, Math.ceil(total / 20));
  const filters = [
    { id: "all", label: "All batches", Icon: Boxes },
    { id: "active", label: "Active", Icon: PackageCheck },
    { id: "expiringSoon", label: "Expiring soon", Icon: Clock3 },
    { id: "expired", label: "Expired", Icon: CalendarDays },
  ];

  const handleChange = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (new Date(form.expiryDate) <= new Date(form.manufactureDate)) {
      setError("Expiry date must be after the manufacture date.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/batches", form);
      toast.success("Stock received and batch recorded");
      setShowForm(false); setForm(emptyForm);
      await fetchAll();
    } catch (err) {
      const message = err.response?.data?.message || "Failed to create batch";
      setError(message); toast.error(message);
    } finally { setSaving(false); }
  };

  return (
    <div className="page inventory-page">
      <div className="page-intro">
        <div><span className="page-eyebrow">LOT TRACEABILITY</span><h2>Batch inventory</h2><p>Track stock by lot, expiry date and warehouse location.</p></div>
        <div className="page-action-group">
          <Button variant="secondary" onClick={() => downloadCsv("batch-inventory.csv", [
            { label: "Batch number", value: (batch) => batch.batchNumber },
            { label: "Drug", value: (batch) => batch.drug?.name },
            { label: "Supplier", value: (batch) => batch.supplier?.name },
            { label: "Manufacture date", value: (batch) => batch.manufactureDate?.slice(0, 10) },
            { label: "Expiry date", value: (batch) => batch.expiryDate?.slice(0, 10) },
            { label: "Quantity received", value: (batch) => batch.quantityReceived },
            { label: "Quantity in stock", value: (batch) => batch.quantityInStock },
            { label: "Warehouse", value: (batch) => batch.warehouseLocation },
            { label: "Status", value: (batch) => batch.status },
          ], batches)}><Download size={15} /> Export page CSV</Button>
          {canEdit && <Button onClick={() => setShowForm(true)}><Plus size={16} /> Receive stock</Button>}
        </div>
      </div>
      <div className="batch-alert-summary"><div className="batch-alert-card danger"><span><CalendarDays size={17} /></span><div><strong>{alerts.expired.length}</strong><small>Expired in stock</small></div></div><div className="batch-alert-card warning"><span><Clock3 size={17} /></span><div><strong>{alerts.expiringSoon.length}</strong><small>Expiring in 30 days</small></div></div><div className="batch-alert-note"><ShieldCheck size={17} /><span>Batch-level visibility helps prevent expired stock from being dispatched.</span></div></div>
      <div className="batch-toolbar">
        <div className="batch-filters">{filters.map(({ id, label, Icon }) => <button key={id} className={`batch-filter${filter === id ? " active" : ""}`} onClick={() => { setFilter(id); setPage(1); }}><Icon size={14} />{label}<span>{counts[id]}</span></button>)}</div>
        <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search batches..." className="batch-search" />
        <SavedFilters storageKey="medistock:saved-filters:batches" value={{ search, filter }} onLoad={(saved) => {
          setSearch(saved.search || "");
          setFilter(saved.filter || "all");
          setPage(1);
        }} />
      </div>
      {error && <div className="error-banner" role="alert">{error}</div>}
      <section className="inventory-panel">
        {loading ? <div className="table-loading">{Array.from({ length: 6 }, (_, index) => <Skeleton className="skeleton-row" key={index} />)}</div> : batches.length ? <><div className="table-scroll"><table className="data-table inventory-table batch-table"><thead><tr><th>BATCH</th><th>DRUG</th><th>SUPPLIER</th><th>EXPIRY</th><th>QUANTITY REMAINING</th><th>WAREHOUSE</th><th>STATUS</th></tr></thead><tbody>
          {batches.map((batch) => {
            const isExpired = expiredIds.has(batch._id);
            const isExpiring = expiringSoonIds.has(batch._id);
            const daysLeft = Math.ceil((new Date(batch.expiryDate) - new Date()) / 86400000);
            const received = Number(batch.quantityReceived) || Number(batch.quantityInStock) || 1;
            return <tr key={batch._id}>
              <td><button className="text-link batch-number" onClick={() => navigate(`/batches/${batch._id}`)}>{batch.batchNumber}</button></td><td><strong className="table-strong">{batch.drug?.name || "—"}</strong></td><td>{batch.supplier?.name || "—"}</td>
              <td><div className={`expiry-cell${isExpired ? " expired" : isExpiring ? " expiring" : ""}`}><strong>{formatDate(batch.expiryDate)}</strong><span>{isExpired ? "Expired" : isExpiring ? `${Math.max(0, daysLeft)} days left` : "In date"}</span></div></td>
              <td><div className="stock-cell"><div><strong>{Number(batch.quantityInStock || 0).toLocaleString("en-IN")}</strong><span> / {Number(batch.quantityReceived || received).toLocaleString("en-IN")} units</span></div><ProgressBar value={batch.quantityInStock} max={received} tone={isExpired ? "danger" : isExpiring ? "warning" : "teal"} /></div></td>
              <td>{batch.warehouseLocation || "—"}</td><td><span className={`status-pill ${batch.status === "active" && !isExpired ? "status-delivered" : isExpired ? "status-cancelled" : "status-pending"}`}><i />{isExpired ? "Expired" : batch.status}</span></td>
            </tr>;
          })}
        </tbody></table></div><div className="pagination-bar"><span>Showing <strong>{(page - 1) * 20 + 1}–{Math.min(page * 20, total)}</strong> of <strong>{total}</strong> batches</span><div><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage(page + 1)}>Next</button></div></div></> : <EmptyState title="No batches match" message="Try another filter or search term to find inventory." />}
      </section>
      {showForm && canEdit && <Modal title="Receive new stock" onClose={() => setShowForm(false)} className="form-modal" labelledBy="batch-form-title">
        <form className="modal-form" onSubmit={handleSubmit}>
          <p className="modal-subtitle">Add a traceable medicine lot to your inventory.</p>
          {error && <div className="error-banner" role="alert">{error}</div>}
          <div className="form-grid">
            <label className="form-field form-span-two">Drug<select name="drug" value={form.drug} onChange={handleChange} required><option value="">Select drug</option>{drugs.map((drug) => <option key={drug._id} value={drug._id}>{drug.name}</option>)}</select></label>
            <label className="form-field form-span-two">Supplier<select name="supplier" value={form.supplier} onChange={handleChange} required><option value="">Select supplier</option>{suppliers.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}</option>)}</select></label>
            <label className="form-field form-span-two">Batch number<input name="batchNumber" value={form.batchNumber} onChange={handleChange} required /></label>
            <label className="form-field">Manufacture date<input type="date" name="manufactureDate" value={form.manufactureDate} onChange={handleChange} required /></label>
            <label className="form-field">Expiry date<input type="date" name="expiryDate" value={form.expiryDate} onChange={handleChange} required min={form.manufactureDate || undefined} /></label>
            <label className="form-field">Quantity received<input type="number" name="quantityReceived" value={form.quantityReceived} onChange={handleChange} required min="1" /></label>
            <label className="form-field">Warehouse location<input name="warehouseLocation" value={form.warehouseLocation} onChange={handleChange} /></label>
          </div>
          <div className="modal-actions"><Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Receive stock"}</Button></div>
        </form>
      </Modal>}
    </div>
  );
};

export default Batches;
