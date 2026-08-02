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

const CATEGORIES = ["Yarn", "Fabric", "Grey Fabric", "Finished Fabric", "Packing Material", "Other"];
const UNITS      = ["KG", "MTR", "PCS", "RLL", "BOX"];
const GST_RATES  = ["0", "5", "12", "18", "28"];

export default function ProductMaster() {
  const [items, setItems]     = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({
    product_name: "", category: "", unit: "",
    gsm: "", width: "", hsn_code: "", gst: "", avg_rate: "",
  });

  const load = () => api.get("/admin/products").then((res) => setItems(res.data));
  useEffect(() => { load(); }, []);

  const field = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const save = () => {
    if (!form.product_name || !form.category || !form.unit) {
      alert("Product Name, Category and Unit are required");
      return;
    }
    setSaving(true);
    api.post("/admin/products", form)
      .then((res) => {
        if (res.data.status === "success") {
          setForm({ product_name: "", category: "", unit: "", gsm: "", width: "", hsn_code: "", gst: "", avg_rate: "" });
          setShowForm(false);
          load();
        } else alert("Failed to add product");
      })
      .catch(() => alert("Error while adding product"))
      .finally(() => setSaving(false));
  };

  const toggle = (id) => api.patch(`/admin/products/${id}/status`).then(load);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Product Master</h2>
          <p className="text-xs text-slate-400 mt-0.5">{items.length} products registered</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm"
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? "Cancel" : "Add Product"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">New Product</h3>
          <div className="grid grid-cols-2 gap-4">

            <FormField label="Product Name *">
              <input className={inputCls} placeholder="e.g. Cotton Yarn 30s"
                value={form.product_name} onChange={(e) => field("product_name", e.target.value)} />
            </FormField>

            <FormField label="Category *">
              <select className={inputCls} value={form.category} onChange={(e) => field("category", e.target.value)}>
                <option value="">Select Category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>

            <FormField label="Unit *">
              <select className={inputCls} value={form.unit} onChange={(e) => field("unit", e.target.value)}>
                <option value="">Select Unit</option>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </FormField>

            <FormField label="GSM">
              <input className={inputCls} placeholder="e.g. 120" type="number"
                value={form.gsm} onChange={(e) => field("gsm", e.target.value)} />
            </FormField>

            <FormField label="Width (inches)">
              <input className={inputCls} placeholder="e.g. 58" type="number"
                value={form.width} onChange={(e) => field("width", e.target.value)} />
            </FormField>

            <FormField label="HSN Code">
              <input className={inputCls} placeholder="e.g. 5208"
                value={form.hsn_code} onChange={(e) => field("hsn_code", e.target.value)} />
            </FormField>

            <FormField label="GST %">
              <select className={inputCls} value={form.gst} onChange={(e) => field("gst", e.target.value)}>
                <option value="">Select GST %</option>
                {GST_RATES.map((g) => <option key={g} value={g}>{g}%</option>)}
              </select>
            </FormField>

            <FormField label="Avg Rate (₹)">
              <input className={inputCls} placeholder="e.g. 250" type="number"
                value={form.avg_rate} onChange={(e) => field("avg_rate", e.target.value)} />
            </FormField>

          </div>
          <div className="flex justify-end mt-5">
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all shadow-sm">
              {saving
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                : <><Plus size={15} />Save Product</>}
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
                {["Code", "Product Name", "Category", "Unit", "GSM", "Width", "HSN Code", "GST %", "Avg Rate", "Status"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={10} className="text-center text-slate-400 text-xs py-10">No products yet. Click "Add Product" to get started.</td></tr>
              )}
              {items.map((i, idx) => (
                <tr key={i.id} className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors ${idx % 2 !== 0 ? "bg-slate-50/30" : ""}`}>
                  <td className="px-5 py-3.5 text-xs font-mono text-slate-500">{i.product_code}</td>
                  <td className="px-5 py-3.5 font-semibold text-slate-800">{i.product_name}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-50 text-sky-700">{i.category}</span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{i.unit}</td>
                  <td className="px-5 py-3.5 text-slate-600">{i.gsm || "—"}</td>
                  <td className="px-5 py-3.5 text-slate-600">{i.width ? `${i.width}"` : "—"}</td>
                  <td className="px-5 py-3.5 text-xs font-mono text-slate-500">{i.hsn_code || "—"}</td>
                  <td className="px-5 py-3.5 text-slate-600">{i.gst ? `${i.gst}%` : "—"}</td>
                  <td className="px-5 py-3.5 text-slate-600">{i.avg_rate ? `₹ ${i.avg_rate}` : "—"}</td>
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