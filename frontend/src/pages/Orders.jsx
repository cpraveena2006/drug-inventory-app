import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [tab, setTab] = useState("all");
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [showDispatchForm, setShowDispatchForm] = useState(false);
  const [error, setError] = useState("");
  const canEdit = user?.role === "admin" || user?.role === "pharmacist";

  const [purchaseForm, setPurchaseForm] = useState({ supplier: "", notes: "", items: [{ drug: "", quantity: 1, unitPrice: 0 }] });
  const [dispatchForm, setDispatchForm] = useState({ buyerName: "", notes: "", items: [{ drug: "", quantity: 1, unitPrice: 0 }] });

  const fetchAll = async () => {
    try {
      const [orderRes, drugRes, supplierRes] = await Promise.all([
        api.get("/orders"),
        api.get("/drugs"),
        api.get("/suppliers"),
      ]);
      setOrders(orderRes.data);
      setDrugs(drugRes.data);
      setSuppliers(supplierRes.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load orders");
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const updateItem = (formSetter, form, index, field, value) => {
    const items = [...form.items];
    items[index] = { ...items[index], [field]: value };
    formSetter({ ...form, items });
  };

  const addItemRow = (formSetter, form) => {
    formSetter({ ...form, items: [...form.items, { drug: "", quantity: 1, unitPrice: 0 }] });
  };

  const removeItemRow = (formSetter, form, index) => {
    formSetter({ ...form, items: form.items.filter((_, i) => i !== index) });
  };

  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/orders/purchase", purchaseForm);
      setShowPurchaseForm(false);
      setPurchaseForm({ supplier: "", notes: "", items: [{ drug: "", quantity: 1, unitPrice: 0 }] });
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create purchase order");
    }
  };

  const handleDispatchSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/orders/dispatch", dispatchForm);
      setShowDispatchForm(false);
      setDispatchForm({ buyerName: "", notes: "", items: [{ drug: "", quantity: 1, unitPrice: 0 }] });
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create dispatch order");
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.patch(`/orders/${id}/status`, { status });
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status");
    }
  };

  const visibleOrders = orders.filter((o) => tab === "all" || o.orderType === tab);

  const renderItemRows = (form, setter) =>
    form.items.map((item, idx) => (
      <div className="item-row" key={idx}>
        <select value={item.drug} onChange={(e) => updateItem(setter, form, idx, "drug", e.target.value)} required>
          <option value="">Select drug</option>
          {drugs.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
        <input type="number" min={1} placeholder="Qty" value={item.quantity}
          onChange={(e) => updateItem(setter, form, idx, "quantity", Number(e.target.value))} required />
        <input type="number" min={0} step="0.01" placeholder="Unit Price" value={item.unitPrice}
          onChange={(e) => updateItem(setter, form, idx, "unitPrice", Number(e.target.value))} required />
        {form.items.length > 1 && (
          <button type="button" className="link-btn danger" onClick={() => removeItemRow(setter, form, idx)}>Remove</button>
        )}
      </div>
    ));

  return (
    <div className="page">
      <div className="page-header">
        <h1>Orders</h1>
        {canEdit && (
          <div className="header-actions">
            <button onClick={() => setShowPurchaseForm(true)}>+ Purchase Order</button>
            <button onClick={() => setShowDispatchForm(true)}>+ Dispatch Order</button>
          </div>
        )}
      </div>

      <div className="filter-row">
        {["all", "purchase", "dispatch"].map((t) => (
          <button key={t} className={tab === t ? "chip active" : "chip"} onClick={() => setTab(t)}>
            {t === "all" ? "All" : t === "purchase" ? "Purchase" : "Dispatch"}
          </button>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showPurchaseForm && (
        <div className="modal-overlay" onClick={() => setShowPurchaseForm(false)}>
          <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handlePurchaseSubmit}>
            <h2>New Purchase Order</h2>
            <label>Supplier</label>
            <select value={purchaseForm.supplier} onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier: e.target.value })} required>
              <option value="">Select supplier</option>
              {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <label>Items</label>
            {renderItemRows(purchaseForm, setPurchaseForm)}
            <button type="button" className="secondary small" onClick={() => addItemRow(setPurchaseForm, purchaseForm)}>+ Add Item</button>
            <label>Notes</label>
            <input value={purchaseForm.notes} onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })} />
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setShowPurchaseForm(false)}>Cancel</button>
              <button type="submit">Create Order</button>
            </div>
          </form>
        </div>
      )}

      {showDispatchForm && (
        <div className="modal-overlay" onClick={() => setShowDispatchForm(false)}>
          <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleDispatchSubmit}>
            <h2>New Dispatch Order</h2>
            <p className="hint">Stock is deducted immediately using earliest-expiry-first allocation.</p>
            <label>Buyer Name</label>
            <input value={dispatchForm.buyerName} onChange={(e) => setDispatchForm({ ...dispatchForm, buyerName: e.target.value })} required />
            <label>Items</label>
            {renderItemRows(dispatchForm, setDispatchForm)}
            <button type="button" className="secondary small" onClick={() => addItemRow(setDispatchForm, dispatchForm)}>+ Add Item</button>
            <label>Notes</label>
            <input value={dispatchForm.notes} onChange={(e) => setDispatchForm({ ...dispatchForm, notes: e.target.value })} />
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setShowDispatchForm(false)}>Cancel</button>
              <button type="submit">Dispatch</button>
            </div>
          </form>
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Party</th>
            <th>Items</th>
            <th>Total</th>
            <th>Status</th>
            <th>Created</th>
            {canEdit && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {visibleOrders.map((o) => (
            <tr key={o._id}>
              <td><span className={`badge ${o.orderType === "purchase" ? "ok" : "info"}`}>{o.orderType}</span></td>
              <td>{o.orderType === "purchase" ? o.supplier?.name : o.buyerName}</td>
              <td>{o.items.length} item(s)</td>
              <td>₹{o.totalAmount?.toFixed(2)}</td>
              <td>{o.status}</td>
              <td>{new Date(o.createdAt).toLocaleDateString()}</td>
              {canEdit && (
                <td className="actions-cell">
                  {o.orderType === "purchase" && o.status !== "delivered" && o.status !== "cancelled" && (
                    <select defaultValue="" onChange={(e) => e.target.value && handleStatusChange(o._id, e.target.value)}>
                      <option value="">Update status...</option>
                      <option value="approved">Approved</option>
                      <option value="shipped">Shipped</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  )}
                </td>
              )}
            </tr>
          ))}
          {visibleOrders.length === 0 && (
            <tr><td colSpan={7} className="empty-row">No orders found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Orders;
