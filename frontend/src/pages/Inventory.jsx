import { useEffect, useState } from "react";
import { api } from "../services/api";
import { RefreshCw, Search, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

function Tile({ label, value }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-5 py-4">
      <div className="text-xl font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}

export default function Inventory() {
  const [stock, setStock] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get("/inventory/stock"),
      api.get("/inventory/movements?limit=30"),
    ])
      .then(([stockRes, movementRes]) => {
        setStock(stockRes.data || []);
        setMovements(movementRes.data || []);
      })
      .catch(() => {
        setStock([]);
        setMovements([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = stock.filter((row) => {
    const q = search.toLowerCase();
    return (
      row.product_name?.toLowerCase().includes(q) ||
      row.quality_name?.toLowerCase().includes(q)
    );
  });

  const totalQty = filtered.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const totalValue = filtered.reduce(
    (sum, row) => sum + Number(row.quantity || 0) * Number(row.unit_cost || 0),
    0
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Stock Ledger</h2>
          <p className="text-xs text-slate-500 mt-1">
            Stock auto-updates from Purchase GRN (IN) and Sales Challan (OUT)
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile label="Stock Items" value={filtered.length} />
        <Tile label="Total Quantity" value={totalQty.toFixed(2)} />
        <Tile label="Stock Value" value={`INR ${totalValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`} />
        <Tile label="Recent Movements" value={movements.length} />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm"
            placeholder="Search product or quality"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Product</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Quality</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Category</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Unit</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Qty</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Unit Cost</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Value</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Updated</th>
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-10 text-slate-400">No stock records found</td>
              </tr>
            )}
            {filtered.map((row) => {
              const value = Number(row.quantity || 0) * Number(row.unit_cost || 0);
              return (
                <tr key={row.id} className="border-b border-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{row.product_name}</td>
                  <td className="px-4 py-3 text-slate-600">{row.quality_name || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{row.category || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{row.unit || "-"}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{Number(row.quantity || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-600">INR {Number(row.unit_cost || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-700">INR {value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {row.last_updated ? new Date(row.last_updated).toLocaleString("en-IN") : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-x-auto">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Recent Stock Movements</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Product</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Quality</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Qty</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Source</th>
            </tr>
          </thead>
          <tbody>
            {!loading && movements.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-400">No movement history yet</td>
              </tr>
            )}
            {movements.map((m) => {
              const isIn = m.movement_type === "IN";
              return (
                <tr key={m.id} className="border-b border-slate-50">
                  <td className="px-4 py-3 text-slate-500 text-xs">{new Date(m.movement_date).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${isIn ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                      {isIn ? <ArrowDownCircle size={12} /> : <ArrowUpCircle size={12} />}
                      {m.movement_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{m.product_name}</td>
                  <td className="px-4 py-3 text-slate-600">{m.quality_name || "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{Number(m.qty || 0).toFixed(2)} {m.unit || ""}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{m.source_module} {m.source_ref ? `(${m.source_ref})` : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
