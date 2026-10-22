import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, MapPin, Pencil, Phone, Plus, Trash2, Truck } from "lucide-react";
import api from "../api/axios";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Avatar from "../components/ui/Avatar";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import SavedFilters from "../components/SavedFilters";

const emptyForm = { name: "", contactPerson: "", email: "", phone: "", address: "", leadTimeDays: 7 };

const Suppliers = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [deleteSupplier, setDeleteSupplier] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const canEdit = user?.role === "admin" || user?.role === "pharmacist";

  const fetchSuppliers = async (pageNumber = page, searchTerm = search) => {
    setLoading(true);
    try {
      const { data } = await api.get("/suppliers", { params: { page: pageNumber, limit: 20, search: searchTerm } });
      setSuppliers(data.items);
      setTotal(data.pagination.total);
      setError("");
    } catch (err) {
      const message = err.response?.data?.message || "Failed to load suppliers";
      setError(message); toast.error(message);
    } finally { setLoading(false); }
  };
  useEffect(() => {
    const timer = window.setTimeout(() => fetchSuppliers(), 250);
    return () => window.clearTimeout(timer);
  }, [page, search]);
  useEffect(() => {
    const handleSearch = (event) => {
      setSearch(event.detail || "");
      setPage(1);
    };
    window.addEventListener("app:global-search", handleSearch);
    return () => window.removeEventListener("app:global-search", handleSearch);
  }, []);

  const visibleSuppliers = suppliers;
  const pageCount = Math.max(1, Math.ceil(total / 20));
  const handleChange = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };
  const openEdit = (supplier) => {
    setForm({ name: supplier.name, contactPerson: supplier.contactPerson || "", email: supplier.email || "", phone: supplier.phone || "", address: supplier.address || "", leadTimeDays: supplier.leadTimeDays });
    setEditingId(supplier._id); setShowForm(true);
  };
  const handleSubmit = async (event) => {
    event.preventDefault(); setError(""); setSaving(true);
    try {
      if (editingId) {
        await api.put(`/suppliers/${editingId}`, form);
        toast.success("Supplier details updated");
      } else {
        await api.post("/suppliers", form);
        toast.success("Supplier added");
      }
      setShowForm(false); await fetchSuppliers();
    } catch (err) {
      const message = err.response?.data?.message || "Failed to save supplier";
      setError(message); toast.error(message);
    } finally { setSaving(false); }
  };
  const handleDelete = async () => {
    if (!deleteSupplier) return;
    try {
      await api.delete(`/suppliers/${deleteSupplier._id}`);
      toast.success("Supplier deleted"); setDeleteSupplier(null); await fetchSuppliers();
    } catch (err) {
      const message = err.response?.data?.message || "Failed to delete supplier";
      setError(message); toast.error(message); setDeleteSupplier(null);
    }
  };

  return (
    <div className="page inventory-page">
      <div className="page-intro">
        <div><span className="page-eyebrow">SUPPLIER NETWORK</span><h2>Suppliers</h2><p>Keep supplier contacts and lead times close at hand.</p></div>
        {canEdit && <Button onClick={openCreate}><Plus size={16} /> Add supplier</Button>}
      </div>
      <div className="supplier-toolbar"><div className="supplier-count"><span className="supplier-count-icon"><Truck size={17} /></span><div><strong>{total} suppliers</strong><span>Registered supply partners</span></div></div><span className="results-count">Search is available in the top bar</span><SavedFilters storageKey="medistock:saved-filters:suppliers" value={{ search }} onLoad={(saved) => { setSearch(saved.search || ""); setPage(1); }} /></div>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {loading ? <div className="supplier-grid">{Array.from({ length: 6 }, (_, index) => <Skeleton className="supplier-skeleton" key={index} />)}</div> : visibleSuppliers.length ? <div className="supplier-grid">
        {visibleSuppliers.map((supplier) => <article className="supplier-card" key={supplier._id}>
          <div className="supplier-card-top"><Avatar name={supplier.name} className="supplier-avatar" /><span className="lead-time-badge"><Truck size={12} /> {supplier.leadTimeDays} day lead</span></div>
          <h3><button className="text-link" onClick={() => navigate(`/suppliers/${supplier._id}/scorecard`)}>{supplier.name}</button></h3><p className="supplier-contact">{supplier.contactPerson || "Supplier contact"}</p>
          <div className="supplier-divider" />
          <div className="supplier-details">
            {supplier.email ? <a href={`mailto:${supplier.email}`}><Mail size={14} /><span>{supplier.email}</span></a> : <span className="supplier-no-detail"><Mail size={14} /> No email provided</span>}
            {supplier.phone ? <a href={`tel:${supplier.phone}`}><Phone size={14} /><span>{supplier.phone}</span></a> : <span className="supplier-no-detail"><Phone size={14} /> No phone provided</span>}
            {supplier.address && <span><MapPin size={14} /><span>{supplier.address}</span></span>}
          </div>
          {canEdit && <div className="supplier-card-actions"><button onClick={() => openEdit(supplier)}><Pencil size={14} /> Edit</button>{user.role === "admin" && <button className="delete-action" onClick={() => setDeleteSupplier(supplier)}><Trash2 size={14} /> Delete</button>}</div>}
        </article>)}
      </div> : <section className="inventory-panel"><EmptyState title="No suppliers found" message={search ? "Try a different search term." : "Add a supplier to keep your supply chain organized."} action={canEdit && <Button size="sm" onClick={openCreate}><Plus size={14} /> Add supplier</Button>} /></section>}
      {!loading && total > 20 && <div className="pagination-bar"><span>Showing <strong>{(page - 1) * 20 + 1}–{Math.min(page * 20, total)}</strong> of <strong>{total}</strong> suppliers</span><div><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage(page + 1)}>Next</button></div></div>}
      {showForm && <Modal title={editingId ? "Edit supplier" : "Add a supplier"} onClose={() => setShowForm(false)} className="form-modal" labelledBy="supplier-form-title">
        <form className="modal-form" onSubmit={handleSubmit}>
          <p className="modal-subtitle">Supplier contact and delivery information</p>
          {error && <div className="error-banner" role="alert">{error}</div>}
          <div className="form-grid">
            <label className="form-field form-span-two">Supplier name<input name="name" value={form.name} onChange={handleChange} required autoFocus /></label>
            <label className="form-field form-span-two">Contact person<input name="contactPerson" value={form.contactPerson} onChange={handleChange} /></label>
            <label className="form-field">Email<input type="email" name="email" value={form.email} onChange={handleChange} /></label>
            <label className="form-field">Phone<input name="phone" value={form.phone} onChange={handleChange} /></label>
            <label className="form-field form-span-two">Address<input name="address" value={form.address} onChange={handleChange} /></label>
            <label className="form-field">Lead time (days)<input type="number" name="leadTimeDays" value={form.leadTimeDays} onChange={handleChange} min="0" /></label>
          </div>
          <div className="modal-actions"><Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save supplier"}</Button></div>
        </form>
      </Modal>}
      {deleteSupplier && <ConfirmDialog title="Delete supplier?" message={`Delete ${deleteSupplier.name}? This action cannot be undone.`} onClose={() => setDeleteSupplier(null)} onConfirm={handleDelete} />}
    </div>
  );
};

export default Suppliers;
