import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, Mail, LoaderCircle, ArrowUpRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";

const Login = () => {
  const { login, loading, error } = useAuth();
  const isDevelopment = import.meta.env.DEV;
  const [email, setEmail] = useState(isDevelopment ? "admin@example.com" : "");
  const [password, setPassword] = useState(isDevelopment ? "password123" : "");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) navigate("/dashboard");
  };

  return (
    <AuthLayout>
      <div className="auth-form-wrap">
        <div className="auth-mobile-brand"><span className="brand-mark"><LockKeyhole size={18} /></span><strong>Medi<span>Stock</span></strong></div>
        <div className="auth-form-heading"><span className="form-kicker">WELCOME BACK</span><h2>Sign in to your account</h2><p>Enter your details to access your workspace.</p></div>
        {error && <div className="error-banner auth-error" role="alert">{error}</div>}
        <form className="auth-card" onSubmit={handleSubmit}>
          <label htmlFor="login-email">Work email</label>
          <div className="auth-input-wrap"><Mail size={17} /><input id="login-email" type="email" autoComplete="username" placeholder="name@organization.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <label htmlFor="login-password">Password</label>
          <div className="auth-input-wrap"><LockKeyhole size={17} /><input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required /><button className="password-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? <><LoaderCircle className="button-spinner" size={18} /> Signing in...</> : <>Sign in to workspace <ArrowUpRight size={17} /></>}
          </button>
        </form>
        {isDevelopment && <div className="demo-credentials"><span className="demo-dot" /><div><strong>Demo access</strong><span>admin@example.com <i>·</i> password123</span></div></div>}
        <p className="switch-link">New to MediStock? <Link to="/register">Create an account <ArrowUpRight size={13} /></Link></p>
        <p className="auth-legal">By continuing, you agree to your organization’s access policies.</p>
      </div>
    </AuthLayout>
  );
};

export default Login;
