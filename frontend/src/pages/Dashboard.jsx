import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, AlertTriangle, ArrowRight, ArrowUpRight, Boxes, CircleDollarSign,
  Clock3, Package, Plus, ShieldCheck, ShoppingCart, Truck, Warehouse,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { incidentService } from "../services/incidents";
import { requestService } from "../services/requests";
import { insightService } from "../services/insights";
import { supplierService } from "../services/suppliers";

const CHART_COLORS = ["#0f766e", "#3b82f6", "#79b8a7", "#f2ad49", "#8b7be8", "#e27f71"];
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
const date = (value) => value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const StatCard = ({ label, value, Icon, tone, footnote, to }) => {
  const content = (
    <>
      <div className="stat-top"><span className={`stat-icon ${tone}`}><Icon size={19} /></span></div>
      <strong className="stat-value">{value}</strong><span className="stat-label">{label}</span>
      {footnote && <span className="stat-footnote">{footnote}</span>}
    </>
  );
  return to ? <Link to={to} className={`dashboard-stat ${tone}`}>{content}</Link> : <div className={`dashboard-stat ${tone}`}>{content}</div>;
};

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [attention, setAttention] = useState({ expiring: [], expired: [], lowStock: [] });
  const [orders, setOrders] = useState([]);
  const [demand, setDemand] = useState({ periodDays: 30, leadTimeDays: 7, forecasts: [] });
  const [error, setError] = useState("");
  const canEdit = user?.role === "admin" || user?.role === "pharmacist";
  const openIncidents = useQuery({
    queryKey: ["incidents", { status: "open", limit: "5" }],
    queryFn: () => incidentService.list({ status: "open", limit: "5" }),
    enabled: canEdit,
  });
  const topDemand = useQuery({
    queryKey: ["top-demand", 30],
    queryFn: () => requestService.topDemand(30),
    enabled: canEdit,
  });
  const reorderSuggestions = useQuery({
    queryKey: ["reorder-suggestions"],
    queryFn: insightService.reorderSuggestions,
    enabled: canEdit,
  });
  const supplierLeaderboard = useQuery({
    queryKey: ["supplier-leaderboard"],
    queryFn: supplierService.leaderboard,
  });
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const results = await Promise.allSettled([
        api.get("/dashboard"),
        api.get("/batches/alerts/expiry", { params: { days: 30 } }),
        api.get("/batches/alerts/low-stock"),
        api.get("/orders"),
        api.get("/dashboard/demand"),
      ]);
      if (!active) return;
      const [dashboardRes, expiryRes, lowStockRes, ordersRes, demandRes] = results;
      if (dashboardRes.status === "fulfilled") setStats(dashboardRes.value.data);
      else setError(dashboardRes.reason.response?.data?.message || "Failed to load dashboard");
      if (expiryRes.status === "fulfilled") {
        setAttention((current) => ({ ...current, expiring: expiryRes.value.data.expiringSoon || [], expired: expiryRes.value.data.expired || [] }));
      } else toast.error(expiryRes.reason.response?.data?.message || "Could not load expiry alerts");
      if (lowStockRes.status === "fulfilled") {
        const data = lowStockRes.value.data;
        setAttention((current) => ({ ...current, lowStock: Array.isArray(data) ? data : (data.drugs || []) }));
      } else toast.error(lowStockRes.reason.response?.data?.message || "Could not load low-stock alerts");
      if (ordersRes.status === "fulfilled") setOrders(ordersRes.value.data);
      else toast.error(ordersRes.reason.response?.data?.message || "Could not load recent orders");
      if (demandRes.status === "fulfilled") setDemand(demandRes.value.data);
      else toast.error(demandRes.reason.response?.data?.message || "Could not load demand forecast");
    };
    load();
    return () => { active = false; };
  }, []);

  if (error && !stats) return <div className="page"><div className="error-banner" role="alert">{error}</div></div>;
  if (!stats) return <div className="page"><div className="dashboard-skeleton"><div className="skeleton skeleton-banner" /><div className="skeleton-grid">{Array.from({ length: 4 }, (_, index) => <div className="skeleton skeleton-stat" key={index} />)}</div><div className="skeleton skeleton-panel" /></div></div>;

  const categoryData = (stats.categoryBreakdown || []).map((category) => ({ name: category._id || "Uncategorized", value: category.totalStock }));
  const orderData = (stats.ordersByStatus || []).map((order) => ({ name: `${order._id.orderType} (${order._id.status})`, count: order.count }));
  const recentOrders = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  return (
    <div className="page dashboard-page">
      <section className="welcome-banner">
        <div className="welcome-copy">
          <span className="welcome-eyebrow"><span /> YOUR INVENTORY, IN FOCUS</span>
          <h2>{greeting}, {user?.name?.split(" ")[0] || "there"}</h2>
          <p>Here’s the latest pulse of your pharmaceutical inventory.</p>
          <div className="welcome-actions">
            {canEdit && <Link className="welcome-primary-action" to="/batches?receive=1"><Plus size={15} /> Receive stock</Link>}
            {canEdit && <Link className="welcome-secondary-action" to="/orders?new=dispatch"><ArrowUpRight size={15} /> New dispatch</Link>}
            {canEdit && <Link className="welcome-secondary-action" to="/drugs?new=1"><Plus size={15} /> Add drug</Link>}
          </div>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="welcome-glow" />
          <svg className="welcome-pharma-illustration" viewBox="0 0 230 170" aria-hidden="true">
            <defs><linearGradient id="dash-glass" x1="0" x2="1"><stop stopColor="#e7fff8" stopOpacity=".45" /><stop offset=".48" stopColor="#fff" stopOpacity=".93" /><stop offset="1" stopColor="#b5e3d7" stopOpacity=".48" /></linearGradient></defs>
            <ellipse cx="119" cy="157" rx="76" ry="9" fill="#053c37" opacity=".25" />
            <g transform="translate(84 27)"><rect x="12" width="43" height="15" rx="3" fill="#d7eee9" /><rect x="6" y="15" width="55" height="12" fill="#e7f5f0" /><rect y="26" width="67" height="102" rx="13" fill="url(#dash-glass)" stroke="#d5eee8" /><rect x="10" y="63" width="47" height="26" rx="4" fill="#f4fff9" opacity=".88" /><text x="33" y="74" textAnchor="middle" fill="#218273" fontSize="6" fontFamily="sans-serif" letterSpacing="1">MEDI</text><text x="33" y="82" textAnchor="middle" fill="#218273" fontSize="6" fontFamily="sans-serif" letterSpacing="1">STOCK</text><g fill="#e0ac68"><rect x="13" y="40" width="6" height="13" rx="4" transform="rotate(-25 16 46)" /><rect x="27" y="37" width="6" height="13" rx="4" transform="rotate(23 30 43)" /><rect x="42" y="43" width="6" height="13" rx="4" transform="rotate(-14 45 49)" /></g></g>
            <g transform="translate(28 40) rotate(-26)"><rect width="52" height="18" rx="9" fill="#f4d48e" /><path d="M26 1v16" stroke="#fff8e1" strokeWidth="2" /></g>
            <g transform="translate(156 47) rotate(27)"><rect width="58" height="19" rx="10" fill="#f1d28e" /><path d="M29 1v17" stroke="#fff8e1" strokeWidth="2" /></g>
            <circle cx="48" cy="121" r="10" fill="#e3f5ed" /><circle cx="183" cy="121" r="7" fill="#f4dda5" />
          </svg>
          <div className="welcome-pill welcome-pill-a"><i /><i /></div><div className="welcome-pill welcome-pill-b"><i /><i /></div>
          <div className="welcome-capsule"><span /><span /></div>
          <div className="welcome-bottle"><span className="welcome-bottle-cap" /><span className="welcome-bottle-body"><b>MEDI<br />STOCK</b><i /><i /><i /></span></div>
          <div className="welcome-leaf leaf-a" /><div className="welcome-leaf leaf-b" />
        </div>
        <span className={`welcome-role role-badge role-${user?.role}`}><ShieldCheck size={12} /> {user?.role}</span>
      </section>
      {error && <div className="error-banner" role="alert">{error}</div>}
      <div className="section-heading"><div><h2>Inventory overview</h2><p>Key indicators across your operation</p></div></div>
      <div className="dashboard-stat-grid">
        <StatCard label="Total drugs" value={stats.totalDrugs ?? 0} Icon={Package} tone="teal" to="/drugs" />
        <StatCard label="Active batches" value={stats.totalBatches ?? 0} Icon={Boxes} tone="blue" to="/batches" />
        <StatCard label="Suppliers" value={stats.totalSuppliers ?? 0} Icon={Truck} tone="violet" to="/suppliers" />
        <StatCard label="Stock units" value={(stats.totalStockUnits ?? 0).toLocaleString("en-IN")} Icon={Warehouse} tone="cyan" to="/batches" />
        <StatCard label="Stock value" value={money(stats.totalStockValue)} Icon={CircleDollarSign} tone="green" footnote="Current inventory valuation" />
        <StatCard label="Low stock" value={stats.lowStockCount ?? 0} Icon={AlertTriangle} tone="warning" to="/drugs" />
        <StatCard label="Expiring in 30 days" value={stats.expiringSoonCount ?? 0} Icon={Clock3} tone="amber" to="/batches" />
        <StatCard label="Expired in stock" value={stats.expiredCount ?? 0} Icon={AlertTriangle} tone="danger" to="/batches" />
      </div>
      <div className="dashboard-section-grid">
        <section className="panel chart-panel">
          <div className="panel-heading"><div><h3>Stock by category</h3><p>Units currently available</p></div><span className="panel-menu-label">CATEGORY</span></div>
          {categoryData.length ? <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={66} outerRadius={98} paddingAngle={3} stroke="none">
                  {categoryData.map((_, index) => <Cell key={`category-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => [Number(value).toLocaleString("en-IN"), "Units"]} contentStyle={{ borderRadius: 10, border: "1px solid #e5ecee", fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="chart-center-label"><strong>{(stats.totalStockUnits ?? 0).toLocaleString("en-IN")}</strong><span>Total units</span></div>
          </div> : <div className="chart-empty"><Package size={24} /><span>No category stock data yet.</span></div>}
          <div className="chart-legend">{categoryData.map((item, index) => <span key={item.name}><i style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />{item.name}</span>)}</div>
        </section>
        <section className="panel chart-panel">
          <div className="panel-heading"><div><h3>Orders by type &amp; status</h3><p>Order volume across statuses</p></div><span className="panel-menu-label">ORDERS</span></div>
          {orderData.length ? <ResponsiveContainer width="100%" height={260}>
            <BarChart data={orderData} margin={{ top: 12, right: 5, left: -15, bottom: 10 }}>
              <CartesianGrid stroke="#edf1f2" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#75858d" }} interval={0} angle={-20} textAnchor="end" height={62} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#87969d" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e5ecee", fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="count" name="Orders" fill="#0f766e" radius={[5, 5, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer> : <div className="chart-empty"><ShoppingCart size={24} /><span>No orders to chart yet.</span></div>}
        </section>
      </div>
      <div className="dashboard-section-grid attention-grid">
        <section className="panel attention-panel">
          <div className="panel-heading"><div><h3>Needs attention</h3><p>Expiring batches coming up</p></div><Link className="panel-link" to="/batches">View all <ArrowRight size={14} /></Link></div>
          {attention.expiring.length ? <div className="attention-list">{attention.expiring.slice(0, 4).map((batch) => {
            const daysLeft = Math.ceil((new Date(batch.expiryDate) - new Date()) / 86400000);
            return <div className="attention-row" key={batch._id}><span className="attention-icon amber"><Clock3 size={16} /></span><div className="attention-main"><strong>{batch.drug?.name || "Unknown drug"}</strong><span>Batch {batch.batchNumber} · {batch.quantityInStock} units</span></div><span className="days-chip">{daysLeft} days left</span></div>;
          })}</div> : <div className="attention-empty"><ShieldCheck size={18} /> No batches expiring within 30 days</div>}
        </section>
        <section className="panel attention-panel">
          <div className="panel-heading"><div><h3>Low stock watch</h3><p>Drugs at or below reorder level</p></div><Link className="panel-link" to="/drugs">View drugs <ArrowRight size={14} /></Link></div>
          {attention.lowStock.length ? <div className="attention-list">{attention.lowStock.slice(0, 4).map((item) => {
            const drug = item.drug || item;
            return <div className="attention-row" key={drug._id}><span className="attention-icon red"><AlertTriangle size={16} /></span><div className="attention-main"><strong>{drug.name}</strong><span>{item.totalStock ?? item.currentStock ?? 0} in stock · reorder at {item.reorderThreshold ?? drug.reorderThreshold}</span></div><span className="low-stock-chip">Low stock</span></div>;
          })}</div> : <div className="attention-empty"><ShieldCheck size={18} /> No drugs currently below reorder level</div>}
        </section>
      </div>
      <section className="panel demand-panel">
        <div className="panel-heading">
          <div><h3>Demand forecast</h3><p>Dispatch sales from the last {demand.periodDays} days · {demand.leadTimeDays}-day supplier lead-time allowance</p></div>
          <Link className="panel-link" to="/orders">View dispatches <ArrowRight size={14} /></Link>
        </div>
        {demand.forecasts.some((item) => item.unitsDispatched > 0) ? <>
          <div className="demand-table-scroll">
            <table className="data-table demand-table">
              <thead><tr><th>MEDICINE</th><th>DISPATCHED</th><th>AVG / DAY</th><th>SELLABLE STOCK</th><th>STOCK COVER</th><th>SUGGESTED REORDER</th></tr></thead>
              <tbody>{demand.forecasts.filter((item) => item.unitsDispatched > 0).slice(0, 8).map((item) => (
                <tr key={item.drug._id}>
                  <td><strong>{item.drug.name}</strong>{item.atRisk && <span className="demand-risk-badge">At risk</span>}</td>
                  <td>{item.unitsDispatched} units</td>
                  <td>{item.averageDailyDemand} / day</td>
                  <td>{item.currentStock} / {item.reorderThreshold} threshold</td>
                  <td>{item.daysOfStock === null ? "—" : `${item.daysOfStock} days`}</td>
                  <td>{item.recommendedOrderQuantity ? `${item.recommendedOrderQuantity} ${item.drug.unit || "units"}` : "No reorder suggested"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <p className="demand-disclaimer">Planning estimate based on recorded dispatches, not a guarantee. Review supplier availability and lead times before ordering.</p>
        </> : <div className="attention-empty"><ShoppingCart size={18} /> No dispatch history from the last {demand.periodDays} days yet. Add sample data or record dispatches to see demand estimates.</div>}
      </section>
      <section className="panel recent-orders-panel">
        <div className="panel-heading"><div><h3>Recent orders</h3><p>Most recently created purchase and dispatch orders</p></div><Link className="panel-link" to="/orders">All orders <ArrowRight size={14} /></Link></div>
        {recentOrders.length ? <div className="table-scroll"><table className="data-table dashboard-table"><thead><tr><th>ORDER</th><th>TYPE</th><th>PARTY</th><th>ITEMS</th><th>AMOUNT</th><th>STATUS</th><th>DATE</th></tr></thead><tbody>{recentOrders.map((order) => <tr key={order._id}><td><span className="order-number">#{String(order._id).slice(-6).toUpperCase()}</span></td><td><span className={`badge ${order.orderType === "purchase" ? "ok" : "info"}`}>{order.orderType}</span></td><td>{order.orderType === "purchase" ? order.supplier?.name : order.buyerName}</td><td>{order.items?.length || 0} items</td><td>{money(order.totalAmount)}</td><td><span className={`status-pill status-${order.status}`}>{order.status}</span></td><td>{date(order.createdAt)}</td></tr>)}</tbody></table></div> : <div className="attention-empty"><ShoppingCart size={18} /> No orders have been created yet.</div>}
      </section>
      <section className="dashboard-section-grid insight-widgets">
        {canEdit && <article className="panel widget-panel">
          <div className="panel-heading"><div><h3>Open incidents</h3><p>Supplier follow-ups requiring attention</p></div><Link className="panel-link" to="/incidents">View all <ArrowRight size={14} /></Link></div>
          {openIncidents.isLoading ? <div className="attention-empty">Loading incidents…</div> : (openIncidents.data?.items || []).length ? (openIncidents.data.items || []).slice(0, 4).map((incident) => <div className="attention-row" key={incident._id}><span className="attention-icon red"><AlertTriangle size={15} /></span><div className="attention-main"><strong>{incident.type.replaceAll("_", " ")}</strong><span>{incident.drug?.name} · {incident.supplier?.name}</span></div><span className="low-stock-chip">{incident.status.replaceAll("_", " ")}</span></div>) : <div className="attention-empty">No open incidents.</div>}
        </article>}
        {canEdit && <article className="panel widget-panel">
          <div className="panel-heading"><div><h3>Top unavailable drugs</h3><p>Customer demand over the last 30 days</p></div><Link className="panel-link" to="/requests">Manage requests <ArrowRight size={14} /></Link></div>
          {(topDemand.data?.items || []).length ? topDemand.data.items.slice(0, 4).map((item) => <div className="attention-row" key={item._id}><span className="attention-icon amber"><Package size={15} /></span><div className="attention-main"><strong>{item.drugName}</strong><span>{item.quantityRequested} units requested</span></div><span className="days-chip">{item.requestCount} requests</span></div>) : <div className="attention-empty">No unavailable-drug requests yet.</div>}
        </article>}
        {canEdit && <article className="panel widget-panel">
          <div className="panel-heading"><div><h3>Reorder suggestions</h3><p>Stock cover, sales velocity and supplier lead time</p></div><Link className="panel-link" to="/orders">Create order <ArrowRight size={14} /></Link></div>
          {(reorderSuggestions.data || []).length ? reorderSuggestions.data.slice(0, 4).map((item) => <div className="attention-row" key={item.drug._id}><span className="attention-icon info"><Boxes size={15} /></span><div className="attention-main"><strong>{item.drug.name}</strong><span>{item.currentStock} in stock · suggest {item.suggestedQuantity}</span></div><span className="days-chip">{item.bestSupplier?.name || "No supplier"}</span></div>) : <div className="attention-empty">No reorder recommendations right now.</div>}
        </article>}
        <article className="panel widget-panel">
          <div className="panel-heading"><div><h3>Supplier reliability</h3><p>Highest-performing supply partners</p></div><Link className="panel-link" to="/suppliers">Suppliers <ArrowRight size={14} /></Link></div>
          {(supplierLeaderboard.data || []).slice(0, 4).length ? supplierLeaderboard.data.slice(0, 4).map((item) => <div className="attention-row" key={item.supplier._id}><span className="attention-icon teal"><Truck size={15} /></span><div className="attention-main"><strong>{item.supplier.name}</strong><span>{item.avgLeadTimeDays?.toFixed?.(1) ?? item.avgLeadTimeDays ?? "—"} day avg lead · {item.openIncidents} open incidents</span></div><span className="days-chip">{Math.round(item.reliabilityScore)} / 100</span></div>) : <div className="attention-empty">Supplier scores will appear as deliveries are recorded.</div>}
        </article>
      </section>
      <div className="dashboard-bottom-note"><Activity size={14} /><span>Inventory data synced with your supply chain workspace</span><span className="bottom-note-role">{user?.role} access</span></div>
    </div>
  );
};

export default Dashboard;
