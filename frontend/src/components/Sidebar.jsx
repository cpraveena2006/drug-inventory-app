import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Activity, Boxes, ChevronLeft, ChevronRight, LayoutDashboard, Truck, ClipboardList, Menu, X, BellRing, PackageSearch, ShieldAlert, Users, ScrollText, Store } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const groups = [
  {
    label: "OVERVIEW",
    links: [{ to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard, end: true }],
  },
  {
    label: "INVENTORY",
    links: [
      { to: "/drugs", label: "Drugs", Icon: Activity },
      { to: "/batches", label: "Batches", Icon: Boxes },
    ],
  },
  {
    label: "SUPPLY CHAIN",
    links: [
      { to: "/suppliers", label: "Suppliers", Icon: Truck },
      { to: "/orders", label: "Orders", Icon: ClipboardList },
      { to: "/requests", label: "Unavailable drugs", Icon: PackageSearch, roles: ["admin", "pharmacist"] },
      { to: "/incidents", label: "Incidents", Icon: ShieldAlert, roles: ["admin", "pharmacist"] },
      { to: "/portal", label: "Supplier portal", Icon: Store, roles: ["supplier"] },
      { to: "/notifications", label: "Notifications", Icon: BellRing },
    ],
  },
  {
    label: "ADMINISTRATION",
    links: [
      { to: "/admin/users", label: "User management", Icon: Users, roles: ["admin"] },
      { to: "/admin/audit", label: "Audit logs", Icon: ScrollText, roles: ["admin"] },
    ],
  },
];

const Sidebar = () => {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        className="mobile-menu-trigger"
        type="button"
        aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      {mobileOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar${collapsed ? " sidebar-collapsed" : ""}${mobileOpen ? " sidebar-mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <span className="brand-mark"><Activity size={20} strokeWidth={2.5} /></span>
          {!collapsed && <span className="brand-name">Medi<span>Stock</span></span>}
          <button className="sidebar-collapse" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {groups.map((group) => {
            const links = group.links.filter((link) => !link.roles || link.roles.includes(user?.role));
            if (!links.length) return null;
            return <div className="nav-group" key={group.label}>
              {!collapsed && <div className="nav-group-label">{group.label}</div>}
              {links.map(({ to, label, Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  title={collapsed ? label : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
                >
                  <Icon size={18} strokeWidth={1.9} />
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              ))}
            </div>;
          })}
        </nav>
        {!collapsed && (
          <div className="sidebar-support">
            <div className="support-icon"><Activity size={17} /></div>
            <div><strong>Inventory health</strong><span>Monitoring active</span></div>
            <span className="online-dot" />
          </div>
        )}
        <div className="sidebar-bottom">{!collapsed ? "MEDISTOCK • v1.0.0" : "v1"}</div>
      </aside>
    </>
  );
};

export default Sidebar;
