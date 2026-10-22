import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const emptyForm = { name: "", contactPerson: "", email: "", phone: "", address: "", leadTimeDays: 7 };

const Suppliers = () => {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const canEdit = user?.role === "admin" || user?.role === "pharmacist";

  const fetchSuppliers = async () => {
    try {
      const { data } = await api.get("/suppliers");
      setSuppliers(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load suppliers");
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (s) => {
    setForm({
      name: s.name,
      contactPerson: s.contactPerson || "",
      email: s.email || "",
      phone: s.phone || "",
      address: s.address || "",
      leadTimeDays: s.leadTimeDays,
    });
    setEditingId(s._id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editingId) {
        await api.put(`/suppliers/${editingId}`, form);
      } else {
        await api.post("/suppliers", form);
      }
      setShowForm(false);
      fetchSuppliers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save supplier");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this supplier?")) return;
    try {
      await api.delete(`/suppliers/${id}`);
      fetchSuppliers();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete supplier");
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Suppliers</h1>
        {canEdit && <button onClick={openCreate}>+ Add Supplier</button>}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <h2>{editingId ? "Edit Supplier" : "New Supplier"}</h2>
            <label>Name</label>
            <input name="name" value={form.name} onChange={handleChange} required />
            <label>Contact Person</label>
            <input name="contactPerson" value={form.contactPerson} onChange={handleChange} />
            <label>Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} />
            <label>Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange} />
            <label>Address</label>
            <input name="address" value={form.address} onChange={handleChange} />
            <label>Lead Time (days)</label>
            <input type="number" name="leadTimeDays" value={form.leadTimeDays} onChange={handleChange} />
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
            <th>Contact</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Lead Time</th>
            {canEdit && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {suppliers.map((s) => (
            <tr key={s._id}>
              <td>{s.name}</td>
              <td>{s.contactPerson}</td>
              <td>{s.email}</td>
              <td>{s.phone}</td>
              <td>{s.leadTimeDays} days</td>
              {canEdit && (
                <td className="actions-cell">
                  <button className="link-btn" onClick={() => openEdit(s)}>Edit</button>
                  {user.role === "admin" && (
                    <button className="link-btn danger" onClick={() => handleDelete(s._id)}>Delete</button>
                  )}
                </td>
              )}
            </tr>
          ))}
          {suppliers.length === 0 && (
            <tr><td colSpan={6} className="empty-row">No suppliers found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Suppliers;
