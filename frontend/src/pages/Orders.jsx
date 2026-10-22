import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Download, FileText, Minus, Plus, ShoppingCart, Truck } from "lucide-react";
import api from "../api/axios";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import SearchInput from "../components/ui/SearchInput";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import SavedFilters from "../components/SavedFilters";
import { downloadCsv } from "../utils/exportCsv";
import { printDispatchInvoice } from "../utils/printDispatchInvoice";

const newItems = () => [{ drug: "", quantity: 1, unitPrice: 0 }];
const blankPurchase = () => ({ supplier: "", notes: "", items: newItems() });
const blankDispatch = () => ({ buyerName: "", notes: "", items: newItems() });
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(Number(value) || 0);
const formatDate = (value) => value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const orderStatus = (status) => `status-pill status-${status || "pending"}`;

const Orders = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ all: 0, purchase: 0, dispatch: 0 });
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [showDispatchForm, setShowDispatchForm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const canEdit = user?.role === "admin" || user?.role === "pharmacist";
  const [purchaseForm, setPurchaseForm] = useState(blankPurchase);
  const [dispatchForm, setDispatchForm] = useState(blankDispatch);

  const fetchAll = async (pageNumber = page, searchTerm = search, orderTab = tab) => {
    setLoading(true);
    try {
      const params = { page: pageNumber, limit: 20, search: searchTerm };
      if (orderTab !== "all") params.orderType = orderTab;
      const [orderRes, drugRes, supplierRes] = await Promise.all([api.get("/orders", { params }), api.get("/drugs"), api.get("/suppliers")]);
      setOrders(orderRes.data.items);
      setTotal(orderRes.data.pagination.total);
      setCounts(orderRes.data.counts);
      setDrugs(drugRes.data); setSuppliers(supplierRes.data); setError("");
    } catch (err) {
      const message = err.response?.data?.message || "Failed to load orders";
      setError(message); toast.error(message);
    } finally { setLoading(false); }
  };
  useEffect(() => {
    const timer = window.setTimeout(() => fetchAll(), 250);
    return () => window.clearTimeout(timer);
  }, [page, search, tab]);
  useEffect(() => {
    const action = searchParams.get("new");
    if (action === "dispatch" && canEdit) setShowDispatchForm(true);
    if (action === "purchase" && canEdit) setShowPurchaseForm(true);
    if ((action === "dispatch" || action === "purchase") && canEdit) {
      const next = new URLSearchParams(searchParams); next.delete("new"); setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, canEdit]);
  useEffect(() => {
    const prefilled = location.state?.prefilledPurchaseOrder;
    if (!prefilled || !canEdit) return;
    setPurchaseForm({
      supplier: prefilled.supplier || "",
      notes: "",
      items: (prefilled.items || []).map((item) => ({
        drug: item.drug?._id || item.drug || "",
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
      })),
    });
    setShowPurchaseForm(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate, canEdit]);
  useEffect(() => {
    const handleSearch = (event) => {
      setSearch(event.detail || "");
      setPage(1);
    };
    window.addEventListener("app:global-search", handleSearch);
    return () => window.removeEventListener("app:global-search", handleSearch);
  }, []);

  const filteredOrders = orders;
  const pageCount = Math.max(1, Math.ceil(total / 20));

  const updateItem = (setter, form, index, field, value) => {
    const items = [...form.items];
    items[index] = { ...items[index], [field]: value };
    if (field === "drug") {
      const drug = drugs.find((item) => item._id === value);
      if (drug) items[index].unitPrice = Number(drug.unitPrice) || 0;
    }
    setter({ ...form, items });
  };
  const addItemRow = (setter, form) => setter({ ...form, items: [...form.items, { drug: "", quantity: 1, unitPrice: 0 }] });
  const removeItemRow = (setter, form, index) => setter({ ...form, items: form.items.filter((_, itemIndex) => itemIndex !== index) });
  const totalFor = (items) => items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);

  const handlePurchaseSubmit = async (event) => {
    event.preventDefault(); setError(""); setSaving(true);
    try {
      await api.post("/orders/purchase", purchaseForm);
      toast.success("Purchase order created");
      setShowPurchaseForm(false); setPurchaseForm(blankPurchase()); await fetchAll();
    } catch (err) {
      const message = err.response?.data?.message || "Failed to create purchase order";
      setError(message); toast.error(message);
    } finally { setSaving(false); }
  };
  const handleDispatchSubmit = async (event) => {
    event.preventDefault(); setError(""); setSaving(true);
    try {
      await api.post("/orders/dispatch", dispatchForm);
      toast.success("Dispatch order created and stock allocated");
      setShowDispatchForm(false); setDispatchForm(blankDispatch()); await fetchAll();
    } catch (err) {
      const message = err.response?.data?.message || "Failed to create dispatch order";
      setError(message); toast.error(message);
    } finally { setSaving(false); }
  };
  const handleStatusChange = async (id, status) => {
    setUpdatingOrder(id);
    try {
      await api.patch(`/orders/${id}/status`, { status });
      toast.success("Order status updated"); await fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    } finally { setUpdatingOrder(null); }
  };
  const handlePrintInvoice = (order) => {
    try {
      printDispatchInvoice(order);
    } catch (error) {
      toast.error(error.message || "Could not open the invoice");
    }
  };

  const renderItemRows = (form, setter) => <div className="order-items-editor">
    {form.items.map((item, index) => <div className="order-item-editor" key={index}>
      <label className="order-item-drug"><span>Medicine</span><select value={item.drug} onChange={(event) => updateItem(setter, form, index, "drug", event.target.value)} required><option value="">Select drug</option>{drugs.map((drug) => <option key={drug._id} value={drug._id}>{drug.name}</option>)}</select></label>
      <label><span>Qty</span><input type="number" min="1" value={item.quantity} onChange={(event) => updateItem(setter, form, index, "quantity", Number(event.target.value))} required /></label>
      <label><span>Unit price (₹)</span><input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => updateItem(setter, form, index, "unitPrice", Number(event.target.value))} required /></label>
      <div className="order-line-total"><span>Line total</span><strong>{money(Number(item.quantity || 0) * Number(item.unitPrice || 0))}</strong></div>
      {form.items.length > 1 && <button className="remove-item-button" type="button" aria-label={`Remove item ${index + 1}`} onClick={() => removeItemRow(setter, form, index)}><Minus size={15} /></button>}
    </div>)}
    <Button type="button" variant="secondary" size="sm" onClick={() => addItemRow(setter, form)}><Plus size={14} /> Add another item</Button>
    <div className="order-grand-total"><span>Order total</span><strong>{money(totalFor(form.items))}</strong></div>
  </div>;

  return (
    <div className="page inventory-page">
      <div className="page-intro">
        <div><span className="page-eyebrow">PURCHASING &amp; FULFILMENT</span><h2>Orders</h2><p>Manage purchasing, dispatches and order progress.</p></div>
        <div className="page-action-group">
          <Button variant="secondary" onClick={() => downloadCsv("orders.csv", [
            { label: "Order ID", value: (order) => order._id },
            { label: "Type", value: (order) => order.orderType },
            { label: "Supplier / Buyer", value: (order) => order.orderType === "purchase" ? order.supplier?.name : order.buyerName },
            { label: "Items", value: (order) => order.items?.map((item) => `${item.drug?.name || "Medicine"} x${item.quantity}`).join("; ") },
            { label: "Amount", value: (order) => order.totalAmount },
            { label: "Status", value: (order) => order.status },
            { label: "Created", value: (order) => order.createdAt?.slice(0, 10) },
          ], filteredOrders)}><Download size={15} /> Export page CSV</Button>
          {canEdit && <><Button variant="secondary" onClick={() => setShowPurchaseForm(true)}><ShoppingCart size={15} /> Purchase order</Button><Button onClick={() => setShowDispatchForm(true)}><Truck size={15} /> Dispatch order</Button></>}
        </div>
      </div>
      <div className="orders-toolbar">
        <div className="order-tabs">{[{ id: "all", label: "All orders" }, { id: "purchase", label: "Purchase" }, { id: "dispatch", label: "Dispatch" }].map(({ id, label }) => <button key={id} onClick={() => { setTab(id); setPage(1); }} className={tab === id ? "active" : ""}>{label}<span>{counts[id]}</span></button>)}</div>
        <SearchInput className="orders-search" value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search orders..." />
        <SavedFilters storageKey="medistock:saved-filters:orders" value={{ search, tab }} onLoad={(saved) => {
          setSearch(saved.search || "");
          setTab(saved.tab || "all");
          setPage(1);
        }} />
      </div>
      {error && <div className="error-banner" role="alert">{error}</div>}
      <section className="inventory-panel">
        {loading ? <div className="table-loading">{Array.from({ length: 6 }, (_, index) => <Skeleton className="skeleton-row" key={index} />)}</div> : filteredOrders.length ? <><div className="table-scroll"><table className="data-table inventory-table orders-table"><thead><tr><th>ORDER</th><th>TYPE</th><th>SUPPLIER / BUYER</th><th>ITEMS</th><th>AMOUNT</th><th>STATUS</th><th>CREATED</th><th>INVOICE</th>{canEdit && <th>UPDATE</th>}</tr></thead><tbody>
          {filteredOrders.map((order) => <tr key={order._id}>
            <td><span className="order-number">#{String(order._id).slice(-7).toUpperCase()}</span></td>
            <td><span className={`order-type-pill ${order.orderType}`}><i />{order.orderType}</span></td>
            <td><strong className="table-strong">{order.orderType === "purchase" ? order.supplier?.name || "—" : order.buyerName || "—"}</strong></td>
            <td>{order.items?.length || 0} item{order.items?.length === 1 ? "" : "s"}</td><td className="price-cell">{money(order.totalAmount)}</td>
            <td><span className={orderStatus(order.status)}><i />{order.status}</span></td><td>{formatDate(order.createdAt)}</td>
            <td>{order.orderType === "dispatch" ? <Button size="sm" variant="secondary" onClick={() => handlePrintInvoice(order)}><FileText size={13} /> Print</Button> : <span className="muted-dash">—</span>}</td>
            {canEdit && <td>{order.orderType === "purchase" && order.status !== "delivered" && order.status !== "cancelled" ? <select className="status-select" aria-label={`Update status for order ${String(order._id).slice(-6)}`} value="" disabled={updatingOrder === order._id} onChange={(event) => event.target.value && handleStatusChange(order._id, event.target.value)}><option value="">Update status</option><option value="approved">Approved</option><option value="shipped">Shipped</option><option value="cancelled">Cancelled</option></select> : <span className="muted-dash">—</span>}</td>}
          </tr>)}
        </tbody></table></div><div className="pagination-bar"><span>Showing <strong>{(page - 1) * 20 + 1}–{Math.min(page * 20, total)}</strong> of <strong>{total}</strong> orders</span><div><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage(page + 1)}>Next</button></div></div></> : <EmptyState title="No orders found" message={search ? "Try changing the order type filter or search." : "Purchase and dispatch orders will appear here."} action={canEdit && <div className="page-action-group"><Button size="sm" variant="secondary" onClick={() => setShowPurchaseForm(true)}><ShoppingCart size={14} /> Purchase</Button><Button size="sm" onClick={() => setShowDispatchForm(true)}><Truck size={14} /> Dispatch</Button></div>} />}
      </section>
      {showPurchaseForm && <Modal title="New purchase order" onClose={() => setShowPurchaseForm(false)} className="form-modal order-modal" labelledBy="purchase-order-title">
        <form className="modal-form" onSubmit={handlePurchaseSubmit}><p className="modal-subtitle">Request stock from a registered supplier.</p>
          {error && <div className="error-banner" role="alert">{error}</div>}
          <label className="form-field form-span-two">Supplier<select value={purchaseForm.supplier} onChange={(event) => setPurchaseForm({ ...purchaseForm, supplier: event.target.value })} required><option value="">Select supplier</option>{suppliers.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}</option>)}</select></label>
          <div className="order-items-label">Order items</div>{renderItemRows(purchaseForm, setPurchaseForm)}
          <label className="form-field">Notes (optional)<textarea rows="2" value={purchaseForm.notes} onChange={(event) => setPurchaseForm({ ...purchaseForm, notes: event.target.value })} /></label>
          <div className="modal-actions"><Button variant="secondary" type="button" onClick={() => setShowPurchaseForm(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create purchase order"}</Button></div>
        </form>
      </Modal>}
      {showDispatchForm && <Modal title="New dispatch order" onClose={() => setShowDispatchForm(false)} className="form-modal order-modal" labelledBy="dispatch-order-title">
        <form className="modal-form" onSubmit={handleDispatchSubmit}><p className="modal-subtitle">Stock is allocated by earliest-expiry-first (FEFO).</p>
          {error && <div className="error-banner" role="alert">{error}</div>}
          <label className="form-field form-span-two">Buyer name<input value={dispatchForm.buyerName} onChange={(event) => setDispatchForm({ ...dispatchForm, buyerName: event.target.value })} required /></label>
          <div className="order-items-label">Order items</div>{renderItemRows(dispatchForm, setDispatchForm)}
          <label className="form-field">Notes (optional)<textarea rows="2" value={dispatchForm.notes} onChange={(event) => setDispatchForm({ ...dispatchForm, notes: event.target.value })} /></label>
          <div className="modal-actions"><Button variant="secondary" type="button" onClick={() => setShowDispatchForm(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Dispatching..." : "Create dispatch"}</Button></div>
        </form>
      </Modal>}
    </div>
  );
};

export default Orders;
