import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import api from "../api/axios";

const COLORS = ["#4f46e5", "#059669", "#d97706", "#dc2626", "#0891b2", "#7c3aed"];

const StatCard = ({ label, value, tone }) => (
  <div className={`stat-card ${tone || ""}`}>
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get("/dashboard");
        setStats(data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard");
      }
    };
    fetchStats();
  }, []);

  if (error) return <div className="page"><div className="error-banner">{error}</div></div>;
  if (!stats) return <div className="page">Loading dashboard...</div>;

  const categoryData = stats.categoryBreakdown.map((c) => ({ name: c._id || "Uncategorized", value: c.totalStock }));
  const orderData = stats.ordersByStatus.map((o) => ({
    name: `${o._id.orderType} (${o._id.status})`,
    count: o.count,
  }));

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <div className="stat-grid">
        <StatCard label="Total Drugs" value={stats.totalDrugs} />
        <StatCard label="Active Batches" value={stats.totalBatches} />
        <StatCard label="Suppliers" value={stats.totalSuppliers} />
        <StatCard label="Stock Units" value={stats.totalStockUnits} />
        <StatCard label="Stock Value" value={`₹${stats.totalStockValue.toFixed(2)}`} />
        <StatCard label="Low Stock Drugs" value={stats.lowStockCount} tone="warn" />
        <StatCard label="Expiring in 30 Days" value={stats.expiringSoonCount} tone="warn" />
        <StatCard label="Expired (in stock)" value={stats.expiredCount} tone="danger" />
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3>Stock by Category</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Orders by Type & Status</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={orderData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#4f46e5" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
