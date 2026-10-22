import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const { register, loading, error } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "pharmacist" });
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await register(form.name, form.email, form.password, form.role);
    if (ok) navigate("/");
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>💊 DrugTrack</h1>
        <p className="subtitle">Create an account</p>
        {error && <div className="error-banner">{error}</div>}
        <label>Full Name</label>
        <input name="name" value={form.name} onChange={handleChange} required />
        <label>Email</label>
        <input type="email" name="email" value={form.email} onChange={handleChange} required />
        <label>Password</label>
        <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={6} />
        <label>Role</label>
        <select name="role" value={form.role} onChange={handleChange}>
          <option value="pharmacist">Pharmacist</option>
          <option value="admin">Admin</option>
          <option value="supplier">Supplier</option>
        </select>
        <button type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Register"}
        </button>
        <p className="switch-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
};

export default Register;
