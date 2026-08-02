import { useEffect, useState } from "react";
import { api } from "../../../services/api";
import { Plus, X, ToggleLeft, ToggleRight, AlertTriangle } from "lucide-react";

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

const MACHINE_TYPES  = ["Loom", "Knitting", "Dyeing", "Finishing", "Warping", "Sizing", "Printing", "Other"];
const DEPARTMENTS    = ["Weaving", "Knitting", "Processing", "Finishing", "Maintenance", "Other"];
const MACHINE_STATUS = ["Active", "Idle", "Under Maintenance", "Breakdown"];

const statusColors = {
  "Active":             "bg-emerald-50 text-emerald-700",
  "Idle":               "bg-slate-100 text-slate-600",
  "Under Maintenance":  "bg-amber-50 text-amber-700",
  "Breakdown":          "bg-red-50 text-red-600",
};

// Check if maintenance is due within 7 days or overdue
function isDueSoon(dateStr) {
  if (!dateStr) return false;
  const due = new Date(dateStr);
  const today = new Date();
  const diff = (due - today) / (1000 * 60 * 60 * 24);
  return diff <= 7;
}

export default function MachineMaster() {
  const [items, setItems]       = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({
    machine_name: "", machine_type: "", capacity: "", department: "",
    location: "", purchase_date: "", status: "", maintenance_due: "", remarks: "",
  });

  const load = () => api.get("/admin/machines").then((res) => setItems(res.data));
  useEffect(() => { load(); }, []);

  const field = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const save = () => {
    if (!form.machine_type || !form.purchase_date || !form.maintenance_due) {
      alert("Machine Type, Purchase Date and Maintenance Due are required");
      return;
    }
    setSaving(true);
    api.post("/admin/machines", form)
      .then((res) => {
        if (res.data.status === "success") {
          setForm({ machine_name: "", machine_type: "", capacity: "", department: "", location: "", purchase_date: "", status: "", maintenance_due: "", remarks: "" });
          setShowForm(false);
          load();
        } else alert("Failed to add machine");
      })
      .catch(() => alert("Error while adding machine"))
      .finally(() => setSaving(false));
  };

  const toggle = (id) => api.patch(`/admin/machines/${id}/status`).then(load);

  // Summary counts
  const dueSoon = items.filter((i) => isDueSoon(i.maintenance_due) && i.is_active).length;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Machine Master</h2>
          <p className="text-xs text-slate-400 mt-0.5">{items.length} machines registered</p>
        </div>
        <div className="flex items-center gap-3">
          {dueSoon > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full">
              <AlertTriangle size={13} />
              {dueSoon} maintenance due soon
            </div>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm"
          >
            {showForm ? <X size={15} /> : <Plus size={15} />}
            {showForm ? "Cancel" : "Add Machine"}
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">New Machine</h3>
          <div className="grid grid-cols-3 gap-4">

            <FormField label="Machine Name">
              <input className={inputCls} placeholder="e.g. Rapier Loom #1"
                value={form.machine_name} onChange={(e) => field("machine_name", e.target.value)} />
            </FormField>

            <FormField label="Machine Type *">
              <select className={inputCls} value={form.machine_type} onChange={(e) => field("machine_type", e.target.value)}>
                <option value="">Select Type</option>
                {MACHINE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormField>

            <FormField label="Capacity">
              <input className={inputCls} placeholder="e.g. 500 MTR/day"
                value={form.capacity} onChange={(e) => field("capacity", e.target.value)} />
            </FormField>

            <FormField label="Department">
              <select className={inputCls} value={form.department} onChange={(e) => field("department", e.target.value)}>
                <option value="">Select Department</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </FormField>

            <FormField label="Location">
              <input className={inputCls} placeholder="e.g. Unit 1, Floor 2"
                value={form.location} onChange={(e) => field("location", e.target.value)} />
            </FormField>

            <FormField label="Current Status">
              <select className={inputCls} value={form.status} onChange={(e) => field("status", e.target.value)}>
                <option value="">Select Status</option>
                {MACHINE_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>

            <FormField label="Purchase Date *">
              <input type="date" className={inputCls}
                value={form.purchase_date} onChange={(e) => field("purchase_date", e.target.value)} />
            </FormField>

            <FormField label="Maintenance Due *">
              <input type="date" className={inputCls}
                value={form.maintenance_due} onChange={(e) => field("maintenance_due", e.target.value)} />
            </FormField>

            <FormField label="Remarks">
              <input className={inputCls} placeholder="Optional notes"
                value={form.remarks} onChange={(e) => field("remarks", e.target.value)} />
            </FormField>

          </div>
          <div className="flex justify-end mt-5">
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all shadow-sm">
              {saving
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                : <><Plus size={15} />Save Machine</>}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Code", "Machine Name", "Type", "Capacity", "Department", "Location", "Purchase Date", "Machine Status", "Maintenance Due", "Active"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3.5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={10} className="text-center text-slate-400 text-xs py-10">No machines yet. Click "Add Machine" to get started.</td></tr>
              )}
              {items.map((i, idx) => (
                <tr key={i.id} className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors ${idx % 2 !== 0 ? "bg-slate-50/30" : ""}`}>
                  <td className="px-4 py-3.5 text-xs font-mono text-slate-500">{i.machine_code}</td>
                  <td className="px-4 py-3.5 font-semibold text-slate-800 whitespace-nowrap">{i.machine_name || "—"}</td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">{i.machine_type}</span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{i.capacity || "—"}</td>
                  <td className="px-4 py-3.5 text-slate-600">{i.department || "—"}</td>
                  <td className="px-4 py-3.5 text-slate-600">{i.location || "—"}</td>
                  <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{i.purchase_date || "—"}</td>
                  <td className="px-4 py-3.5">
                    {i.status ? (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[i.status] || "bg-slate-100 text-slate-600"}`}>
                        {i.status}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className={`text-xs font-semibold ${isDueSoon(i.maintenance_due) ? "text-amber-600 flex items-center gap-1" : "text-slate-600"}`}>
                      {isDueSoon(i.maintenance_due) && <AlertTriangle size={12} />}
                      {i.maintenance_due || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <button onClick={() => toggle(i.id)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${
                        i.is_active ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                      {i.is_active ? <><ToggleRight size={13} />Active</> : <><ToggleLeft size={13} />Inactive</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}