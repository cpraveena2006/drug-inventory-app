import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">💊 DrugTrack</div>
      <div className="navbar-links">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
          Dashboard
        </NavLink>
        <NavLink to="/drugs" className={({ isActive }) => (isActive ? "active" : "")}>
          Drugs
        </NavLink>
        <NavLink to="/batches" className={({ isActive }) => (isActive ? "active" : "")}>
          Batches
        </NavLink>
        <NavLink to="/suppliers" className={({ isActive }) => (isActive ? "active" : "")}>
          Suppliers
        </NavLink>
        <NavLink to="/orders" className={({ isActive }) => (isActive ? "active" : "")}>
          Orders
        </NavLink>
      </div>
      <div className="navbar-user">
        <span>{user.name} ({user.role})</span>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
};

export default Navbar;
