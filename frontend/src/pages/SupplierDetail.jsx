import { useNavigate, useParams } from "react-router-dom";
import { useSupplierScorecard } from "../hooks/useInventoryQueries";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value) || 0);

export default function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useSupplierScorecard(id);
  if (query.isLoading) return <section className="page inventory-page"><Skeleton rows={6} /></section>;
  if (query.isError) return <section className="page inventory-page"><EmptyState title="Supplier scorecard unavailable" description={query.error?.response?.data?.message || "Please try again."} /></section>;
  const { supplier, totals } = query.data;
  return <section className="page inventory-page">
    <div className="page-intro"><div><span className="page-eyebrow">SUPPLIER PERFORMANCE</span><h2>{supplier.name}</h2><p>{supplier.contactPerson || "Supplier"} · {supplier.email || "No email"} · {supplier.leadTimeDays} day standard lead time</p></div><Button variant="secondary" onClick={() => navigate("/suppliers")}>Back to suppliers</Button></div>
    <div className="scorecard-hero"><div className="reliability-gauge" style={{ "--score": `${totals.reliabilityScore}%` }}><strong>{Math.round(totals.reliabilityScore)}</strong><span>Reliability</span></div><p>Calculated from delivery timeliness, damaged/expired stock, and open incidents.</p></div>
    <div className="detail-grid">
      <article className="detail-card"><span>Total spend</span><strong>{money(totals.spend)}</strong></article>
      <article className="detail-card"><span>Units purchased</span><strong>{totals.unitsBought.toLocaleString("en-IN")}</strong></article>
      <article className="detail-card"><span>Avg. lead time</span><strong>{totals.avgLeadTimeDays?.toFixed(1) ?? "—"} days</strong></article>
      <article className="detail-card"><span>On-time deliveries</span><strong>{totals.onTimeDeliveryRate.toFixed(1)}%</strong></article>
      <article className="detail-card"><span>Avg. quality rating</span><strong>{totals.avgQualityRating?.toFixed(1) ?? "Not rated"}</strong></article>
      <article className="detail-card"><span>Damage / expiry</span><strong>{totals.damageRate.toFixed(1)}% / {totals.expiredRate.toFixed(1)}%</strong></article>
      <article className="detail-card"><span>Open incidents</span><strong>{totals.openIncidents}</strong></article>
      <article className="detail-card"><span>Received batches</span><strong>{totals.batches}</strong></article>
    </div>
    <section className="request-section"><h3>Performance formula</h3><p className="muted-copy">Score starts at 100. Penalties are 30% for late delivery, 40% for damaged units, 20% for expired write-offs, plus 2 points per open incident (capped at 10). Result is clamped to 0–100.</p></section>
  </section>;
}
