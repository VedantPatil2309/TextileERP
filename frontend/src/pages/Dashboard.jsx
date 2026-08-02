import { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, BarChart, Bar, CartesianGrid
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    api.get("/kpis").then((res) => setKpis(res.data));
  }, []);

  const oeeTrend = [
    { day: "Mon", value: 75 },
    { day: "Tue", value: 78 },
    { day: "Wed", value: 81 },
    { day: "Thu", value: 79 },
    { day: "Fri", value: 82 },
  ];

  const productionData = [
    { name: "Loom-1", qty: 420 },
    { name: "Loom-2", qty: 390 },
    { name: "Loom-3", qty: 440 },
  ];

  if (!kpis) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-2xl px-6 py-5 flex items-center justify-between shadow-md">
        <div>
          <p className="text-indigo-200 text-sm font-medium">Good morning,</p>
          <h2 className="text-white text-xl font-bold mt-0.5">{user?.username} 👋</h2>
          <p className="text-indigo-200 text-xs mt-1">Here's what's happening in your factory today.</p>
        </div>
        <div className="hidden sm:block text-right">
          <div className="text-indigo-200 text-xs">Role</div>
          <div className="text-white font-semibold text-sm mt-0.5">{user?.role}</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="OEE"
          value={`${kpis.oee}%`}
          subtitle="Overall Equipment Effectiveness"
          trend="up"
          color="indigo"
        />
        <KpiCard
          title="OTD"
          value={`${kpis.otd}%`}
          subtitle="On-Time Delivery"
          trend="up"
          color="emerald"
        />
        <KpiCard
          title="Yield"
          value={`${kpis.yield}%`}
          subtitle="Production Yield Rate"
          trend="neutral"
          color="amber"
        />
        <KpiCard
          title="Gross Margin"
          value={`${kpis.margin}%`}
          subtitle="Profitability Indicator"
          trend="up"
          color="sky"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* OEE Trend */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">OEE Trend</h3>
              <p className="text-xs text-slate-400 mt-0.5">This week's performance</p>
            </div>
            <span className="text-xs bg-indigo-50 text-indigo-600 font-semibold px-2.5 py-1 rounded-full">Weekly</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={oeeTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis domain={[60, 90]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: 12 }}
                cursor={{ stroke: "#e2e8f0" }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#4f46e5"
                strokeWidth={2.5}
                dot={{ fill: "#4f46e5", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Production by Machine */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Production by Machine</h3>
              <p className="text-xs text-slate-400 mt-0.5">Units produced today</p>
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-600 font-semibold px-2.5 py-1 rounded-full">Today</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={productionData} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: 12 }}
                cursor={{ fill: "#f8fafc" }}
              />
              <Bar dataKey="qty" fill="#4f46e5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Open Purchase Orders" value="12" note="₹ 4.2L pending" />
        <StatCard label="Pending GRNs" value="3" note="Awaiting inspection" />
        <StatCard label="Unpaid Invoices" value="7" note="₹ 1.8L overdue" />
      </div>

    </div>
  );
}

function KpiCard({ title, value, subtitle, trend, color }) {
  const colors = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
    sky: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  };
  const c = colors[color];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.bg} ${c.text}`}>{title}</span>
        {trend === "up" && <TrendingUp size={14} className="text-emerald-500" />}
        {trend === "down" && <TrendingDown size={14} className="text-red-500" />}
        {trend === "neutral" && <Minus size={14} className="text-slate-400" />}
      </div>
      <div>
        <div className="text-3xl font-bold text-slate-800">{value}</div>
        <div className="text-xs text-slate-400 mt-1">{subtitle}</div>
      </div>
    </div>
  );
}

function StatCard({ label, value, note }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-xl font-bold text-slate-700 flex-shrink-0">
        {value}
      </div>
      <div>
        <div className="text-xs font-semibold text-slate-700">{label}</div>
        <div className="text-xs text-slate-400 mt-0.5">{note}</div>
      </div>
    </div>
  );
}
