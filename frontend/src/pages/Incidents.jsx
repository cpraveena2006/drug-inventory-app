import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BellRing, Check, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import { useIncidents } from "../hooks/useInventoryQueries";
import { incidentService } from "../services/incidents";
import { useAuth } from "../context/AuthContext";

const severityClass = (severity) => `status-pill status-${severity === "critical" ? "cancelled" : severity === "warning" ? "pending" : "delivered"}`;

export default function Incidents() {
  const { user } = useAuth();
  const [status, setStatus] = useState("");
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useIncidents(status ? { status } : {});
  const canNotify = user?.role === "admin" || user?.role === "pharmacist";
  const statusMutation = useMutation({
    mutationFn: incidentService.updateStatus,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incidents"] }),
    onError: (error) => toast.error(error.response?.data?.message || "Could not update incident"),
  });
  const notifyMutation = useMutation({
    mutationFn: incidentService.notifySupplier,
    onSuccess: () => {
      toast.success("Supplier notified");
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not notify supplier"),
  });
  const incidents = useMemo(() => data?.items || [], [data]);

  return <section className="page inventory-page">
    <div className="page-intro">
      <div><span className="page-eyebrow">QUALITY & COMPLIANCE</span><h2>Incidents</h2><p>Track stock, expiry and quality events and their supplier responses.</p></div>
      <span className="status-pill status-pending">{incidents.filter((item) => item.status !== "resolved").length} open</span>
    </div>
    <div className="inventory-toolbar">
      <label className="filter-label">Status
        <select className="filter-select" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {["open", "supplier_notified", "acknowledged", "resolved"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
        </select>
      </label>
      {data && <span className="results-count"><strong>{data.total}</strong> incidents</span>}
    </div>
    {isLoading ? <Skeleton rows={5} /> : isError ? <EmptyState title="Could not load incidents" description="Check the connection and try again." /> : incidents.length === 0 ? <EmptyState title="No incidents found" description="Inventory events will appear here when detected." /> :
      <div className="table-scroll"><table className="data-table">
        <thead><tr><th>Type</th><th>Drug / Batch</th><th>Supplier</th><th>Severity</th><th>Status</th><th>Reported</th><th>Actions</th></tr></thead>
        <tbody>{incidents.map((incident) => <tr key={incident._id}>
          <td><strong>{incident.type.replaceAll("_", " ")}</strong><small className="table-subtext">{incident.reason}</small></td>
          <td>{incident.drug?.name || "—"}<small className="table-subtext">{incident.batch?.batchNumber || "—"}</small></td>
          <td>{incident.supplier?.name || "—"}</td>
          <td><span className={severityClass(incident.severity)}>{incident.severity}</span></td>
          <td><span className="status-pill status-shipped">{incident.status.replaceAll("_", " ")}</span></td>
          <td>{new Date(incident.createdAt).toLocaleDateString()}</td>
          <td><div className="page-action-group">
            {canNotify && incident.status !== "resolved" && <Button size="sm" variant="secondary" disabled={notifyMutation.isPending} onClick={() => notifyMutation.mutate(incident._id)}><BellRing size={14} /> Notify</Button>}
            {incident.status === "open" && canNotify && <Button size="sm" onClick={() => statusMutation.mutate({ id: incident._id, status: "acknowledged" })}><Check size={14} /> Acknowledge</Button>}
            {incident.status !== "resolved" && canNotify && <Button size="sm" variant="secondary" onClick={() => statusMutation.mutate({ id: incident._id, status: "resolved" })}><RefreshCw size={14} /> Resolve</Button>}
            {incident.supplierResponse && <span title={incident.supplierResponse}>Response received</span>}
          </div></td>
        </tr>)}</tbody>
      </table></div>}
  </section>;
}
