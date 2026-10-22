import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const Layout = () => {
  const location = useLocation();
  return <div className="app-shell">
    <Sidebar />
    <div className="shell-main">
      <Topbar />
      <main className="shell-content" key={location.pathname}>
        <Outlet />
      </main>
      <footer className="shell-footer"><span>MediStock · Pharmaceutical Inventory Management</span><span>© 2026 · v1.0.0</span></footer>
    </div>
  </div>;
};

export default Layout;
