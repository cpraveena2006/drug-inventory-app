import { Activity, ArrowUpRight, Boxes, ShieldCheck } from "lucide-react";

const AuthLayout = ({ children }) => (
  <main className="auth-layout">
    <section className="auth-story" aria-label="MediStock platform overview">
      <div className="auth-story-pattern" />
      <div className="auth-brand"><span className="brand-mark"><Activity size={20} /></span><span>Medi<span>Stock</span></span></div>
      <div className="auth-story-content">
        <div className="auth-eyebrow"><span /> PHARMACEUTICAL OPERATIONS, SIMPLIFIED</div>
        <h1>Track every batch.<br /><span>Prevent every expiry.</span></h1>
        <p>A single, trusted workspace for the inventory decisions that keep care moving.</p>
        <div className="auth-highlights">
          <div><span className="auth-highlight-icon"><Boxes size={18} /></span><span><strong>Complete traceability</strong><small>Follow stock from supplier to dispatch.</small></span><ArrowUpRight size={15} /></div>
          <div><span className="auth-highlight-icon"><ShieldCheck size={18} /></span><span><strong>Expiry intelligence</strong><small>Stay ahead of critical stock alerts.</small></span><ArrowUpRight size={15} /></div>
        </div>
      </div>
      <div className="auth-artwork" aria-hidden="true">
        <svg className="auth-pharma-illustration" viewBox="0 0 320 240" role="presentation">
          <defs><linearGradient id="glass" x1="0" x2="1"><stop stopColor="#d6f1e9" stopOpacity=".55" /><stop offset=".48" stopColor="#fff" stopOpacity=".9" /><stop offset="1" stopColor="#b8e4d9" stopOpacity=".48" /></linearGradient><linearGradient id="pill" x1="0" x2="1"><stop stopColor="#f4d48b" /><stop offset=".5" stopColor="#fff0cd" /><stop offset=".51" stopColor="#e58768" /><stop offset="1" stopColor="#ce604e" /></linearGradient></defs>
          <ellipse cx="161" cy="210" rx="107" ry="13" fill="#052f32" opacity=".24" />
          <g transform="translate(91 48)"><rect x="11" width="66" height="18" rx="4" fill="#d4eee8" /><path d="M17 18h54v15H17z" fill="#e5f4ef" /><rect x="0" y="31" width="88" height="126" rx="17" fill="url(#glass)" stroke="#d6eee8" /><rect x="19" y="87" width="51" height="31" rx="4" fill="#effcf7" opacity=".8" /><text x="44" y="100" textAnchor="middle" fill="#398278" fontSize="8" fontFamily="sans-serif" letterSpacing="1">MEDI</text><text x="44" y="111" textAnchor="middle" fill="#398278" fontSize="8" fontFamily="sans-serif" letterSpacing="1">STOCK</text><g fill="#e5ad67"><rect x="20" y="54" width="9" height="19" rx="5" transform="rotate(-25 24 63)" /><rect x="37" y="45" width="9" height="19" rx="5" transform="rotate(20 41 54)" /><rect x="54" y="56" width="9" height="19" rx="5" transform="rotate(-15 58 65)" /></g></g>
          <g transform="translate(199 90) rotate(28)"><rect width="74" height="25" rx="13" fill="url(#pill)" stroke="#fff3d7" /><path d="M37 1v23" stroke="#ffffffa8" /></g>
          <g transform="translate(44 155) rotate(-21)"><rect width="59" height="21" rx="11" fill="#d9f2e9" stroke="#f4fff9" /><path d="M29.5 1v19" stroke="#fff" /></g>
          <circle cx="260" cy="170" r="13" fill="#f1d99c" /><circle cx="80" cy="94" r="8" fill="#e8f5f1" />
        </svg>
        <div className="art-glow" />
        <div className="medicine-bottle bottle-one"><span className="bottle-cap" /><span className="bottle-neck" /><span className="bottle-body"><i /><i /><i /><b>Rx</b></span></div>
        <div className="medicine-bottle bottle-two"><span className="bottle-cap" /><span className="bottle-neck" /><span className="bottle-body"><i /><i /><b>MED</b></span></div>
        <div className="capsule capsule-one"><span /><span /></div>
        <div className="capsule capsule-two"><span /><span /></div>
        <div className="pill pill-one" /><div className="pill pill-two" />
        <div className="art-grid" />
      </div>
      <div className="auth-story-footer"><span>BUILT FOR PHARMACY &amp; CARE TEAMS</span><span>SECURE · TRACEABLE · RELIABLE</span></div>
    </section>
    <section className="auth-form-side">{children}</section>
  </main>
);

export default AuthLayout;
