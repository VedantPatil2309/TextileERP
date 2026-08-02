import { useEffect, useState } from "react";
import { api } from "../../services/api";
import {
  Plus, X, Search, Target, Clock, CheckCircle, XCircle
} from "lucide-react";

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

const STAGES = ["NEW", "CONTACTED", "FOLLOW_UP", "NEGOTIATION", "WON", "LOST"];

const STAGE_META = {
  NEW:         { label: "New",         color: "bg-slate-100 text-slate-600",   dot: "bg-slate-400"   },
  CONTACTED:   { label: "Contacted",   color: "bg-blue-50 text-blue-700",      dot: "bg-blue-500"    },
  FOLLOW_UP:   { label: "Follow Up",   color: "bg-amber-50 text-amber-700",    dot: "bg-amber-500"   },
  NEGOTIATION: { label: "Negotiation", color: "bg-purple-50 text-purple-700",  dot: "bg-purple-500"  },
  WON:         { label: "Won",         color: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  LOST:        { label: "Lost",        color: "bg-red-50 text-red-600",        dot: "bg-red-400"     },
};

const SOURCES = ["Direct", "Reference", "Exhibition", "Online", "Cold Call", "Other"];

export default function Leads() {
  const [leads,    setLeads]    = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [search,   setSearch]   = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [form, setForm] = useState({
    company_name: "", contact_person: "", contact_no: "", city: "",
    source: "", product_interest: "", estimated_value: "",
    stage: "NEW", follow_up_date: "", notes: "",
  });

  const field = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = () => {
    api.get("/crm/leads")
      .then((res) => setLeads(res.data))
      .catch(() => console.error("Failed to load leads"));
  };

  useEffect(() => {
    load();
  }, []);

  const save = () => {
    if (!form.company_name || !form.contact_no) {
      alert("Company Name and Contact Number are required");
      return;
    }
    setSaving(true);
    api.post("/crm/leads", form)
      .then((res) => {
        if (res.data.status === "success") {
          setForm({ company_name: "", contact_person: "", contact_no: "", city: "", source: "", product_interest: "", estimated_value: "", stage: "NEW", follow_up_date: "", notes: "" });
          setShowForm(false);
          load();
        } else alert("Failed to save lead");
      })
      .catch(() => alert("Error saving lead"))
      .finally(() => setSaving(false));
  };

  const updateStage = (id, stage) => {
    api.patch(`/crm/leads/${id}/stage`, { stage }).then(load);
  };

  const filtered = leads.filter((l) => {
    const matchSearch = l.company_name?.toLowerCase().includes(search.toLowerCase()) ||
                        l.contact_person?.toLowerCase().includes(search.toLowerCase());
    const matchStage = !filterStage || l.stage === filterStage;
    return matchSearch && matchStage;
  });

  // Pipeline counts
  const counts = STAGES.reduce((acc, s) => {
    acc[s] = leads.filter((l) => l.stage === s).length;
    return acc;
  }, {});

  const totalValue = leads
    .filter((l) => l.stage !== "LOST")
    .reduce((sum, l) => sum + parseFloat(l.estimated_value || 0), 0);

  const isFollowUpDue = (date) => {
    if (!date) return false;
    return new Date(date) <= new Date();
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Leads Pipeline</h2>
          <p className="text-xs text-slate-400 mt-0.5">{leads.length} total leads · ₹ {(totalValue/1000).toFixed(1)}K pipeline value</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm"
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? "Cancel" : "Add Lead"}
        </button>
      </div>

      {/* Pipeline stage bar */}
      <div className="grid grid-cols-6 gap-2">
        {STAGES.map((s) => {
          const m = STAGE_META[s];
          return (
            <button
              key={s}
              onClick={() => setFilterStage(filterStage === s ? "" : s)}
              className={`rounded-xl px-3 py-3 text-center border transition-all ${
                filterStage === s
                  ? "border-indigo-400 bg-indigo-50 shadow-sm"
                  : "border-slate-100 bg-white hover:bg-slate-50"
              }`}
            >
              <div className={`text-lg font-bold ${filterStage === s ? "text-indigo-700" : "text-slate-800"}`}>
                {counts[s] || 0}
              </div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                <span className="text-[10px] font-semibold text-slate-500">{m.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">New Lead</h3>
          <div className="grid grid-cols-3 gap-4">

            <FormField label="Company Name *">
              <input className={inputCls} placeholder="e.g. Mehta Textiles"
                value={form.company_name} onChange={(e) => field("company_name", e.target.value)} />
            </FormField>

            <FormField label="Contact Person">
              <input className={inputCls} placeholder="e.g. Ramesh Mehta"
                value={form.contact_person} onChange={(e) => field("contact_person", e.target.value)} />
            </FormField>

            <FormField label="Contact Number *">
              <input className={inputCls} placeholder="e.g. 9876543210"
                value={form.contact_no} onChange={(e) => field("contact_no", e.target.value)} />
            </FormField>

            <FormField label="City">
              <input className={inputCls} placeholder="e.g. Surat"
                value={form.city} onChange={(e) => field("city", e.target.value)} />
            </FormField>

            <FormField label="Source">
              <select className={inputCls} value={form.source} onChange={(e) => field("source", e.target.value)}>
                <option value="">Select Source</option>
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>

            <FormField label="Product Interest">
              <input className={inputCls} placeholder="e.g. Cotton Yarn 30s"
                value={form.product_interest} onChange={(e) => field("product_interest", e.target.value)} />
            </FormField>

            <FormField label="Estimated Value (₹)">
              <input type="number" className={inputCls} placeholder="e.g. 50000"
                value={form.estimated_value} onChange={(e) => field("estimated_value", e.target.value)} />
            </FormField>

            <FormField label="Stage">
              <select className={inputCls} value={form.stage} onChange={(e) => field("stage", e.target.value)}>
                {STAGES.map((s) => <option key={s} value={s}>{STAGE_META[s].label}</option>)}
              </select>
            </FormField>

            <FormField label="Follow-up Date">
              <input type="date" className={inputCls}
                value={form.follow_up_date} onChange={(e) => field("follow_up_date", e.target.value)} />
            </FormField>

            <div className="col-span-3">
              <FormField label="Notes">
                <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Any additional notes..."
                  value={form.notes} onChange={(e) => field("notes", e.target.value)} />
              </FormField>
            </div>

          </div>
          <div className="flex justify-end mt-5">
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all shadow-sm">
              {saving
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                : <><Plus size={15} />Save Lead</>}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm
                     placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          placeholder="Search company or person..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Leads Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Company", "Contact", "City", "Source", "Product Interest", "Est. Value", "Stage", "Follow-up", "Notes", "Move Stage"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3.5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-14">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Target size={32} className="opacity-30" />
                      <p className="text-sm">{search || filterStage ? "No leads match your filter" : "No leads yet. Click 'Add Lead' to start."}</p>
                    </div>
                  </td>
                </tr>
              )}
              {filtered.map((l, idx) => {
                const m = STAGE_META[l.stage] || STAGE_META["NEW"];
                const followUpDue = isFollowUpDue(l.follow_up_date) && !["WON","LOST"].includes(l.stage);
                return (
                  <tr key={l.id} className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors ${idx % 2 !== 0 ? "bg-slate-50/30" : ""}`}>
                    <td className="px-4 py-3.5 font-semibold text-slate-800 whitespace-nowrap">{l.company_name}</td>
                    <td className="px-4 py-3.5">
                      <div className="text-slate-700 text-xs font-medium">{l.contact_person || "—"}</div>
                      <div className="text-slate-400 text-xs">{l.contact_no}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs">{l.city || "—"}</td>
                    <td className="px-4 py-3.5">
                      {l.source
                        ? <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-full">{l.source}</span>
                        : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs whitespace-nowrap">{l.product_interest || "—"}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-700 whitespace-nowrap">
                      {l.estimated_value ? `₹ ${parseFloat(l.estimated_value).toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`flex items-center gap-1.5 w-fit text-xs font-semibold px-2.5 py-1 rounded-full ${m.color}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                        {m.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {l.follow_up_date ? (
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${followUpDue ? "text-red-500" : "text-slate-600"}`}>
                          {followUpDue && <Clock size={12} />}
                          {new Date(l.follow_up_date).toLocaleDateString("en-IN")}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 max-w-[160px] truncate">{l.notes || "—"}</td>
                    <td className="px-4 py-3.5">
                      {!["WON", "LOST"].includes(l.stage) && (
                        <select
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          value={l.stage}
                          onChange={(e) => updateStage(l.id, e.target.value)}
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>{STAGE_META[s].label}</option>
                          ))}
                        </select>
                      )}
                      {l.stage === "WON" && <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle size={12} />Won</span>}
                      {l.stage === "LOST" && <span className="text-xs text-red-500 font-semibold flex items-center gap-1"><XCircle size={12} />Lost</span>}
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
