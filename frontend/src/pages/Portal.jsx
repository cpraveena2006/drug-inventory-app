import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import { usePortalInbox } from "../hooks/useInventoryQueries";
import { portalService } from "../services/portal";

export default function Portal() {
  const [responses, setResponses] = useState({});
  const queryClient = useQueryClient();
  const inboxQuery = usePortalInbox();
  const mutate = useMutation({
    mutationFn: portalService.respondToInquiry,
    onSuccess: () => {
      toast.success("Quote response submitted");
      queryClient.invalidateQueries({ queryKey: ["portal-inbox"] });
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not submit response"),
  });
  const incidentMutate = useMutation({
    mutationFn: portalService.respondToIncident,
    onSuccess: () => {
      toast.success("Incident response submitted");
      queryClient.invalidateQueries({ queryKey: ["portal-inbox"] });
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not submit response"),
  });
  if (inboxQuery.isLoading) return <section className="page inventory-page"><Skeleton rows={6} /></section>;
  if (inboxQuery.isError) return <section className="page inventory-page"><EmptyState title="Could not load supplier portal" description="Please try again later." /></section>;
  const { inquiries = [], incidents = [], batches = [] } = inboxQuery.data;

  return <section className="page inventory-page">
    <div className="page-intro"><div><span className="page-eyebrow">SUPPLIER WORKSPACE</span><h2>Supplier portal</h2><p>Respond to quote requests and incidents, and review your own deliveries.</p></div></div>
    <section className="request-section"><h3>Quote requests</h3>{inquiries.length === 0 ? <p className="muted-copy">No open quote requests.</p> : inquiries.map((item) => {
      const current = responses[item._id] || {};
      return <article className="request-card" key={item._id}>
        <div className="request-heading"><div><h3>{item.drugName}</h3><p>{item.quantityNeeded} units needed{item.neededBy ? ` by ${new Date(item.neededBy).toLocaleDateString()}` : ""}</p><small>{item.message}</small></div><span className="status-pill status-pending">open</span></div>
        <form className="supplier-response-form" onSubmit={(event) => { event.preventDefault(); mutate.mutate({ id: item._id, available: current.available === "yes", availableQuantity: Number(current.availableQuantity || 0), unitPrice: Number(current.unitPrice || 0), leadTimeDays: Number(current.leadTimeDays || 0), note: current.note || "" }); }}>
          <label>Availability<select required value={current.available || ""} onChange={(event) => setResponses({ ...responses, [item._id]: { ...current, available: event.target.value } })}><option value="">Choose</option><option value="yes">Available</option><option value="no">Unavailable</option></select></label>
          {current.available === "yes" && <>
            <label>Quantity<input type="number" min="0" value={current.availableQuantity || ""} onChange={(event) => setResponses({ ...responses, [item._id]: { ...current, availableQuantity: event.target.value } })} required /></label>
            <label>Unit price<input type="number" min="0" step="0.01" value={current.unitPrice || ""} onChange={(event) => setResponses({ ...responses, [item._id]: { ...current, unitPrice: event.target.value } })} required /></label>
            <label>Lead time (days)<input type="number" min="0" value={current.leadTimeDays || ""} onChange={(event) => setResponses({ ...responses, [item._id]: { ...current, leadTimeDays: event.target.value } })} required /></label>
          </>}
          <label>Note<input maxLength="2000" value={current.note || ""} onChange={(event) => setResponses({ ...responses, [item._id]: { ...current, note: event.target.value } })} /></label>
          <Button type="submit" disabled={mutate.isPending || !current.available}>Submit response</Button>
        </form>
      </article>;
    })}</section>

    <section className="request-section"><h3>Incidents</h3>{incidents.length === 0 ? <p className="muted-copy">No open incidents.</p> : incidents.map((item) => <article className="request-card" key={item._id}>
      <div className="request-heading"><div><h3>{item.type.replaceAll("_", " ")} · {item.drug?.name}</h3><p>{item.reason}</p><small>Batch {item.batch?.batchNumber || "—"} · {item.status}</small></div></div>
      <form className="supplier-response-form" onSubmit={(event) => { event.preventDefault(); incidentMutate.mutate({ id: item._id, response: event.currentTarget.response.value }); event.currentTarget.reset(); }}>
        <label>Response<input name="response" required maxLength="2000" placeholder="Add a response for the pharmacy" /></label><Button type="submit" disabled={incidentMutate.isPending}>Send response</Button>
      </form>
    </article>)}</section>

    <section className="request-section"><h3>Your batches</h3>{batches.length === 0 ? <p className="muted-copy">No batches recorded.</p> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Batch</th><th>Drug</th><th>Expiry</th><th>In stock</th><th>Status</th></tr></thead><tbody>{batches.map((batch) => <tr key={batch._id}><td>{batch.batchNumber}</td><td>{batch.drug?.name}</td><td>{new Date(batch.expiryDate).toLocaleDateString()}</td><td>{batch.quantityInStock}</td><td>{batch.status}</td></tr>)}</tbody></table></div>}</section>
  </section>;
}
