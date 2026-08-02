import { useEffect, useState } from "react";
import { api } from "../../../services/api";
import { Plus, X, ToggleLeft, ToggleRight } from "lucide-react";

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

const PRODUCT_TYPES = ["Yarn", "Grey Fabric", "Finished Fabric", "Packing", "Other"];
const GRADES        = ["A", "B", "C", "Premium", "Standard", "Economy"];

const gradeColors = {
  A:        "bg-emerald-50 text-emerald-700",
  B:        "bg-sky-50 text-sky-700",
  C:        "bg-amber-50 text-amber-700",
  Premium:  "bg-purple-50 text-purple-700",
  Standard: "bg-slate-100 text-slate-600",
  Economy:  "bg-orange-50 text-orange-700",
};

export default function QualityMaster() {
  const [items, setItems]       = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({ quality_name: "", product_type: "", grade: "" });

  const load = () => api.get("/admin/qualities").then((res) => setItems(res.data));
 useEffect(() => { load(); }, []);

  const field = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const save = () => {
    if (!form.quality_name || !form.grade || !form.product_type) {
      alert("Quality Name, Product Type and Grade are required");
      return;
    }
    setSaving(true);
    api.post("/admin/qualities", form)
      .then((res) => {
        if (res.data.status === "success") {
          setForm({ quality_name: "", product_type: "", grade: "" });
          setShowForm(false);
          load();
        } else alert("Failed to add quality");
      })
      .catch(() => alert("Error while adding quality"))
      .finally(() => setSaving(false));
  };

  const toggle = (id) => api.patch(`/admin/qualities/${id}/status`).then(load);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Quality Master</h2>
          <p className="text-xs text-slate-400 mt-0.5">{items.length} quality grades registered</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm"
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? "Cancel" : "Add Quality"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">New Quality</h3>
          <div className="grid grid-cols-3 gap-4">

            <FormField label="Quality Name *">
              <input className={inputCls} placeholder="e.g. Cotton 30s Premium"
                value={form.quality_name} onChange={(e) => field("quality_name", e.target.value)} />
            </FormField>

            <FormField label="Product Type *">
              <select className={inputCls} value={form.product_type} onChange={(e) => field("product_type", e.target.value)}>
                <option value="">Select Type</option>
                {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormField>

            <FormField label="Grade *">
              <select className={inputCls} value={form.grade} onChange={(e) => field("grade", e.target.value)}>
                <option value="">Select Grade</option>
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </FormField>

          </div>
          <div className="flex justify-end mt-5">
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all shadow-sm">
              {saving
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                : <><Plus size={15} />Save Quality</>}
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
                {["Code", "Quality Name", "Product Type", "Grade", "Status"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={5} className="text-center text-slate-400 text-xs py-10">No qualities yet. Click "Add Quality" to get started.</td></tr>
              )}
              {items.map((i, idx) => (
                <tr key={i.id} className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors ${idx % 2 !== 0 ? "bg-slate-50/30" : ""}`}>
                  <td className="px-5 py-3.5 text-xs font-mono text-slate-500">{i.quality_code}</td>
                  <td className="px-5 py-3.5 font-semibold text-slate-800">{i.quality_name}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">{i.product_type}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${gradeColors[i.grade] || "bg-slate-100 text-slate-600"}`}>
                      {i.grade}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
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