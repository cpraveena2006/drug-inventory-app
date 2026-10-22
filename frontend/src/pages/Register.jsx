import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound, LoaderCircle, Activity, ArrowUpRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";

const Register = () => {
  const { register, loading, error } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await register(form.name, form.email, form.password);
    if (ok) navigate("/dashboard");
  };

  return (
    <AuthLayout>
      <div className="auth-form-wrap register-form-wrap">
        <div className="auth-mobile-brand"><span className="brand-mark"><Activity size={18} /></span><strong>Medi<span>Stock</span></strong></div>
        <div className="auth-form-heading"><span className="form-kicker">GET STARTED</span><h2>Create your account</h2><p>Set up your access to the inventory workspace.</p></div>
        {error && <div className="error-banner auth-error" role="alert">{error}</div>}
        <form className="auth-card" onSubmit={handleSubmit}>
          <label htmlFor="register-name">Full name</label>
          <div className="auth-input-wrap"><UserRound size={17} /><input id="register-name" name="name" autoComplete="name" placeholder="Your name" value={form.name} onChange={handleChange} required /></div>
          <label htmlFor="register-email">Work email</label>
          <div className="auth-input-wrap"><Mail size={17} /><input id="register-email" type="email" name="email" autoComplete="email" placeholder="name@organization.com" value={form.email} onChange={handleChange} required /></div>
          <label htmlFor="register-password">Password</label>
          <div className="auth-input-wrap"><LockKeyhole size={17} /><input id="register-password" type={showPassword ? "text" : "password"} name="password" autoComplete="new-password" placeholder="At least 6 characters" value={form.password} onChange={handleChange} required minLength={6} /><button className="password-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? <><LoaderCircle className="button-spinner" size={18} /> Creating account...</> : <>Create account <ArrowUpRight size={17} /></>}
          </button>
        </form>
        <p className="switch-link">Already have access? <Link to="/login">Sign in <ArrowUpRight size={13} /></Link></p>
        <p className="auth-legal">By continuing, you agree to your organization’s access policies.</p>
      </div>
    </AuthLayout>
  );
};

export default Register;
