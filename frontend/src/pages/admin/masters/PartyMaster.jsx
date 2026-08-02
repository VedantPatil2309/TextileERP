import { useEffect, useState } from "react";
import { api } from "../../../services/api";
import { Plus, X, ToggleLeft, ToggleRight } from "lucide-react";

export default function PartyMaster() {
  const [items, setItems]     = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({
    party_name: "", party_type: "", contact_no: "",
    gst_no: "", city: "", credit_days: "",
  });

  const load = () => api.get("/admin/parties").then((res) => setItems(res.data));
  useEffect(() => { load(); }, []);

  const field = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const save = () => {
    if (!form.party_name || !form.party_type) {
      alert("Party Name and Party Type are required");
      return;
    }
    setSaving(true);
    api.post("/admin/parties", form)
      .then((res) => {
        if (res.data.status === "success") {
          setForm({ party_name: "", party_type: "", contact_no: "", gst_no: "", city: "", credit_days: "" });
          setShowForm(false);
          load();
        } else alert("Failed to add party");
      })
      .catch(() => alert("Error while adding party"))
      .finally(() => setSaving(false));
  };

  const toggle = (id) => api.patch(`/admin/parties/${id}/status`).then(load);

  const PARTY_TYPES = ["Supplier", "Customer", "Both", "Job Worker"];

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Party Master</h2>
          <p className="text-xs text-slate-400 mt-0.5">{items.length} parties registered</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm"
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? "Cancel" : "Add Party"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">New Party</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Party Name *">
              <input
                className={inputCls}
                placeholder="e.g. Rajesh Textiles"
                value={form.party_name}
                onChange={(e) => field("party_name", e.target.value)}
              />
            </FormField>

            <FormField label="Party Type *">
              <select
                className={inputCls}
                value={form.party_type}
                onChange={(e) => field("party_type", e.target.value)}
              >
                <option value="">Select Type</option>
                {PARTY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Contact Number">
              <input
                className={inputCls}
                placeholder="e.g. 9876543210"
                value={form.contact_no}
                onChange={(e) => field("contact_no", e.target.value)}
              />
            </FormField>

            <FormField label="GST Number">
              <input
                className={inputCls}
                placeholder="e.g. 24ABCDE1234F1Z5"
                value={form.gst_no}
                onChange={(e) => field("gst_no", e.target.value)}
              />
            </FormField>

            <FormField label="City">
              <input
                className={inputCls}
                placeholder="e.g. Surat"
                value={form.city}
                onChange={(e) => field("city", e.target.value)}
              />
            </FormField>

            <FormField label="Credit Days">
              <input
                type="number"
                className={inputCls}
                placeholder="e.g. 30"
                value={form.credit_days}
                onChange={(e) => field("credit_days", e.target.value)}
              />
            </FormField>
          </div>

          <div className="flex justify-end mt-5">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60
                         text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all shadow-sm"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <><Plus size={15} /> Save Party</>
              )}
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
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5">Code</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5">Party Name</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5">Type</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5">Contact</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5">GST No</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5">City</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5">Credit Days</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-slate-400 text-xs py-10">
                    No parties yet. Click "Add Party" to get started.
                  </td>
                </tr>
              )}
              {items.map((i, idx) => (
                <tr
                  key={i.id}
                  className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors ${idx % 2 === 0 ? "" : "bg-slate-50/30"}`}
                >
                  <td className="px-5 py-3.5 text-xs font-mono text-slate-500">{i.party_code}</td>
                  <td className="px-5 py-3.5 font-semibold text-slate-800">{i.party_name}</td>
                  <td className="px-5 py-3.5">
                    <TypeBadge type={i.party_type} />
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{i.contact_no || "—"}</td>
                  <td className="px-5 py-3.5 text-xs font-mono text-slate-500">{i.gst_no || "—"}</td>
                  <td className="px-5 py-3.5 text-slate-600">{i.city || "—"}</td>
                  <td className="px-5 py-3.5 text-slate-600">{i.credit_days ? `${i.credit_days} days` : "—"}</td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => toggle(i.id)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${
                        i.is_active
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {i.is_active
                        ? <><ToggleRight size={13} /> Active</>
                        : <><ToggleLeft size={13} /> Inactive</>
                      }
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

function FormField({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function TypeBadge({ type }) {
  const map = {
    Supplier:   "bg-blue-50 text-blue-700",
    Customer:   "bg-emerald-50 text-emerald-700",
    Both:       "bg-purple-50 text-purple-700",
    "Job Worker": "bg-amber-50 text-amber-700",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${map[type] || "bg-slate-100 text-slate-600"}`}>
      {type}
    </span>
  );
}

const inputCls = `w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800
  placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
  focus:border-transparent transition-all bg-white`;
