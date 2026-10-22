import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import { useBatchDetails } from "../hooks/useInventoryQueries";
import { insightService } from "../services/insights";

export default function BatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [damageOpen, setDamageOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const batchQuery = useBatchDetails(id);
  const updateQuery = () => {
    queryClient.invalidateQueries({ queryKey: ["batch-details", id] });
    queryClient.invalidateQueries({ queryKey: ["batches"] });
    queryClient.invalidateQueries({ queryKey: ["incidents"] });
  };
  const damageMutation = useMutation({
    mutationFn: insightService.reportDamage,
    onSuccess: () => { toast.success("Damage reported and supplier notified"); setDamageOpen(false); updateQuery(); },
    onError: (error) => toast.error(error.response?.data?.message || "Could not report damage"),
  });
  const qualityMutation = useMutation({
    mutationFn: insightService.updateQuality,
    onSuccess: () => { toast.success("Batch quality saved"); setQualityOpen(false); updateQuery(); },
    onError: (error) => toast.error(error.response?.data?.message || "Could not save quality"),
  });
  if (batchQuery.isLoading) return <section className="page inventory-page"><Skeleton rows={7} /></section>;
  if (batchQuery.isError) return <section className="page inventory-page"><EmptyState title="Batch details unavailable" description={batchQuery.error?.response?.data?.message || "Please try again."} /></section>;
  const { batch, drug, supplier, quantityBreakdown: quantity, supplierTotals, dispatchHistory, incidents, timeline } = batchQuery.data;

  return <section className="page inventory-page">
    <div className="page-intro"><div><span className="page-eyebrow">BATCH TRACEABILITY</span><h2>{batch.batchNumber}</h2><p>{drug?.name} · supplied by {supplier?.name}</p></div>
      <div className="page-action-group"><Button variant="secondary" onClick={() => navigate("/batches")}>Back to batches</Button><Button variant="secondary" onClick={() => setQualityOpen(true)}>Rate quality</Button><Button onClick={() => setDamageOpen(true)}>Report damage</Button></div>
    </div>
    <div className="detail-grid">
      <article className="detail-card"><span>Manufactured</span><strong>{new Date(batch.manufactureDate).toLocaleDateString()}</strong></article>
      <article className="detail-card"><span>Received</span><strong>{new Date(batch.receivedDate).toLocaleDateString()}</strong></article>
      <article className="detail-card"><span>Expires</span><strong>{new Date(batch.expiryDate).toLocaleDateString()}</strong></article>
      <article className="detail-card"><span>Status</span><strong>{batch.status}</strong></article>
    </div>
    <section className="detail-card quantity-breakdown"><h3>Quantity breakdown</h3>
      <div className="quantity-bar"><span style={{ width: `${Math.min(100, quantity.inStock / Math.max(quantity.received, 1) * 100)}%` }} /></div>
      <div className="quantity-legend"><span>Received <strong>{quantity.received}</strong></span><span>Dispatched <strong>{quantity.dispatched}</strong></span><span>Damaged <strong>{quantity.damaged}</strong></span><span>Expired write-off <strong>{quantity.expiredWriteOff}</strong></span><span>In stock <strong>{quantity.inStock}</strong></span></div>
    </section>
    <div className="detail-grid">
      <article className="detail-card detail-span-two"><span>Bought from this supplier</span><strong>{supplier?.name}</strong><p>{quantity.received} units in this batch</p><p>{supplierTotals.totalUnitsFromSupplierForThisDrug} units of this drug across {supplierTotals.totalBatchesFromSupplier} batches; {supplierTotals.totalUnitsFromSupplierAllDrugs} units overall</p></article>
      <article className="detail-card"><span>Quality rating</span><strong>{batch.qualityRating ? `${"★".repeat(batch.qualityRating)} (${batch.qualityRating}/5)` : "Not rated"}</strong><p>{batch.qualityNotes || "No quality notes"}</p><div className="tag-list">{(batch.qualityTags || []).map((tag) => <span key={tag}>{tag}</span>)}</div></article>
    </div>
    <section className="request-section"><h3>Dispatch history</h3>{dispatchHistory.length === 0 ? <p className="muted-copy">No dispatches from this batch yet.</p> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Buyer</th><th>Quantity</th><th>Date</th></tr></thead><tbody>{dispatchHistory.map((entry) => <tr key={`${entry.orderId}-${entry.date}`}><td>{entry.buyerName}</td><td>{entry.quantity}</td><td>{new Date(entry.date).toLocaleDateString()}</td></tr>)}</tbody></table></div>}</section>
    <section className="request-section"><h3>Timeline</h3><div className="batch-timeline">{timeline.map((entry, index) => <div className="timeline-entry" key={`${entry.type}-${index}`}><span className="timeline-dot" /><div><strong>{entry.type.replaceAll("_", " ")}</strong><small>{new Date(entry.date).toLocaleString()}</small>{entry.quantity !== undefined && <p>{entry.quantity} units{entry.buyerName ? ` · ${entry.buyerName}` : ""}</p>}{entry.reason && <p>{entry.reason}</p>}</div></div>)}</div></section>
    <section className="request-section"><h3>Incidents</h3>{incidents.length ? incidents.map((item) => <article className="request-card" key={item._id}><strong>{item.type} · {item.status}</strong><p>{item.reason}</p></article>) : <p className="muted-copy">No incidents for this batch.</p>}</section>

    {damageOpen && <form className="detail-card request-capture" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); damageMutation.mutate({ id, quantity: Number(form.get("quantity")), reason: form.get("reason"), tags: String(form.get("tags") || "").split(",").map((tag) => tag.trim()).filter(Boolean) }); }}>
      <h3>Report damaged stock</h3><div className="form-grid"><label className="form-field">Quantity<input type="number" name="quantity" min="1" max={batch.quantityInStock} required /></label><label className="form-field">Reason<input name="reason" minLength="3" required /></label><label className="form-field form-span-two">Tags<input name="tags" placeholder="packaging damaged, wrong labelling" /></label></div><div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setDamageOpen(false)}>Cancel</Button><Button type="submit" disabled={damageMutation.isPending}>Submit damage report</Button></div>
    </form>}
    {qualityOpen && <form className="detail-card request-capture" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); qualityMutation.mutate({ id, qualityRating: Number(form.get("qualityRating")), qualityNotes: form.get("qualityNotes"), qualityTags: String(form.get("qualityTags") || "").split(",").map((tag) => tag.trim()).filter(Boolean) }); }}>
      <h3>Rate batch quality</h3><div className="form-grid"><label className="form-field">Rating<select name="qualityRating" defaultValue={batch.qualityRating || 5}>{[1, 2, 3, 4, 5].map((value) => <option key={value}>{value}</option>)}</select></label><label className="form-field">Tags<input name="qualityTags" defaultValue={(batch.qualityTags || []).join(", ")} /></label><label className="form-field form-span-two">Notes<textarea name="qualityNotes" defaultValue={batch.qualityNotes || ""} /></label></div><div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setQualityOpen(false)}>Cancel</Button><Button type="submit" disabled={qualityMutation.isPending}>Save quality</Button></div>
    </form>}
  </section>;
}
