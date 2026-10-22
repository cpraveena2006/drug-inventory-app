import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  drug: "",
  supplier: "",
  batchNumber: "",
  manufactureDate: "",
  expiryDate: "",
  quantityReceived: "",
  warehouseLocation: "Main Warehouse",
};

const Batches = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [alerts, setAlerts] = useState({ expiringSoon: [], expired: [] });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const canEdit = user?.role === "admin" || user?.role === "pharmacist";

  const fetchAll = async () => {
    try {
      const [batchRes, drugRes, supplierRes, alertRes] = await Promise.all([
        api.get("/batches"),
        api.get("/drugs"),
        api.get("/suppliers"),
        api.get("/batches/alerts/expiry", { params: { days: 30 } }),
      ]);
      setBatches(batchRes.data);
      setDrugs(drugRes.data);
      setSuppliers(supplierRes.data);
      setAlerts(alertRes.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load batches");
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/batches", form);
      setShowForm(false);
      setForm(emptyForm);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create batch");
    }
  };

  const expiredIds = new Set(alerts.expired.map((b) => b._id));
  const expiringSoonIds = new Set(alerts.expiringSoon.map((b) => b._id));

  const visibleBatches = batches.filter((b) => {
    if (filter === "expired") return expiredIds.has(b._id);
    if (filter === "expiringSoon") return expiringSoonIds.has(b._id);
    if (filter === "active") return b.status === "active";
    return true;
  });

  return (
    <div className="page">
      <div className="page-header">
        <h1>Batches</h1>
        {canEdit && <button onClick={() => setShowForm(true)}>+ Receive Stock</button>}
      </div>

      <div className="alert-strip">
        <span className="badge danger">Expired in stock: {alerts.expired.length}</span>
        <span className="badge warn">Expiring in 30 days: {alerts.expiringSoon.length}</span>
      </div>

      <div className="filter-row">
        {["all", "active", "expiringSoon", "expired"].map((f) => (
          <button key={f} className={filter === f ? "chip active" : "chip"} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f === "active" ? "Active" : f === "expiringSoon" ? "Expiring Soon" : "Expired"}
          </button>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <h2>Receive New Batch</h2>
            <label>Drug</label>
            <select name="drug" value={form.drug} onChange={handleChange} required>
              <option value="">Select drug</option>
              {drugs.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
            <label>Supplier</label>
            <select name="supplier" value={form.supplier} onChange={handleChange} required>
              <option value="">Select supplier</option>
              {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <label>Batch Number</label>
            <input name="batchNumber" value={form.batchNumber} onChange={handleChange} required />
            <label>Manufacture Date</label>
            <input type="date" name="manufactureDate" value={form.manufactureDate} onChange={handleChange} required />
            <label>Expiry Date</label>
            <input type="date" name="expiryDate" value={form.expiryDate} onChange={handleChange} required />
            <label>Quantity Received</label>
            <input type="number" name="quantityReceived" value={form.quantityReceived} onChange={handleChange} required min={1} />
            <label>Warehouse Location</label>
            <input name="warehouseLocation" value={form.warehouseLocation} onChange={handleChange} />
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit">Save</button>
            </div>
          </form>
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Batch #</th>
            <th>Drug</th>
            <th>Supplier</th>
            <th>Expiry</th>
            <th>In Stock</th>
            <th>Location</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {visibleBatches.map((b) => (
            <tr key={b._id}>
              <td>{b.batchNumber}</td>
              <td>{b.drug?.name}</td>
              <td>{b.supplier?.name}</td>
              <td>
                {new Date(b.expiryDate).toLocaleDateString()}
                {expiredIds.has(b._id) && <span className="badge danger inline">Expired</span>}
                {!expiredIds.has(b._id) && expiringSoonIds.has(b._id) && <span className="badge warn inline">Soon</span>}
              </td>
              <td>{b.quantityInStock}</td>
              <td>{b.warehouseLocation}</td>
              <td><span className={`badge ${b.status === "active" ? "ok" : "warn"}`}>{b.status}</span></td>
            </tr>
          ))}
          {visibleBatches.length === 0 && (
            <tr><td colSpan={7} className="empty-row">No batches found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Batches;
