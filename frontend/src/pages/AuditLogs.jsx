import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { adminService } from "../services/admin";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";

export default function AuditLogs() {
  const [params, setParams] = useSearchParams();
  const [action, setAction] = useState(params.get("action") || "");
  const query = useQuery({
    queryKey: ["audit-logs", params.toString()],
    queryFn: () => adminService.auditLogs(Object.fromEntries(params.entries())),
  });
  const filter = (event) => {
    event.preventDefault();
    const next = new URLSearchParams();
    if (action) next.set("action", action);
    setParams(next);
  };
  const logs = query.data?.items || [];
  return <section className="page inventory-page">
    <div className="page-intro"><div><span className="page-eyebrow">SYSTEM HISTORY</span><h2>Audit logs</h2><p>Review traceable user and inventory changes.</p></div></div>
    <form className="inventory-toolbar" onSubmit={filter}><label>Action<input value={action} onChange={(event) => setAction(event.target.value)} placeholder="e.g. STOCK_DISPATCHED" /></label><button className="ui-button ui-button-secondary" type="submit">Filter</button><span className="results-count">{query.data?.total ?? 0} records</span></form>
    {query.isLoading ? <Skeleton rows={6} /> : query.isError ? <EmptyState title="Could not load audit history" description="Please try again." /> : logs.length === 0 ? <EmptyState title="No audit events" description="Try clearing the filter." /> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Date</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead><tbody>{logs.map((log) => <tr key={log._id}><td>{new Date(log.createdAt).toLocaleString()}</td><td>{log.user?.name || "—"}</td><td>{log.action}</td><td>{log.entityType} · {log.entityId}</td><td><code>{JSON.stringify(log.details || {})}</code></td></tr>)}</tbody></table></div>}
  </section>;
}
