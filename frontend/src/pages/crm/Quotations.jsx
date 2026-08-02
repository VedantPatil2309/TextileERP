import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Plus, X, FileText, Send, CheckCircle, XCircle, Clock } from "lucide-react";

const inputCls = `w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800
  placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
  focus:border-transparent transition-all bg-white`;

function FormField({ label, children, span }) {
  return (
    <div className={span ? `col-span-${span}` : ""}>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const STATUS_META = {
  DRAFT:    { label: "Draft",    color: "bg-slate-100 text-slate-600",    icon: <Clock size={12} />       },
  SENT:     { label: "Sent",     color: "bg-blue-50 text-blue-700",       icon: <Send size={12} />        },
  ACCEPTED: { label: "Accepted", color: "bg-emerald-50 text-emerald-700", icon: <CheckCircle size={12} /> },
  REJECTED: { label: "Rejected", color: "bg-red-50 text-red-600",         icon: <XCircle size={12} />     },
  EXPIRED:  { label: "Expired",  color: "bg-amber-50 text-amber-700",     icon: <Clock size={12} />       },
};

const DEFAULT_TERMS = `1. Prices are exclusive of GST unless mentioned.
2. Payment: As per agreed credit terms.
3. Delivery: Subject to stock availability.
4. Quality disputes to be raised within 7 days of receipt.
5. This quotation is valid for the mentioned period only.`;

export default function Quotations() {
  const [quotations, setQuotations] = useState([]);
  const [customers,  setCustomers]  = useState([]);
  const [products,   setProducts]   = useState([]);
  const [qualities,  setQualities]  = useState([]);

  const [activeTab, setActiveTab] = useState("list"); // "list" | "create"
  const [saving,    setSaving]    = useState(false);

  const [form, setForm] = useState({
    customer_id: "", quotation_date: "", valid_till: "", terms: DEFAULT_TERMS, notes: "",
  });
  const [items, setItems] = useState([]);
  const [itemForm, setItemForm] = useState({ product_id: "", quality_id: "", qty: "", unit: "", rate: "", gst_percent: "" });

  const field    = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const iField   = (k, v) => setItemForm((f) => ({ ...f, [k]: v }));

  const loadMasters = () => {
    api.get("/crm/quotation-masters")
      .then((res) => {
        setCustomers(res.data.customers || []);
        setProducts(res.data.products   || []);
        setQualities(res.data.qualities || []);
      });
  };

  const loadQuotations = () => {
    api.get("/crm/quotations")
      .then((res) => setQuotations(res.data))
      .catch(() => console.error("Failed to load quotations"));
  };

  useEffect(() => { loadMasters(); loadQuotations(); }, []);

  // Add item to local list
  const addItem = () => {
    if (!itemForm.product_id || !itemForm.qty || !itemForm.rate) {
      alert("Product, Quantity and Rate are required");
      return;
    }
    const product = products.find((p) => p.id === itemForm.product_id);
    const quality = qualities.find((q) => q.id === itemForm.quality_id);
    const qty     = parseFloat(itemForm.qty);
    const rate    = parseFloat(itemForm.rate);
    const taxable = qty * rate;
    const gst_pct = parseFloat(itemForm.gst_percent || 0);
    const gst_amt = (taxable * gst_pct) / 100;
    const total   = taxable + gst_amt;

    setItems([...items, {
      ...itemForm,
      product_name: product?.product_name || "",
      quality_name: quality?.quality_name || "",
      taxable_amount: taxable.toFixed(2),
      gst_amount: gst_amt.toFixed(2),
      total_amount: total.toFixed(2),
    }]);
    setItemForm({ product_id: "", quality_id: "", qty: "", unit: "", rate: "", gst_percent: "" });
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  // Totals
  const grandTaxable = items.reduce((s, i) => s + parseFloat(i.taxable_amount), 0);
  const grandGST     = items.reduce((s, i) => s + parseFloat(i.gst_amount), 0);
  const grandTotal   = items.reduce((s, i) => s + parseFloat(i.total_amount), 0);

  const save = () => {
    if (!form.customer_id || !form.quotation_date || !form.valid_till) {
      alert("Customer, Date and Valid Till are required");
      return;
    }
    if (items.length === 0) {
      alert("Add at least one item");
      return;
    }
    setSaving(true);
    api.post("/crm/quotations", { ...form, items })
      .then((res) => {
        if (res.data.status === "success") {
          setForm({ customer_id: "", quotation_date: "", valid_till: "", terms: DEFAULT_TERMS, notes: "" });
          setItems([]);
          setActiveTab("list");
          loadQuotations();
        } else alert("Failed to save quotation");
      })
      .catch(() => alert("Error saving quotation"))
      .finally(() => setSaving(false));
  };

  const updateStatus = (id, status) => {
    api.patch(`/crm/quotations/${id}/status`, { status }).then(loadQuotations);
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Quotations</h2>
          <p className="text-xs text-slate-400 mt-0.5">{quotations.length} quotations · ₹ {(quotations.reduce((s, q) => s + parseFloat(q.grand_total || 0), 0) / 1000).toFixed(1)}K total value</p>
        </div>
        <button
          onClick={() => setActiveTab(activeTab === "list" ? "create" : "list")}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm"
        >
          {activeTab === "create" ? <><X size={15} />Cancel</> : <><Plus size={15} />New Quotation</>}
        </button>
      </div>

      {/* Status summary strip */}
      <div className="grid grid-cols-5 gap-3">
        {Object.entries(STATUS_META).map(([key, m]) => (
          <div key={key} className={`rounded-xl border border-slate-100 bg-white px-4 py-3 flex items-center gap-3 shadow-sm`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${m.color}`}>{m.icon}</div>
            <div>
              <div className="text-lg font-bold text-slate-800">{quotations.filter((q) => q.status === key).length}</div>
              <div className="text-[10px] font-semibold text-slate-400">{m.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── CREATE FORM ── */}
      {activeTab === "create" && (
        <div className="space-y-4">

          {/* Header info */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Quotation Details</h3>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Customer *">
                <select className={inputCls} value={form.customer_id} onChange={(e) => field("customer_id", e.target.value)}>
                  <option value="">Select Customer</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.party_name} — {c.city || c.party_code}</option>)}
                </select>
              </FormField>
              <FormField label="Quotation Date *">
                <input type="date" className={inputCls} value={form.quotation_date} onChange={(e) => field("quotation_date", e.target.value)} />
              </FormField>
              <FormField label="Valid Till *">
                <input type="date" className={inputCls} value={form.valid_till} onChange={(e) => field("valid_till", e.target.value)} />
              </FormField>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Add Items</h3>

            {/* Item input row */}
            <div className="grid grid-cols-6 gap-2 mb-3">
              <select className={inputCls} value={itemForm.product_id} onChange={(e) => iField("product_id", e.target.value)}>
                <option value="">Product *</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.product_name}</option>)}
              </select>
              <select className={inputCls} value={itemForm.quality_id} onChange={(e) => iField("quality_id", e.target.value)}>
                <option value="">Quality</option>
                {qualities.map((q) => <option key={q.id} value={q.id}>{q.quality_name}</option>)}
              </select>
              <input className={inputCls} type="number" placeholder="Qty *"
                value={itemForm.qty} onChange={(e) => iField("qty", e.target.value)} />
              <select className={inputCls} value={itemForm.unit} onChange={(e) => iField("unit", e.target.value)}>
                <option value="">Unit</option>
                {["KG","MTR","PCS","RLL"].map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <input className={inputCls} type="number" placeholder="Rate (₹) *"
                value={itemForm.rate} onChange={(e) => iField("rate", e.target.value)} />
              <select className={inputCls} value={itemForm.gst_percent} onChange={(e) => iField("gst_percent", e.target.value)}>
                <option value="">GST %</option>
                {["0","5","12","18","28"].map((g) => <option key={g} value={g}>{g}%</option>)}
              </select>
            </div>
            <button onClick={addItem}
              className="flex items-center gap-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-all mb-4">
              <Plus size={14} /> Add Item
            </button>

            {/* Items table */}
            {items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["#","Product","Quality","Qty","Unit","Rate","Taxable","GST","Total",""].map((h) => (
                        <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-3 py-2.5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-50">
                        <td className="px-3 py-2.5 text-slate-500 text-xs">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-medium text-slate-800">{item.product_name}</td>
                        <td className="px-3 py-2.5 text-slate-600">{item.quality_name || "—"}</td>
                        <td className="px-3 py-2.5 text-slate-600">{item.qty}</td>
                        <td className="px-3 py-2.5 text-slate-600">{item.unit || "—"}</td>
                        <td className="px-3 py-2.5 text-slate-600">₹ {item.rate}</td>
                        <td className="px-3 py-2.5 text-slate-700">₹ {item.taxable_amount}</td>
                        <td className="px-3 py-2.5 text-slate-600">{item.gst_percent ? `${item.gst_percent}% = ₹${item.gst_amount}` : "—"}</td>
                        <td className="px-3 py-2.5 font-semibold text-slate-800">₹ {item.total_amount}</td>
                        <td className="px-3 py-2.5">
                          <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 transition-colors">
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200">
                      <td colSpan={6} className="px-3 py-3 text-xs font-bold text-slate-600 text-right">Totals</td>
                      <td className="px-3 py-3 font-semibold text-slate-700">₹ {grandTaxable.toFixed(2)}</td>
                      <td className="px-3 py-3 font-semibold text-slate-700">₹ {grandGST.toFixed(2)}</td>
                      <td className="px-3 py-3 font-bold text-indigo-700 text-base">₹ {grandTotal.toFixed(2)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Terms & Notes */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Terms & Notes</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Terms & Conditions">
                <textarea className={`${inputCls} resize-none`} rows={6}
                  value={form.terms} onChange={(e) => field("terms", e.target.value)} />
              </FormField>
              <FormField label="Internal Notes">
                <textarea className={`${inputCls} resize-none`} rows={6} placeholder="Internal notes (not shown to customer)"
                  value={form.notes} onChange={(e) => field("notes", e.target.value)} />
              </FormField>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-8 py-2.5 rounded-xl transition-all shadow-sm">
              {saving
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                : <><FileText size={15} />Save Quotation</>}
            </button>
          </div>
        </div>
      )}

      {/* ── LIST ── */}
      {activeTab === "list" && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["Quotation No","Date","Valid Till","Customer","Items","Taxable","GST","Grand Total","Status","Action"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quotations.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-14">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <FileText size={32} className="opacity-30" />
                        <p className="text-sm">No quotations yet. Click "New Quotation" to create one.</p>
                      </div>
                    </td>
                  </tr>
                )}
                {quotations.map((q, idx) => {
                  const m = STATUS_META[q.status] || STATUS_META["DRAFT"];
                  const isExpired = q.status !== "ACCEPTED" && q.status !== "REJECTED" && new Date(q.valid_till) < new Date();
                  return (
                    <tr key={q.id} className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors ${idx % 2 !== 0 ? "bg-slate-50/30" : ""}`}>
                      <td className="px-4 py-3.5 font-mono text-xs text-indigo-600 font-semibold">{q.quotation_number}</td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs whitespace-nowrap">{q.quotation_date}</td>
                      <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                        <span className={isExpired ? "text-red-500 font-semibold" : "text-slate-600"}>{q.valid_till}</span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800 whitespace-nowrap">{q.customer_name}</td>
                      <td className="px-4 py-3.5 text-center text-slate-600">{q.item_count || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">₹ {parseFloat(q.taxable_amount || 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">₹ {parseFloat(q.gst_amount || 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-800 whitespace-nowrap">₹ {parseFloat(q.grand_total || 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3.5">
                        <span className={`flex items-center gap-1.5 w-fit text-xs font-semibold px-2.5 py-1 rounded-full ${m.color}`}>
                          {m.icon}{m.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {!["ACCEPTED","REJECTED","EXPIRED"].includes(q.status) && (
                          <select
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            value={q.status}
                            onChange={(e) => updateStatus(q.id, e.target.value)}
                          >
                            <option value="DRAFT">Draft</option>
                            <option value="SENT">Sent</option>
                            <option value="ACCEPTED">Accepted</option>
                            <option value="REJECTED">Rejected</option>
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
      )}
    </div>
  );
}
