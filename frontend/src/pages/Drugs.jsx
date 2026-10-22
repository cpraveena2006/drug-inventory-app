import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  name: "",
  genericName: "",
  category: "",
  manufacturer: "",
  composition: "",
  unit: "strip",
  unitPrice: "",
  reorderThreshold: 50,
  requiresPrescription: false,
};

const Drugs = () => {
  const { user } = useAuth();
  const [drugs, setDrugs] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const canEdit = user?.role === "admin" || user?.role === "pharmacist";

  const fetchDrugs = async (searchTerm = "") => {
    try {
      const { data } = await api.get("/drugs", { params: searchTerm ? { search: searchTerm } : {} });
      setDrugs(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load drugs");
    }
  };

  useEffect(() => {
    fetchDrugs();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDrugs(search);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (drug) => {
    setForm({
      name: drug.name,
      genericName: drug.genericName || "",
      category: drug.category || "",
      manufacturer: drug.manufacturer || "",
      composition: drug.composition || "",
      unit: drug.unit,
      unitPrice: drug.unitPrice,
      reorderThreshold: drug.reorderThreshold,
      requiresPrescription: drug.requiresPrescription,
    });
    setEditingId(drug._id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editingId) {
        await api.put(`/drugs/${editingId}`, form);
      } else {
        await api.post("/drugs", form);
      }
      setShowForm(false);
      fetchDrugs(search);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save drug");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this drug? This only works if it has no active stock.")) return;
    try {
      await api.delete(`/drugs/${id}`);
      fetchDrugs(search);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete drug");
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Drugs</h1>
        {canEdit && <button onClick={openCreate}>+ Add Drug</button>}
      </div>

      <form className="search-bar" onSubmit={handleSearch}>
        <input
          placeholder="Search by name, generic name, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <h2>{editingId ? "Edit Drug" : "New Drug"}</h2>
            <label>Name</label>
            <input name="name" value={form.name} onChange={handleChange} required />
            <label>Generic Name</label>
            <input name="genericName" value={form.genericName} onChange={handleChange} />
            <label>Category</label>
            <input name="category" value={form.category} onChange={handleChange} />
            <label>Manufacturer</label>
            <input name="manufacturer" value={form.manufacturer} onChange={handleChange} />
            <label>Composition</label>
            <input name="composition" value={form.composition} onChange={handleChange} />
            <label>Unit</label>
            <select name="unit" value={form.unit} onChange={handleChange}>
              <option value="strip">strip</option>
              <option value="bottle">bottle</option>
              <option value="vial">vial</option>
              <option value="box">box</option>
              <option value="tube">tube</option>
            </select>
            <label>Unit Price (₹)</label>
            <input type="number" step="0.01" name="unitPrice" value={form.unitPrice} onChange={handleChange} required />
            <label>Reorder Threshold</label>
            <input type="number" name="reorderThreshold" value={form.reorderThreshold} onChange={handleChange} />
            <label className="checkbox-label">
              <input type="checkbox" name="requiresPrescription" checked={form.requiresPrescription} onChange={handleChange} />
              Requires Prescription
            </label>
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
            <th>Name</th>
            <th>Category</th>
            <th>Manufacturer</th>
            <th>Unit Price</th>
            <th>Stock</th>
            <th>Status</th>
            {canEdit && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {drugs.map((drug) => (
            <tr key={drug._id}>
              <td>{drug.name}</td>
              <td>{drug.category}</td>
              <td>{drug.manufacturer}</td>
              <td>₹{drug.unitPrice}</td>
              <td>{drug.totalStock} {drug.unit}s</td>
              <td>
                {drug.isLowStock ? (
                  <span className="badge warn">Low Stock</span>
                ) : (
                  <span className="badge ok">Sufficient</span>
                )}
              </td>
              {canEdit && (
                <td className="actions-cell">
                  <button className="link-btn" onClick={() => openEdit(drug)}>Edit</button>
                  {user.role === "admin" && (
                    <button className="link-btn danger" onClick={() => handleDelete(drug._id)}>Delete</button>
                  )}
                </td>
              )}
            </tr>
          ))}
          {drugs.length === 0 && (
            <tr><td colSpan={7} className="empty-row">No drugs found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Drugs;
