import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Plus, X, Factory, CheckCircle, Clock, AlertCircle } from "lucide-react";

const inputCls = `w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800
  placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
  focus:border-transparent transition-all bg-white`;

function FormField({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const STATUS_COLORS = {
  PLANNED:     "bg-slate-100 text-slate-600",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  COMPLETED:   "bg-emerald-50 text-emerald-700",
  ON_HOLD:     "bg-amber-50 text-amber-700",
};

const STATUS_ICONS = {
  PLANNED:     <Clock size={12} />,
  IN_PROGRESS: <Factory size={12} />,
  COMPLETED:   <CheckCircle size={12} />,
  ON_HOLD:     <AlertCircle size={12} />,
};

const SHIFTS = ["Morning (6AM–2PM)", "Afternoon (2PM–10PM)", "Night (10PM–6AM)"];

export default function Production() {
  const [products,  setProducts]  = useState([]);
  const [qualities, setQualities] = useState([]);
  const [machines,  setMachines]  = useState([]);
  const [orders,    setOrders]    = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form, setForm] = useState({
    production_date: "",
    shift: "",
    product_id: "",
    quality_id: "",
    machine_id: "",
    planned_qty: "",
    actual_qty: "",
    input_qty: "",
    remarks: "",
  });

  const field = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const loadMasters = () => {
    api.get("/production/masters")
      .then((res) => {
        setProducts(res.data.products  || []);
        setQualities(res.data.qualities || []);
        setMachines(res.data.machines  || []);
      })
      .catch(() => console.error("Failed to load production masters"));
  };

  const loadOrders = () => {
    api.get("/production/orders")
      .then((res) => setOrders(res.data))
      .catch(() => console.error("Failed to load production orders"));
  };

  useEffect(() => {
    loadMasters();
    loadOrders();
  }, []);

  const save = () => {
    if (!form.product_id || !form.machine_id || !form.production_date) {
      alert("Product, Machine and Date are required");
      return;
    }
    setSaving(true);
    api.post("/production/orders", form)
      .then((res) => {
        if (res.data.status === "success") {
          setForm({ production_date: "", shift: "", product_id: "", quality_id: "", machine_id: "", planned_qty: "", actual_qty: "", input_qty: "", remarks: "" });
          setShowForm(false);
          loadOrders();
        } else alert("Failed to save production order");
      })
      .catch(() => alert("Error saving production order"))
      .finally(() => setSaving(false));
  };

  const updateStatus = (id, status) => {
    api.patch(`/production/orders/${id}/status`, { status })
      .then(loadOrders)
      .catch(() => alert("Failed to update status"));
  };

  // Summary stats
  const planned    = orders.filter((o) => o.status === "PLANNED").length;
  const inProgress = orders.filter((o) => o.status === "IN_PROGRESS").length;
  const completed  = orders.filter((o) => o.status === "COMPLETED").length;

  // Efficiency = actual / planned * 100
  const efficiency = (o) => {
    if (!o.planned_qty || !o.actual_qty) return null;
    return ((o.actual_qty / o.planned_qty) * 100).toFixed(1);
  };

  // Yield = actual / input * 100
  const yieldPct = (o) => {
    if (!o.input_qty || !o.actual_qty) return null;
    return ((o.actual_qty / o.input_qty) * 100).toFixed(1);
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Production Orders</h2>
          <p className="text-xs text-slate-400 mt-0.5">{orders.length} total orders</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm"
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? "Cancel" : "New Order"}
        </button>
      </div>

      {/* Summary KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Planned",     value: planned,    color: "bg-slate-50  border-slate-200",  text: "text-slate-700"  },
          { label: "In Progress", value: inProgress, color: "bg-blue-50   border-blue-100",   text: "text-blue-700"   },
          { label: "Completed",   value: completed,  color: "bg-emerald-50 border-emerald-100", text: "text-emerald-700" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border px-5 py-4 flex items-center gap-4 ${s.color}`}>
            <div className={`text-3xl font-bold ${s.text}`}>{s.value}</div>
            <div className={`text-xs font-semibold ${s.text}`}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">New Production Order</h3>
          <div className="grid grid-cols-3 gap-4">

            <FormField label="Production Date *">
              <input type="date" className={inputCls}
                value={form.production_date} onChange={(e) => field("production_date", e.target.value)} />
            </FormField>

            <FormField label="Shift">
              <select className={inputCls} value={form.shift} onChange={(e) => field("shift", e.target.value)}>
                <option value="">Select Shift</option>
                {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>

            <FormField label="Product *">
              <select className={inputCls} value={form.product_id} onChange={(e) => field("product_id", e.target.value)}>
                <option value="">Select Product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.product_name}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Quality">
              <select className={inputCls} value={form.quality_id} onChange={(e) => field("quality_id", e.target.value)}>
                <option value="">Select Quality</option>
                {qualities.map((q) => (
                  <option key={q.id} value={q.id}>{q.quality_name}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Machine *">
              <select className={inputCls} value={form.machine_id} onChange={(e) => field("machine_id", e.target.value)}>
                <option value="">Select Machine</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>{m.machine_name} ({m.machine_type})</option>
                ))}
              </select>
            </FormField>

            <FormField label="Input Qty (Raw Material Used)">
              <input type="number" className={inputCls} placeholder="e.g. 500 KG"
                value={form.input_qty} onChange={(e) => field("input_qty", e.target.value)} />
            </FormField>

            <FormField label="Planned Qty">
              <input type="number" className={inputCls} placeholder="Target output"
                value={form.planned_qty} onChange={(e) => field("planned_qty", e.target.value)} />
            </FormField>

            <FormField label="Actual Qty">
              <input type="number" className={inputCls} placeholder="Actual output"
                value={form.actual_qty} onChange={(e) => field("actual_qty", e.target.value)} />
            </FormField>

            <FormField label="Remarks">
              <input className={inputCls} placeholder="Optional notes"
                value={form.remarks} onChange={(e) => field("remarks", e.target.value)} />
            </FormField>

          </div>

          {/* Live efficiency preview */}
          {form.planned_qty && form.actual_qty && (
            <div className="mt-4 flex gap-4">
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl text-xs">
                <span className="text-slate-500">Efficiency:</span>
                <span className="font-bold text-indigo-700">
                  {((form.actual_qty / form.planned_qty) * 100).toFixed(1)}%
                </span>
              </div>
              {form.input_qty && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl text-xs">
                  <span className="text-slate-500">Yield:</span>
                  <span className="font-bold text-emerald-700">
                    {((form.actual_qty / form.input_qty) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end mt-5">
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all shadow-sm">
              {saving
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                : <><Plus size={15} />Save Order</>}
            </button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Order No", "Date", "Shift", "Product", "Quality", "Machine", "Input Qty", "Planned", "Actual", "Efficiency", "Yield", "Status", "Action"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3.5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={13} className="text-center text-slate-400 text-xs py-12">
                    No production orders yet. Click "New Order" to create one.
                  </td>
                </tr>
              )}
              {orders.map((o, idx) => {
                const eff = efficiency(o);
                const yld = yieldPct(o);
                return (
                  <tr key={o.id} className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors ${idx % 2 !== 0 ? "bg-slate-50/30" : ""}`}>
                    <td className="px-4 py-3.5 font-mono text-xs text-indigo-600 font-semibold">{o.order_number}</td>
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{o.production_date}</td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs">{o.shift || "—"}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-800 whitespace-nowrap">{o.product_name}</td>
                    <td className="px-4 py-3.5 text-slate-600">{o.quality_name || "—"}</td>
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{o.machine_name}</td>
                    <td className="px-4 py-3.5 text-slate-600">{o.input_qty || "—"}</td>
                    <td className="px-4 py-3.5 text-slate-600">{o.planned_qty || "—"}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-800">{o.actual_qty || "—"}</td>
                    <td className="px-4 py-3.5">
                      {eff ? (
                        <span className={`text-xs font-bold ${parseFloat(eff) >= 90 ? "text-emerald-600" : parseFloat(eff) >= 70 ? "text-amber-600" : "text-red-500"}`}>
                          {eff}%
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      {yld ? (
                        <span className={`text-xs font-bold ${parseFloat(yld) >= 90 ? "text-emerald-600" : parseFloat(yld) >= 70 ? "text-amber-600" : "text-red-500"}`}>
                          {yld}%
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`flex items-center gap-1.5 w-fit text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[o.status] || "bg-slate-100 text-slate-600"}`}>
                        {STATUS_ICONS[o.status]}
                        {o.status?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {o.status !== "COMPLETED" && (
                        <select
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          value={o.status}
                          onChange={(e) => updateStatus(o.id, e.target.value)}
                        >
                          <option value="PLANNED">Planned</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="ON_HOLD">On Hold</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
