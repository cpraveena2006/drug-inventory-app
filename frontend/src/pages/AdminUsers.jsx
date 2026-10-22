import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import { adminService } from "../services/admin";
import { useSuppliers } from "../hooks/useInventoryQueries";

const emptyForm = { name: "", email: "", password: "", role: "pharmacist", supplier: "" };

export default function AdminUsers() {
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const usersQuery = useQuery({ queryKey: ["admin-users"], queryFn: adminService.users });
  const suppliersQuery = useSuppliers();
  const create = useMutation({
    mutationFn: adminService.createUser,
    onSuccess: () => {
      toast.success("User created");
      setForm(emptyForm);
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not create user"),
  });
  const update = useMutation({
    mutationFn: adminService.updateUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (error) => toast.error(error.response?.data?.message || "Could not update user"),
  });
  const users = usersQuery.data || [];
  return <section className="page inventory-page">
    <div className="page-intro"><div><span className="page-eyebrow">ACCESS CONTROL</span><h2>User management</h2><p>Create accounts, link suppliers and manage access.</p></div><Button onClick={() => setShowForm(!showForm)}>Create user</Button></div>
    {showForm && <form className="detail-card request-capture" onSubmit={(event) => { event.preventDefault(); create.mutate({ ...form, ...(form.role === "supplier" ? {} : { supplier: undefined }) }); }}>
      <h3>New account</h3><div className="form-grid">
        <label className="form-field">Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="form-field">Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label className="form-field">Password<input type="password" minLength="6" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <label className="form-field">Role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, supplier: "" })}><option value="admin">Admin</option><option value="pharmacist">Pharmacist</option><option value="supplier">Supplier</option></select></label>
        {form.role === "supplier" && <label className="form-field">Supplier<select required value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}><option value="">Select supplier</option>{(suppliersQuery.data || []).map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}</option>)}</select></label>}
      </div><div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button><Button type="submit" disabled={create.isPending}>Create account</Button></div>
    </form>}
    {usersQuery.isLoading ? <Skeleton rows={5} /> : usersQuery.isError ? <EmptyState title="Could not load users" description="Please try again." /> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Supplier</th><th>Status</th><th>Action</th></tr></thead><tbody>{users.map((user) => <tr key={user._id}><td>{user.name}</td><td>{user.email}</td><td>{user.role}</td><td>{user.supplier?.name || "—"}</td><td>{user.isActive ? "Active" : "Inactive"}</td><td><Button size="sm" variant="secondary" disabled={update.isPending} onClick={() => update.mutate({ id: user._id, isActive: !user.isActive })}>{user.isActive ? "Deactivate" : "Activate"}</Button></td></tr>)}</tbody></table></div>}
  </section>;
}
