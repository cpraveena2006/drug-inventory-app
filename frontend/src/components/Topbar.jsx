import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, LogOut, Moon, Search, Sun, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import toast from "react-hot-toast";
import { useNotifications } from "../hooks/useInventoryQueries";

const pages = {
  "/dashboard": "Dashboard",
  "/drugs": "Drugs",
  "/batches": "Batches",
  "/suppliers": "Suppliers",
  "/orders": "Orders",
  "/incidents": "Incidents",
  "/requests": "Unavailable drugs",
  "/notifications": "Notifications",
  "/portal": "Supplier portal",
  "/admin/users": "User management",
  "/admin/audit": "Audit logs",
};
const formatDate = (value) => new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

function getInitialTheme() {
  try {
    return localStorage.getItem("medistock:theme") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

const Topbar = () => {
  const { user, logout } = useAuth();
  const { data: notificationData } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);
  const [alerts, setAlerts] = useState({ expiring: [], expired: [], lowStock: [] });
  const notificationsRef = useRef(null);
  const searchRef = useRef(null);
  const title = pages[location.pathname] || (location.pathname.startsWith("/drugs/") ? "Drug detail" : location.pathname.startsWith("/batches/") ? "Batch detail" : location.pathname.startsWith("/suppliers/") ? "Supplier scorecard" : "Dashboard");
  const initials = useMemo(() => (user?.name || "User").split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase(), [user]);
  const alertCount = alerts.expiring.length + alerts.expired.length + alerts.lowStock.length;
  const unreadCount = notificationData?.unreadCount || 0;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("medistock:theme", theme);
    } catch (error) {
      toast.error("Could not save the appearance preference");
      console.error("Theme preference persistence failed", error);
    }
  }, [theme]);

  useEffect(() => {
    let active = true;
    const loadAlerts = async () => {
      try {
        const [expiryRes, lowStockRes] = await Promise.all([
          api.get("/batches/alerts/expiry", { params: { days: 30 } }),
          api.get("/batches/alerts/low-stock"),
        ]);
        if (!active) return;
        setAlerts({
          expiring: expiryRes.data.expiringSoon || [],
          expired: expiryRes.data.expired || [],
          lowStock: Array.isArray(lowStockRes.data) ? lowStockRes.data : (lowStockRes.data.drugs || []),
        });
      } catch (err) {
        if (active) toast.error(err.response?.data?.message || "Could not load inventory alerts");
      }
    };
    loadAlerts();
    const refreshTimer = window.setInterval(loadAlerts, 60_000);
    window.addEventListener("focus", loadAlerts);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", loadAlerts);
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) setNotificationsOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("app:global-search", { detail: query }));
  }, [query]);

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="topbar">
      <div className="topbar-heading">
        <div className="breadcrumbs"><span>Workspace</span><span className="breadcrumb-separator">/</span><strong>{title}</strong></div>
        <h1>{title}</h1>
      </div>
      <label className="global-search">
        <Search size={17} />
        <input ref={searchRef} aria-label="Search current page" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}...`} />
        {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><X size={14} /></button>}
        <kbd>⌘ K</kbd>
      </label>
      <div className="topbar-actions">
        <div className="notification-wrap" ref={notificationsRef}>
          <button className="icon-button notification-button" aria-label={`Notifications, ${alertCount + unreadCount} alerts`} onClick={() => setNotificationsOpen(!notificationsOpen)}>
            <Bell size={19} />
            {alertCount + unreadCount > 0 && <span className="notification-count">{alertCount + unreadCount > 99 ? "99+" : alertCount + unreadCount}</span>}
          </button>
          {notificationsOpen && (
            <div className="notification-menu">
              <div className="menu-heading"><div><strong>Activity & alerts</strong><span>{unreadCount} unread · {alertCount} inventory alerts</span></div><button className="text-action" onClick={() => { setNotificationsOpen(false); navigate("/notifications"); }}>View all</button></div>
              <div className="notification-list">
                {(notificationData?.items || []).slice(0, 5).map((notification) => <button className={`notification-item notification-menu-item${notification.readAt ? "" : " unread"}`} key={notification._id} onClick={() => { setNotificationsOpen(false); navigate("/notifications"); }}><span className={`notification-indicator${notification.readAt ? "" : " info"}`} /><div><strong>{notification.title}</strong><span>{notification.message}</span></div></button>)}
                {alerts.expired.map((batch) => <div className="notification-item" key={`expired-${batch._id}`}><span className="notification-indicator danger" /><div><strong>{batch.drug?.name || batch.batchNumber}</strong><span>Batch {batch.batchNumber} expired {formatDate(batch.expiryDate)} · {batch.quantityInStock} units</span></div></div>)}
                {alerts.expiring.map((batch) => <div className="notification-item" key={`expiring-${batch._id}`}><span className="notification-indicator warning" /><div><strong>{batch.drug?.name || batch.batchNumber}</strong><span>Batch {batch.batchNumber} expires {formatDate(batch.expiryDate)} · {batch.quantityInStock} units</span></div></div>)}
                {alerts.lowStock.map((item) => {
                  const drug = item.drug || item;
                  return <div className="notification-item" key={`stock-${drug._id}`}><span className="notification-indicator info" /><div><strong>{drug.name}</strong><span>{item.totalStock ?? item.currentStock ?? 0} in stock · reorder at {item.reorderThreshold ?? drug.reorderThreshold}</span></div></div>;
                })}
              </div>
              {alertCount === 0 && unreadCount === 0 && <div className="notification-empty">All clear — no active alerts.</div>}
            </div>
          )}
        </div>
        <div className="user-menu-wrap">
          <button className="user-menu-button" onClick={() => setUserMenuOpen(!userMenuOpen)} aria-expanded={userMenuOpen}>
            <span className="avatar">{initials}</span>
            <span className="user-menu-text"><strong>{user?.name}</strong><span>{user?.role}</span></span>
            <ChevronDown size={15} />
          </button>
          {userMenuOpen && <div className="user-dropdown"><div className="user-dropdown-info">{user?.name}<span className={`role-badge role-${user?.role}`}>{user?.role}</span></div><button className="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><span>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />} Appearance</span><strong>{theme === "dark" ? "Dark" : "Light"}</strong></button><button onClick={handleLogout}><LogOut size={16} /> Sign out</button></div>}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
