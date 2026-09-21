// pages/Analytics.jsx — Phase 11: Analytics Dashboard.
// One file for all three roles — only the endpoint/identity and which
// cards render differ. Every number comes from a real Mongo aggregation
// over Transaction/Lot records (see analyticsController.js); a
// brand-new account correctly sees all-zero stats.
import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, Package, Users, IndianRupee, Loader2 } from 'lucide-react';
import { api } from '../api/client.js';
import { useFarmer } from '../context/FarmerContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import StatCard from '../components/StatCard.jsx';

export default function Analytics({ role }) {
  if (role === 'farmer') return <FarmerAnalyticsView />;
  if (role === 'buyer') return <BuyerAnalyticsView />;
  return <FPOAnalyticsView />;
}

function useAnalyticsData(role, identity) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!identity && role !== 'fpo') return;
    setLoading(true);
    const call = role === 'farmer' ? api.getFarmerAnalytics({ farmerName: identity })
      : role === 'buyer' ? api.getBuyerAnalytics({ buyerName: identity })
      : api.getFpoAnalytics({});
    call.then(setData).finally(() => setLoading(false));
  }, [role, identity]);

  return { data, loading };
}

function FarmerAnalyticsView() {
  const { farmer } = useFarmer();
  const { data, loading } = useAnalyticsData('farmer', farmer?.name);
  if (loading || !data) return <Loader2 className="animate-spin text-slate-400 mx-auto my-10" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">My Analytics</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Total Revenue" value={`₹${data.totalRevenue.toLocaleString('en-IN')}`} icon={IndianRupee} tone="agri" />
        <StatCard label="Transactions" value={data.transactionCount} icon={Package} tone="intel" />
        <StatCard label="Avg Net Realization" value={`₹${data.avgNetRealization}/kg`} icon={TrendingUp} tone="warn" />
      </div>
      <div className="card">
        <h2 className="font-bold text-slate-800 mb-3">Revenue Trend</h2>
        {data.revenueTrend.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#1e8450" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : <EmptyState text="No completed transactions yet — this fills in as you sell through AgriSphere." />}
      </div>
      <div className="card">
        <h2 className="font-bold text-slate-800 mb-3">Best Selling Markets (by revenue)</h2>
        {data.bestSellingMarkets.length ? (
          <ul className="space-y-2 text-sm">
            {data.bestSellingMarkets.map((m) => (
              <li key={m.buyerName} className="flex justify-between border-b border-slate-50 pb-2 last:border-0">
                <span className="text-slate-700">{m.buyerName}</span>
                <span className="font-semibold text-slate-800">₹{m.totalRevenue.toLocaleString('en-IN')} · {m.transactionCount} deals</span>
              </li>
            ))}
          </ul>
        ) : <EmptyState text="No sales recorded yet." />}
      </div>
    </div>
  );
}

function BuyerAnalyticsView() {
  const { displayName } = useAuth();
  const { data, loading } = useAnalyticsData('buyer', displayName);
  if (loading || !data) return <Loader2 className="animate-spin text-slate-400 mx-auto my-10" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Procurement Analytics</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Total Spend" value={`₹${data.totalSpend.toLocaleString('en-IN')}`} icon={IndianRupee} tone="warn" />
        <StatCard label="Quantity Procured" value={`${data.totalQuantityTonnes}T`} icon={Package} tone="intel" />
        <StatCard label="Avg Price Paid" value={`₹${data.avgPricePerKg}/kg`} icon={TrendingUp} tone="agri" />
      </div>
      <div className="card">
        <h2 className="font-bold text-slate-800 mb-3">Procurement Trend</h2>
        {data.procurementTrend.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.procurementTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="quantityTonnes" fill="#274bd1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyState text="No completed procurement yet — this fills in as you close deals through AgriSphere." />}
      </div>
      <div className="card">
        <h2 className="font-bold text-slate-800 mb-3">Commodity Breakdown</h2>
        {data.cropBreakdown.length ? (
          <ul className="space-y-2 text-sm">
            {data.cropBreakdown.map((c) => (
              <li key={c.crop} className="flex justify-between border-b border-slate-50 pb-2 last:border-0">
                <span className="text-slate-700">{c.crop}</span>
                <span className="font-semibold text-slate-800">{c.quantityTonnes}T</span>
              </li>
            ))}
          </ul>
        ) : <EmptyState text="No commodities procured yet." />}
      </div>
    </div>
  );
}

function FPOAnalyticsView() {
  const { data, loading } = useAnalyticsData('fpo', null);
  if (loading || !data) return <Loader2 className="animate-spin text-slate-400 mx-auto my-10" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">FPO Analytics</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        <StatCard label="Total Aggregated Volume" value={`${data.totalVolumeTonnes}T`} icon={Package} tone="agri" />
        <StatCard label="Smart Lots Formed" value={data.lotCount} icon={TrendingUp} tone="intel" />
      </div>
      <div className="card">
        <h2 className="font-bold text-slate-800 mb-3">Aggregated Volume Over Time</h2>
        {data.volumeTrend.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.volumeTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="quantityTonnes" fill="#1e8450" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyState text="No Smart Lots formed yet." />}
      </div>
      <div className="card">
        <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Users size={16} /> Member Insights</h2>
        {data.memberInsights.length ? (
          <ul className="space-y-2 text-sm">
            {data.memberInsights.map((m) => (
              <li key={m.farmerName} className="flex justify-between border-b border-slate-50 pb-2 last:border-0">
                <span className="text-slate-700">{m.farmerName}</span>
                <span className="font-semibold text-slate-800">{m.totalQuantityTonnes}T across {m.lotCount} lot(s)</span>
              </li>
            ))}
          </ul>
        ) : <EmptyState text="No member contributions yet." />}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return <p className="text-sm text-slate-400 text-center py-6">{text}</p>;
}
