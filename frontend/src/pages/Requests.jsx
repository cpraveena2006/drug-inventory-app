import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Send, UserRoundPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import { useRequests, useSuppliers } from "../hooks/useInventoryQueries";
import { requestService } from "../services/requests";

const initialRequest = { drugName: "", quantity: 1, customerName: "", customerContact: "", notes: "" };

export default function Requests() {
  const [form, setForm] = useState(initialRequest);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [supplierIds, setSupplierIds] = useState([]);
  const [quantityNeeded, setQuantityNeeded] = useState(1);
  const [neededBy, setNeededBy] = useState("");
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const requestsQuery = useRequests();
  const suppliersQuery = useSuppliers();
  const inquiriesQuery = useQuery({
    queryKey: ["inquiries", selectedRequest?._id],
    queryFn: () => requestService.inquiries(selectedRequest._id),
    enabled: Boolean(selectedRequest?._id),
  });
  const createMutation = useMutation({
    mutationFn: requestService.create,
    onSuccess: () => {
      toast.success("Customer request logged");
      setForm(initialRequest);
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not log request"),
  });
  const inquiryMutation = useMutation({
    mutationFn: requestService.createInquiry,
    onSuccess: () => {
      toast.success("Quote request sent to suppliers");
      setSelectedRequest(null);
      setSupplierIds([]);
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not send inquiry"),
  });
  const chooseMutation = useMutation({
    mutationFn: requestService.chooseSupplier,
    onSuccess: ({ purchaseOrder }) => {
      toast.success("Supplier selected. Purchase order is ready.");
      navigate("/orders", { state: { prefilledPurchaseOrder: purchaseOrder } });
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not select supplier"),
  });

  const requests = requestsQuery.data?.items || [];
  const suppliers = suppliersQuery.data || [];
  const inquiries = inquiriesQuery.data || [];
  const submitRequest = (event) => {
    event.preventDefault();
    createMutation.mutate({ ...form, quantity: Number(form.quantity) });
  };
  const submitInquiry = (event) => {
    event.preventDefault();
    if (!selectedRequest || supplierIds.length === 0) return;
    inquiryMutation.mutate({
      drugRequestId: selectedRequest._id,
      supplierIds,
      quantityNeeded: Number(quantityNeeded),
      ...(neededBy ? { neededBy: new Date(neededBy).toISOString() } : {}),
      message,
    });
  };

  return <section className="page inventory-page">
    <div className="page-intro"><div><span className="page-eyebrow">CUSTOMER DEMAND</span><h2>Unavailable drug requests</h2><p>Capture demand, request supplier quotes, and source unavailable medicines.</p></div></div>
    <form className="inventory-toolbar request-form" onSubmit={submitRequest}>
      <label>Drug name<input required maxLength="200" value={form.drugName} onChange={(e) => setForm({ ...form, drugName: e.target.value })} placeholder="e.g. Metformin 500mg" /></label>
      <label>Quantity<input type="number" min="1" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></label>
      <label>Customer<input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></label>
      <label>Contact<input value={form.customerContact} onChange={(e) => setForm({ ...form, customerContact: e.target.value })} /></label>
      <Button type="submit" disabled={createMutation.isPending}><UserRoundPlus size={15} /> Log request</Button>
    </form>
    {requestsQuery.isLoading ? <Skeleton rows={5} /> : requestsQuery.isError ? <EmptyState title="Could not load requests" description="Check the connection and try again." /> : requests.length === 0 ? <EmptyState title="No requests yet" description="Log a customer's unavailable-drug request above." /> :
      <div className="request-list">{requests.map((request) => <article className="request-card" key={request._id}>
        <div className="request-heading"><div><h3>{request.drugName}</h3><p>{request.totalQuantityRequested} units requested · last asked {new Date(request.lastRequestedAt).toLocaleDateString()}</p></div><span className="status-pill status-pending">requested {request.demandCount} {request.demandCount === 1 ? "time" : "times"}</span></div>
        <div className="request-actions"><span>Status: {request.status.replaceAll("_", " ")}</span><Button size="sm" onClick={() => { setSelectedRequest(request); setQuantityNeeded(request.totalQuantityRequested || 1); }}><Send size={14} /> Ask suppliers</Button></div>
        {selectedRequest?._id === request._id && <div className="inquiry-panel">
          <h4>Supplier responses</h4>
          {inquiriesQuery.isLoading ? <p>Loading quote requests…</p> : inquiries.map((inquiry) => <div className="inquiry-card" key={inquiry._id}>
            <div><strong>{inquiry.drugName}</strong><span>{inquiry.status}</span></div>
            {inquiry.responses.map((response) => <div className="supplier-response" key={response._id}>
              <span>{response.supplier?.name || "Supplier"} — {response.status}</span>
              {response.status === "available" && <span>{response.availableQuantity} available · ₹{response.unitPrice} · {response.leadTimeDays} days
                <Button size="sm" onClick={() => chooseMutation.mutate({ id: inquiry._id, supplierId: response.supplier?._id })}>Choose & create PO <ArrowRight size={14} /></Button>
              </span>}
              {response.note && <small>{response.note}</small>}
            </div>)}
          </div>)}
          <Button size="sm" variant="secondary" onClick={() => setSelectedRequest(null)}>Close</Button>
        </div>}
      </article>)}</div>}

    {selectedRequest && <div className="modal-backdrop" role="presentation" onClick={() => setSelectedRequest(null)}>
      <form className="modal-card request-inquiry-modal" onSubmit={submitInquiry} onClick={(event) => event.stopPropagation()}>
        <h3>Ask suppliers about {selectedRequest.drugName}</h3>
        <label>Quantity needed<input type="number" min="1" value={quantityNeeded} onChange={(event) => setQuantityNeeded(event.target.value)} required /></label>
        <label>Needed by<input type="date" value={neededBy} onChange={(event) => setNeededBy(event.target.value)} /></label>
        <label>Message<textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength="2000" /></label>
        <fieldset><legend>Select suppliers</legend>{suppliers.map((supplier) => <label className="supplier-checkbox" key={supplier._id}><input type="checkbox" checked={supplierIds.includes(supplier._id)} onChange={(event) => setSupplierIds((current) => event.target.checked ? [...current, supplier._id] : current.filter((id) => id !== supplier._id))} />{supplier.name}</label>)}</fieldset>
        <div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setSelectedRequest(null)}>Cancel</Button><Button type="submit" disabled={!supplierIds.length || inquiryMutation.isPending}>Send quote request</Button></div>
      </form>
    </div>}
  </section>;
}
