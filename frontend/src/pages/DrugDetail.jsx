import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import toast from "react-hot-toast";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import { useDrugInsights } from "../hooks/useInventoryQueries";
import { incidentService } from "../services/incidents";
import { requestService } from "../services/requests";

const currency = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value) || 0);
const tabs = ["Overview", "Purchase History", "Sales Performance", "Quality", "Suppliers"];

export default function DrugDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("Overview");
  const [request, setRequest] = useState({ customerName: "", customerContact: "", quantity: 1, notes: "" });
  const [showRequest, setShowRequest] = useState(false);
  const queryClient = useQueryClient();
  const insights = useDrugInsights(id);
  const incidents = useQuery({
    queryKey: ["incidents", { drug: id }],
    queryFn: () => incidentService.list({ drug: id }),
    enabled: Boolean(id),
  });
  const requestMutation = useMutation({
    mutationFn: (payload) => requestService.create({ ...payload, drugName: insights.data.drug.name }),
    onSuccess: () => {
      toast.success("Customer request recorded");
      setShowRequest(false);
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not record request"),
  });
  if (insights.isLoading) return <section className="page inventory-page"><Skeleton rows={7} /></section>;
  if (insights.isError) return <section className="page inventory-page"><EmptyState title="Drug details unavailable" description={insights.error?.response?.data?.message || "Please try again."} /></section>;
  const data = insights.data;
  const sales = data.salesPerformance;

  return <section className="page inventory-page">
    <div className="page-intro detail-intro">
      <div><span className="page-eyebrow">DRUG PROFILE</span><h2>{data.drug.name}</h2><p>{data.drug.genericName || data.drug.category} · {data.drug.manufacturer || "Manufacturer not set"}</p></div>
      <div className="page-action-group"><Button variant="secondary" onClick={() => navigate("/drugs")}>Back to drugs</Button><Button onClick={() => setShowRequest(true)}>Report customer request</Button></div>
    </div>
    <nav className="detail-tabs" aria-label="Drug detail sections">{tabs.map((item) => <button className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)}>{item}</button>)}</nav>
    {tab === "Overview" && <div className="detail-grid">
      <article className="detail-card"><span>Current sellable stock</span><strong>{data.currentStock} {data.drug.unit}</strong><small>Reorder threshold: {data.drug.reorderThreshold}</small></article>
      <article className="detail-card"><span>Last purchase</span><strong>{data.lastPurchase ? data.lastPurchase.supplier?.name : "No purchase history"}</strong><small>{data.lastPurchase ? `${new Date(data.lastPurchase.date).toLocaleDateString()} · ${data.lastPurchase.quantity} units at ${currency(data.lastPurchase.price)}` : "—"}</small></article>
      <article className="detail-card"><span>Sell-through</span><strong>{sales.sellThroughRate.toFixed(1)}%</strong><small>{sales.avgDaysToSell ? `${sales.avgDaysToSell.toFixed(1)} avg days to sell` : "Not enough dispatch history"}</small></article>
      <article className="detail-card"><span>Quality rating</span><strong>{data.quality.avgRating ? `${"★".repeat(Math.round(data.quality.avgRating))} ${data.quality.avgRating.toFixed(1)}` : "Not rated"}</strong><small>{data.quality.ratingsCount} batch ratings · {data.quality.incidentCount} incidents</small></article>
    </div>}
    {tab === "Purchase History" && <section className="inventory-panel detail-panel">
      {data.purchaseHistory.length === 0 ? <EmptyState title="No purchase history" description="Received batches will show up here." /> : <>
        <p className="detail-highlight">Last purchased from <strong>{data.lastPurchase?.supplier?.name}</strong> on {data.lastPurchase ? new Date(data.lastPurchase.date).toLocaleDateString() : "—"}, {data.lastPurchase?.quantity} units @ {currency(data.lastPurchase?.price)}</p>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Received</th><th>Batch</th><th>Supplier</th><th>Quantity</th><th>Unit cost</th><th>Expiry</th><th>Status</th></tr></thead><tbody>{data.purchaseHistory.map((item) => <tr key={item.batchId}><td>{new Date(item.receivedDate).toLocaleDateString()}</td><td>{item.batchNumber}</td><td>{item.supplier?.name}</td><td>{item.quantityReceived}</td><td>{currency(item.purchasePrice)}</td><td>{new Date(item.expiryDate).toLocaleDateString()}</td><td>{item.status}</td></tr>)}</tbody></table></div>
      </>}
    </section>}
    {tab === "Sales Performance" && <div className="detail-content">
      <div className="detail-grid"><article className="detail-card"><span>Average days to sell</span><strong>{sales.avgDaysToSell?.toFixed(1) ?? "—"}</strong></article><article className="detail-card"><span>Sell-through</span><strong>{sales.sellThroughRate.toFixed(1)}%</strong></article><article className="detail-card"><span>Estimated days to stockout</span><strong>{sales.estimatedDaysUntilStockout?.toFixed(1) ?? "—"}</strong></article><article className="detail-card"><span>Daily dispatch (30d avg)</span><strong>{sales.avgDailyDispatchLast30Days.toFixed(2)}</strong></article></div>
      <div className="chart-grid"><article className="detail-card chart-card"><h3>Days to sell by batch</h3><ResponsiveContainer width="100%" height={260}><BarChart data={sales.perBatch}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="batchNumber" /><YAxis /><Tooltip /><Bar dataKey="daysToSell" fill="#188c7b" /></BarChart></ResponsiveContainer></article>
        <article className="detail-card chart-card"><h3>Dispatch volume · last 30 days</h3><ResponsiveContainer width="100%" height={260}><LineChart data={sales.dispatchTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Line type="monotone" dataKey="quantity" stroke="#2780a0" strokeWidth={2} /></LineChart></ResponsiveContainer></article>
      </div>
    </div>}
    {tab === "Quality" && <div className="detail-grid">
      <article className="detail-card"><span>Average rating</span><strong>{data.quality.avgRating ? `${data.quality.avgRating.toFixed(1)} / 5` : "Not rated"}</strong><small>{data.quality.ratingsCount} rated batches</small></article>
      <article className="detail-card"><span>Damage rate</span><strong>{data.quality.damageRate.toFixed(1)}%</strong></article>
      <article className="detail-card"><span>Expired write-off rate</span><strong>{data.quality.expiredWriteOffRate.toFixed(1)}%</strong></article>
      <article className="detail-card"><span>Quality tags</span><div className="tag-list">{data.quality.commonTags.length ? data.quality.commonTags.map((tag) => <span key={tag}>{tag}</span>) : "No tags yet"}</div></article>
      <article className="detail-card detail-span-two"><span>Past incidents</span>{incidents.isLoading ? "Loading…" : (incidents.data?.items || []).map((item) => <p key={item._id}>{item.type.replaceAll("_", " ")} · {new Date(item.createdAt).toLocaleDateString()} · {item.reason}</p>)}</article>
    </div>}
    {tab === "Suppliers" && <section className="inventory-panel detail-panel">
      {data.supplierComparison.length === 0 ? <EmptyState title="No supplier comparisons" description="Purchase history will populate supplier performance." /> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Supplier</th><th>Batches</th><th>Units bought</th><th>Avg unit cost</th><th>Lead time</th><th>Rating</th><th>Damage</th><th>Avg days to sell</th><th /></tr></thead><tbody>{data.supplierComparison.map((supplier, index) => <tr key={supplier.supplier?._id || supplier.supplier}><td>{supplier.supplier?.name} {index === 0 && <span className="status-pill status-delivered">Best</span>}</td><td>{supplier.batches}</td><td>{supplier.unitsBought}</td><td>{currency(supplier.avgPurchasePrice)}</td><td>{supplier.avgLeadTimeDays ?? "—"} days</td><td>{supplier.avgRating?.toFixed(1) ?? "—"}</td><td>{supplier.damageRate.toFixed(1)}%</td><td>{supplier.avgDaysToSell?.toFixed(1) ?? "—"}</td><td><Button size="sm" variant="secondary" onClick={() => navigate("/requests")}>Request quote</Button></td></tr>)}</tbody></table></div>}
    </section>}
    {showRequest && <form className="detail-card request-capture" onSubmit={(event) => { event.preventDefault(); requestMutation.mutate({ ...request, quantity: Number(request.quantity) }); }}>
      <h3>Record customer demand</h3><div className="form-grid">
        <label className="form-field">Quantity<input type="number" min="1" value={request.quantity} onChange={(e) => setRequest({ ...request, quantity: e.target.value })} required /></label>
        <label className="form-field">Customer name<input value={request.customerName} onChange={(e) => setRequest({ ...request, customerName: e.target.value })} /></label>
        <label className="form-field">Contact<input value={request.customerContact} onChange={(e) => setRequest({ ...request, customerContact: e.target.value })} /></label>
        <label className="form-field">Notes<input value={request.notes} onChange={(e) => setRequest({ ...request, notes: e.target.value })} /></label>
      </div><div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setShowRequest(false)}>Cancel</Button><Button type="submit" disabled={requestMutation.isPending}>Save request</Button></div>
    </form>}
  </section>;
}
