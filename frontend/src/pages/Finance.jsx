import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import {
  TrendingUp, TrendingDown, IndianRupee,
  ShoppingCart, AlertCircle, CheckCircle, RefreshCw
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts";

export default function Finance() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [period,  setPeriod]  = useState("month"); // month | quarter | year

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/finance/summary?period=${period}`)
      .then((res) => setData(res.data))
      .catch(() => console.error("Finance data unavailable"))
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => {
    load();
  }, [period]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-slate-400">Loading financial data...</span>
    </div>
  );

  if (!data) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
      <AlertCircle size={32} className="opacity-40" />
      <p className="text-sm">Finance data unavailable. Check your backend connection.</p>
    </div>
  );

  const margin = data.revenue > 0
    ? (((data.revenue - data.purchase_cost) / data.revenue) * 100).toFixed(1)
    : 0;

  const profitColor = (data.revenue - data.purchase_cost) >= 0
    ? "text-emerald-700" : "text-red-600";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Finance Overview</h2>
          <p className="text-xs text-slate-400 mt-0.5">Live data from Sales & Purchase modules</p>
        </div>
        <div className="flex items-center gap-2">
          {["month","quarter","year"].map((p) => (
            <button key={p}
              onClick={() => setPeriod(p)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all capitalize ${
                period === p
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}>
              {p === "month" ? "This Month" : p === "quarter" ? "This Quarter" : "This Year"}
            </button>
          ))}
          <button onClick={load} className="ml-1 p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-all">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Top KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Revenue"
          value={`₹ ${fmt(data.revenue)}`}
          sub={`${data.invoice_count} invoices`}
          icon={<TrendingUp size={16} className="text-emerald-600" />}
          bg="bg-emerald-50"
          trend="up"
        />
        <KpiCard
          label="Purchase Cost"
          value={`₹ ${fmt(data.purchase_cost)}`}
          sub={`${data.purchase_invoice_count} purchase invoices`}
          icon={<ShoppingCart size={16} className="text-red-500" />}
          bg="bg-red-50"
          trend="down"
        />
        <KpiCard
          label="Gross Profit"
          value={`₹ ${fmt(data.revenue - data.purchase_cost)}`}
          sub={`${margin}% margin`}
          icon={<IndianRupee size={16} className="text-indigo-600" />}
          bg="bg-indigo-50"
          valueClass={profitColor}
        />
        <KpiCard
          label="Outstanding Receivable"
          value={`₹ ${fmt(data.outstanding_receivable)}`}
          sub={`${data.unpaid_invoices} unpaid invoices`}
          icon={<AlertCircle size={16} className="text-amber-600" />}
          bg="bg-amber-50"
          alert={data.outstanding_receivable > 0}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <SmallKpi label="Collected"    value={`₹ ${fmt(data.amount_collected)}`}   color="text-emerald-700" />
        <SmallKpi label="Purchase Due" value={`₹ ${fmt(data.purchase_outstanding)}`} color="text-red-600"   />
        <SmallKpi label="Total GST Collected" value={`₹ ${fmt(data.total_gst_collected)}`} color="text-indigo-700" />
        <SmallKpi label="Avg Invoice Value"   value={`₹ ${fmt(data.avg_invoice_value)}`}   color="text-slate-700"  />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-5">

        {/* Monthly Revenue vs Cost */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Revenue vs Purchase Cost</h3>
              <p className="text-xs text-slate-400 mt-0.5">Monthly comparison</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.monthly_trend || []} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={(v) => `₹ ${parseFloat(v).toLocaleString("en-IN")}`}
                contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="revenue"       name="Revenue"   fill="#4f46e5" radius={[4,4,0,0]} />
              <Bar dataKey="purchase_cost" name="Purchase"  fill="#f87171" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment collection trend */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Payment Collection</h3>
              <p className="text-xs text-slate-400 mt-0.5">Monthly receipts collected</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.monthly_trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={(v) => `₹ ${parseFloat(v).toLocaleString("en-IN")}`}
                contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Line type="monotone" dataKey="collected" name="Collected"
                stroke="#10b981" strokeWidth={2.5} dot={{ fill: "#10b981", r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-2 gap-5">

        {/* Top customers by revenue */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Top Customers by Revenue</h3>
          {(data.top_customers || []).length === 0
            ? <p className="text-xs text-slate-400 text-center py-6">No sales data yet</p>
            : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs font-semibold text-slate-500 pb-2">#</th>
                    <th className="text-left text-xs font-semibold text-slate-500 pb-2">Customer</th>
                    <th className="text-right text-xs font-semibold text-slate-500 pb-2">Revenue</th>
                    <th className="text-right text-xs font-semibold text-slate-500 pb-2">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_customers.map((c, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-2.5 text-xs text-slate-400">{i + 1}</td>
                      <td className="py-2.5 font-medium text-slate-800">{c.customer_name}</td>
                      <td className="py-2.5 text-right font-semibold text-slate-700">₹ {fmt(c.total_revenue)}</td>
                      <td className="py-2.5 text-right">
                        <span className={`text-xs font-semibold ${c.outstanding > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                          {c.outstanding > 0 ? `₹ ${fmt(c.outstanding)}` : "Cleared"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>

        {/* Overdue invoices */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">
            Overdue Invoices
            {(data.overdue_invoices || []).length > 0 && (
              <span className="ml-2 text-xs font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                {data.overdue_invoices.length}
              </span>
            )}
          </h3>
          {(data.overdue_invoices || []).length === 0
            ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-slate-400">
                <CheckCircle size={24} className="text-emerald-400" />
                <p className="text-xs">No overdue invoices 🎉</p>
              </div>
            )
            : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs font-semibold text-slate-500 pb-2">Invoice</th>
                    <th className="text-left text-xs font-semibold text-slate-500 pb-2">Customer</th>
                    <th className="text-right text-xs font-semibold text-slate-500 pb-2">Balance</th>
                    <th className="text-right text-xs font-semibold text-slate-500 pb-2">Days Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.overdue_invoices.map((inv, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-2.5 font-mono text-xs text-indigo-600">{inv.invoice_number}</td>
                      <td className="py-2.5 text-slate-700 text-xs">{inv.customer_name}</td>
                      <td className="py-2.5 text-right font-semibold text-red-600 text-xs">₹ {fmt(inv.balance)}</td>
                      <td className="py-2.5 text-right">
                        <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                          {inv.days_overdue}d
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      </div>

    </div>
  );
}

function fmt(val) {
  const n = parseFloat(val || 0);
  if (n >= 100000) return `${(n / 100000).toFixed(2)}L`;
  if (n >= 1000)   return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString("en-IN");
}

function KpiCard({ label, value, sub, icon, bg, trend, alert, valueClass }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>{icon}</div>
        {trend === "up"   && <TrendingUp size={14} className="text-emerald-500" />}
        {trend === "down" && <TrendingDown size={14} className="text-red-400" />}
      </div>
      <div>
        <div className={`text-2xl font-bold ${valueClass || (alert ? "text-amber-600" : "text-slate-800")}`}>{value}</div>
        <div className="text-xs text-slate-400 mt-0.5">{label}</div>
        <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
      </div>
    </div>
  );
}

function SmallKpi({ label, value, color }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-5 py-4">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}
