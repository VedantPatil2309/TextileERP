import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Plus, X, FileText } from "lucide-react";

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
  OPEN:      { label: "Open",      color: "bg-blue-50 text-blue-700",       dot: "bg-blue-500"    },
  PARTIAL:   { label: "Partial",   color: "bg-amber-50 text-amber-700",     dot: "bg-amber-500"   },
  CLOSED:    { label: "Closed",    color: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  CANCELLED: { label: "Cancelled", color: "bg-red-50 text-red-600",         dot: "bg-red-400"     },
};

export default function SalesOrder() {
  const [orders,     setOrders]     = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [customers,  setCustomers]  = useState([]);
  const [products,   setProducts]   = useState([]);
  const [qualities,  setQualities]  = useState([]);
  const [activeTab,  setActiveTab]  = useState("list");
  const [saving,     setSaving]     = useState(false);

  const [form, setForm] = useState({
    so_date: "", customer_id: "", quotation_id: "", delivery_date: "", remarks: "",
  });
  const [items, setItems] = useState([]);
  const [itemForm, setItemForm] = useState({
    product_id: "", quality_id: "", qty: "", unit: "", rate: "", gst_percent: "",
  });

  const field  = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const iField = (k, v) => setItemForm((f) => ({ ...f, [k]: v }));

  const loadMasters = () => {
    api.get("/sales/masters").then((res) => {
      setCustomers(res.data.customers   || []);
      setProducts(res.data.products     || []);
      setQualities(res.data.qualities   || []);
      setQuotations(res.data.quotations || []);
    });
  };

  const loadOrders = () => {
    api.get("/sales/orders").then((res) => setOrders(res.data));
  };

  useEffect(() => { loadMasters(); loadOrders(); }, []);

  // When quotation is selected — auto-fill customer + items
  const onQuotationSelect = (qid) => {
    const selectedQuotationId = Number(qid);
    field("quotation_id", selectedQuotationId);
    if (!qid) { setItems([]); return; }
    api.get(`/sales/quotation-items/${selectedQuotationId}`).then((res) => {
      const q = quotations.find((q) => q.id === selectedQuotationId);
      if (q) field("customer_id", q.customer_id);
      setItems(res.data.map((i) => ({
        product_id:     i.product_id,
        quality_id:     i.quality_id || "",
        product_name:   i.product_name,
        quality_name:   i.quality_name || "",
        qty:            i.qty,
        unit:           i.unit || "",
        rate:           i.rate,
        gst_percent:    i.gst_percent || "",
        taxable_amount: (i.qty * i.rate).toFixed(2),
        gst_amount:     ((i.qty * i.rate * (i.gst_percent || 0)) / 100).toFixed(2),
        total_amount:   (i.qty * i.rate * (1 + (i.gst_percent || 0) / 100)).toFixed(2),
        pending_qty:    i.qty,
        delivered_qty:  0,
      })));
    });
  };

  const addItem = () => {
    if (!itemForm.product_id || !itemForm.qty || !itemForm.rate) {
      alert("Product, Qty and Rate are required"); return;
    }
    const p   = products.find((p) => p.id === itemForm.product_id);
    const q   = qualities.find((q) => q.id === itemForm.quality_id);
    const qty = parseFloat(itemForm.qty), rate = parseFloat(itemForm.rate);
    const gst = parseFloat(itemForm.gst_percent || 0);
    const tax = qty * rate;
    setItems([...items, {
      ...itemForm,
      product_name:   p?.product_name || "",
      quality_name:   q?.quality_name || "",
      taxable_amount: tax.toFixed(2),
      gst_amount:     ((tax * gst) / 100).toFixed(2),
      total_amount:   (tax * (1 + gst / 100)).toFixed(2),
      pending_qty:    qty,
      delivered_qty:  0,
    }]);
    setItemForm({ product_id: "", quality_id: "", qty: "", unit: "", rate: "", gst_percent: "" });
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const grandTaxable = items.reduce((s, i) => s + parseFloat(i.taxable_amount), 0);
  const grandGST     = items.reduce((s, i) => s + parseFloat(i.gst_amount), 0);
  const grandTotal   = items.reduce((s, i) => s + parseFloat(i.total_amount), 0);

  const save = () => {
    if (!form.so_date || !form.customer_id) { alert("Date and Customer are required"); return; }
    if (items.length === 0) { alert("Add at least one item"); return; }
    setSaving(true);
    api.post("/sales/orders", { ...form, items })
      .then((res) => {
        if (res.data.status === "success") {
          setForm({ so_date: "", customer_id: "", quotation_id: "", delivery_date: "", remarks: "" });
          setItems([]);
          setActiveTab("list");
          loadOrders();
        } else alert("Failed to create Sales Order");
      })
      .catch(() => alert("Error creating Sales Order"))
      .finally(() => setSaving(false));
  };

  const cancelOrder = (id) => {
    if (!window.confirm("Cancel this Sales Order?")) return;
    api.patch(`/sales/orders/${id}/cancel`).then(loadOrders);
  };

  // summary
  const open    = orders.filter((o) => o.status === "OPEN").length;
  const partial = orders.filter((o) => o.status === "PARTIAL").length;
  const closed  = orders.filter((o) => o.status === "CLOSED").length;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Sales Orders</h2>
          <p className="text-xs text-slate-400 mt-0.5">{orders.length} total orders</p>
        </div>
        <button onClick={() => setActiveTab(activeTab === "list" ? "create" : "list")}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm">
          {activeTab === "create" ? <><X size={15} />Cancel</> : <><Plus size={15} />New SO</>}
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Open",    value: open,    color: "bg-blue-50",    text: "text-blue-700"    },
          { label: "Partial", value: partial, color: "bg-amber-50",   text: "text-amber-700"   },
          { label: "Closed",  value: closed,  color: "bg-emerald-50", text: "text-emerald-700" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border border-slate-100 ${s.color} px-5 py-4 flex items-center gap-4`}>
            <div className={`text-3xl font-bold ${s.text}`}>{s.value}</div>
            <div className={`text-xs font-semibold ${s.text}`}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── CREATE FORM ── */}
      {activeTab === "create" && (
        <div className="space-y-4">

          {/* Header info */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Order Details</h3>
            <div className="grid grid-cols-3 gap-4">

              <FormField label="SO Date *">
                <input type="date" className={inputCls}
                  value={form.so_date} onChange={(e) => field("so_date", e.target.value)} />
              </FormField>

              <FormField label="From Quotation (optional)">
                <select className={inputCls} value={form.quotation_id}
                  onChange={(e) => onQuotationSelect(e.target.value)}>
                  <option value="">Select Accepted Quotation</option>
                  {quotations.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.quotation_number} — {q.customer_name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Customer *">
                <select className={inputCls} value={form.customer_id}
                  onChange={(e) => field("customer_id", e.target.value)}>
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.party_name} — {c.city || c.party_code}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Expected Delivery Date">
                <input type="date" className={inputCls}
                  value={form.delivery_date} onChange={(e) => field("delivery_date", e.target.value)} />
              </FormField>

              <FormField label="Remarks" span={2}>
                <input className={inputCls} placeholder="Optional notes"
                  value={form.remarks} onChange={(e) => field("remarks", e.target.value)} />
              </FormField>

            </div>
          </div>

          {/* Items */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">
              Items {form.quotation_id && <span className="text-xs text-indigo-500 font-normal ml-1">— auto-filled from quotation</span>}
            </h3>

            {/* Add item row */}
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
              <Plus size={14} />Add Item
            </button>

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
                        <td className="px-3 py-2.5 text-slate-400 text-xs">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-medium text-slate-800">{item.product_name}</td>
                        <td className="px-3 py-2.5 text-slate-600">{item.quality_name || "—"}</td>
                        <td className="px-3 py-2.5 text-slate-600">{item.qty}</td>
                        <td className="px-3 py-2.5 text-slate-600">{item.unit || "—"}</td>
                        <td className="px-3 py-2.5 text-slate-600">₹{item.rate}</td>
                        <td className="px-3 py-2.5 text-slate-700">₹{item.taxable_amount}</td>
                        <td className="px-3 py-2.5 text-slate-600">{item.gst_percent ? `${item.gst_percent}%` : "—"}</td>
                        <td className="px-3 py-2.5 font-semibold text-slate-800">₹{item.total_amount}</td>
                        <td className="px-3 py-2.5">
                          <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200">
                      <td colSpan={6} className="px-3 py-3 text-xs font-bold text-slate-600 text-right">Totals</td>
                      <td className="px-3 py-3 font-semibold text-slate-700">₹{grandTaxable.toFixed(2)}</td>
                      <td className="px-3 py-3 font-semibold text-slate-700">₹{grandGST.toFixed(2)}</td>
                      <td className="px-3 py-3 font-bold text-indigo-700 text-base">₹{grandTotal.toFixed(2)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-8 py-2.5 rounded-xl shadow-sm transition-all">
              {saving ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                       : <><FileText size={15} />Save Sales Order</>}
            </button>
          </div>
        </div>
      )}

      {/* ── ORDER LIST ── */}
      {activeTab === "list" && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["SO Number","Date","Customer","Quotation Ref","Delivery Date","Total Amount","Status","Action"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-14 text-slate-400 text-sm">No Sales Orders yet. Click "New SO" to create one.</td></tr>
                )}
                {orders.map((o, idx) => {
                  const m = STATUS_META[o.status] || STATUS_META["OPEN"];
                  return (
                    <tr key={o.id} className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors ${idx % 2 !== 0 ? "bg-slate-50/30" : ""}`}>
                      <td className="px-4 py-3.5 font-mono text-xs text-indigo-600 font-semibold">{o.so_number}</td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs whitespace-nowrap">{o.so_date}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800 whitespace-nowrap">{o.customer_name}</td>
                      <td className="px-4 py-3.5 text-xs font-mono text-slate-500">{o.quotation_number || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs whitespace-nowrap">{o.delivery_date || "—"}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800 whitespace-nowrap">₹ {parseFloat(o.total_amount || 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3.5">
                        <span className={`flex items-center gap-1.5 w-fit text-xs font-semibold px-2.5 py-1 rounded-full ${m.color}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />{m.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 flex items-center gap-2">
                        {o.status === "OPEN" && (
                          <button onClick={() => cancelOrder(o.id)}
                            className="text-xs text-red-500 hover:underline">Cancel</button>
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
