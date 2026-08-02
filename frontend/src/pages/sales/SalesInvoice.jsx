import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Plus, X, FileText,  CheckCircle, Clock, AlertCircle } from "lucide-react";

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

const PAY_META = {
  UNPAID:  { label: "Unpaid",  color: "bg-red-50 text-red-600",         icon: <AlertCircle size={12} /> },
  PARTIAL: { label: "Partial", color: "bg-amber-50 text-amber-700",     icon: <Clock size={12} />       },
  PAID:    { label: "Paid",    color: "bg-emerald-50 text-emerald-700", icon: <CheckCircle size={12} /> },
};

const GST_TYPE_OPTIONS = ["CGST/SGST", "IGST"];

export default function SalesInvoice() {
  const [invoices,  setInvoices]  = useState([]);
  const [challans,  setChallans]  = useState([]);
  const [activeTab, setActiveTab] = useState("list");
  const [saving,    setSaving]    = useState(false);

  const [form, setForm] = useState({
    invoice_date: "", challan_id: "", customer_id: "",
    customer_name: "", so_number: "", challan_number: "",
    gst_type: "CGST/SGST", due_date: "", remarks: "",
  });
  const [items, setItems] = useState([]);

  const field = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const loadInvoices = () =>
    api.get("/sales/invoices").then((res) => setInvoices(res.data));

  const loadChallans = () =>
    api.get("/sales/challans?status=DELIVERED").then((res) => setChallans(res.data));

  useEffect(() => { loadInvoices(); loadChallans(); }, []);

  // When challan selected — auto-fill everything
  const onChallanSelect = (challanId) => {
    const selectedChallanId = Number(challanId);
    field("challan_id", selectedChallanId);
    setItems([]);
    if (!challanId) return;
    api.get(`/sales/challan-items/${selectedChallanId}`).then((res) => {
      const c = challans.find((c) => c.id === selectedChallanId);
      if (c) {
        setForm((f) => ({
          ...f,
          challan_id:     selectedChallanId,
          customer_id:    c.customer_id,
          customer_name:  c.customer_name,
          so_number:      c.so_number,
          challan_number: c.challan_number,
        }));
      }
      setItems(res.data);
    });
  };

  // Recalculate GST split whenever gst_type changes
  const getGstSplit = (item) => {
    const gst = parseFloat(item.gst_amount || 0);
    if (form.gst_type === "IGST") {
      return { igst: gst.toFixed(2), cgst: "0.00", sgst: "0.00" };
    }
    return { igst: "0.00", cgst: (gst / 2).toFixed(2), sgst: (gst / 2).toFixed(2) };
  };

  // Totals
  const taxable   = items.reduce((s, i) => s + parseFloat(i.taxable_amount || 0), 0);
  const totalGST  = items.reduce((s, i) => s + parseFloat(i.gst_amount || 0), 0);
  const grandTotal = taxable + totalGST;
  const cgst       = form.gst_type === "CGST/SGST" ? (totalGST / 2).toFixed(2) : "0.00";
  const sgst       = form.gst_type === "CGST/SGST" ? (totalGST / 2).toFixed(2) : "0.00";
  const igst       = form.gst_type === "IGST"       ? totalGST.toFixed(2)       : "0.00";

  const save = () => {
    if (!form.invoice_date || !form.challan_id) {
      alert("Invoice Date and Delivery Challan are required"); return;
    }
    if (items.length === 0) { alert("No items found from challan"); return; }
    setSaving(true);
    api.post("/sales/invoices", {
      ...form,
      items,
      taxable_amount: taxable,
      cgst_amount:    parseFloat(cgst),
      sgst_amount:    parseFloat(sgst),
      igst_amount:    parseFloat(igst),
      total_gst:      totalGST,
      grand_total:    grandTotal,
    })
      .then((res) => {
        if (res.data.status === "success") {
          setForm({ invoice_date: "", challan_id: "", customer_id: "", customer_name: "", so_number: "", challan_number: "", gst_type: "CGST/SGST", due_date: "", remarks: "" });
          setItems([]);
          setActiveTab("list");
          loadInvoices();
          loadChallans();
        } else alert("Failed to create invoice");
      })
      .catch(() => alert("Error creating invoice"))
      .finally(() => setSaving(false));
  };

  const markPaid = (id) =>
    api.patch(`/sales/invoices/${id}/pay`).then(loadInvoices);

  // Summary stats
  const unpaid  = invoices.filter((i) => i.payment_status === "UNPAID").length;
  const partial = invoices.filter((i) => i.payment_status === "PARTIAL").length;
  const paid    = invoices.filter((i) => i.payment_status === "PAID").length;
  const outstanding = invoices
    .filter((i) => i.payment_status !== "PAID")
    .reduce((s, i) => s + parseFloat(i.grand_total || 0), 0);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Sales Invoices</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {invoices.length} invoices · ₹ {(outstanding / 1000).toFixed(1)}K outstanding
          </p>
        </div>
        <button onClick={() => setActiveTab(activeTab === "list" ? "create" : "list")}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm">
          {activeTab === "create" ? <><X size={15} />Cancel</> : <><Plus size={15} />New Invoice</>}
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Unpaid",      value: unpaid,  bg: "bg-red-50",    text: "text-red-600"     },
          { label: "Partial",     value: partial, bg: "bg-amber-50",  text: "text-amber-700"   },
          { label: "Paid",        value: paid,    bg: "bg-emerald-50",text: "text-emerald-700" },
          { label: "Outstanding", value: `₹${(outstanding/1000).toFixed(1)}K`, bg: "bg-indigo-50", text: "text-indigo-700" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border border-slate-100 ${s.bg} px-5 py-4 flex items-center gap-3`}>
            <div className={`text-2xl font-bold ${s.text}`}>{s.value}</div>
            <div className={`text-xs font-semibold ${s.text}`}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── CREATE FORM ── */}
      {activeTab === "create" && (
        <div className="space-y-4">

          {/* Invoice header */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Invoice Details</h3>
            <div className="grid grid-cols-3 gap-4">

              <FormField label="Invoice Date *">
                <input type="date" className={inputCls}
                  value={form.invoice_date} onChange={(e) => field("invoice_date", e.target.value)} />
              </FormField>

              <FormField label="Delivery Challan *">
                <select className={inputCls} value={form.challan_id}
                  onChange={(e) => onChallanSelect(e.target.value)}>
                  <option value="">Select Delivered Challan</option>
                  {challans.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.challan_number} — {c.customer_name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="GST Type">
                <select className={inputCls} value={form.gst_type}
                  onChange={(e) => field("gst_type", e.target.value)}>
                  {GST_TYPE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </FormField>

              {form.customer_name && (
                <div className="col-span-1 flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                  <div>
                    <div className="text-xs text-slate-500">Customer</div>
                    <div className="text-sm font-semibold text-slate-800">{form.customer_name}</div>
                  </div>
                </div>
              )}

              {form.so_number && (
                <div className="col-span-1 flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                  <div>
                    <div className="text-xs text-slate-500">Sales Order</div>
                    <div className="text-sm font-semibold font-mono text-slate-700">{form.so_number}</div>
                  </div>
                </div>
              )}

              <FormField label="Payment Due Date">
                <input type="date" className={inputCls}
                  value={form.due_date} onChange={(e) => field("due_date", e.target.value)} />
              </FormField>

              <FormField label="Remarks" span={3}>
                <input className={inputCls} placeholder="Optional notes"
                  value={form.remarks} onChange={(e) => field("remarks", e.target.value)} />
              </FormField>
            </div>
          </div>

          {/* Items auto-filled */}
          {items.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-1">Invoice Items</h3>
              <p className="text-xs text-slate-400 mb-4">Auto-filled from Delivery Challan · GST split as {form.gst_type}</p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["#","Product","Quality","Qty","Unit","Rate","Taxable",
                        form.gst_type === "IGST" ? "IGST" : "CGST",
                        form.gst_type === "IGST" ? "" : "SGST",
                        "Total"].filter(Boolean).map((h) => (
                        <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-3 py-2.5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const split = getGstSplit(item);
                      return (
                        <tr key={idx} className="border-b border-slate-50">
                          <td className="px-3 py-2.5 text-slate-400 text-xs">{idx + 1}</td>
                          <td className="px-3 py-2.5 font-medium text-slate-800">{item.product_name}</td>
                          <td className="px-3 py-2.5 text-slate-600">{item.quality_name || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-600">{item.delivery_qty}</td>
                          <td className="px-3 py-2.5 text-slate-600">{item.unit || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-600">₹{item.rate}</td>
                          <td className="px-3 py-2.5 text-slate-700">₹{item.taxable_amount}</td>
                          {form.gst_type === "IGST" ? (
                            <td className="px-3 py-2.5 text-slate-600">₹{split.igst}</td>
                          ) : (
                            <>
                              <td className="px-3 py-2.5 text-slate-600">₹{split.cgst}</td>
                              <td className="px-3 py-2.5 text-slate-600">₹{split.sgst}</td>
                            </>
                          )}
                          <td className="px-3 py-2.5 font-semibold text-slate-800">
                            ₹{(parseFloat(item.taxable_amount) + parseFloat(item.gst_amount || 0)).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td colSpan={6} className="px-3 py-3 text-xs font-bold text-slate-600 text-right">Totals</td>
                      <td className="px-3 py-3 font-semibold text-slate-700">₹{taxable.toFixed(2)}</td>
                      {form.gst_type === "IGST" ? (
                        <td className="px-3 py-3 font-semibold text-slate-700">₹{igst}</td>
                      ) : (
                        <>
                          <td className="px-3 py-3 font-semibold text-slate-700">₹{cgst}</td>
                          <td className="px-3 py-3 font-semibold text-slate-700">₹{sgst}</td>
                        </>
                      )}
                      <td className="px-3 py-3 font-bold text-indigo-700 text-base">₹{grandTotal.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* GST summary box */}
              <div className="mt-4 flex justify-end">
                <div className="bg-slate-50 border border-slate-100 rounded-xl px-5 py-4 min-w-64 space-y-2">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Taxable Amount</span>
                    <span className="font-semibold">₹ {taxable.toFixed(2)}</span>
                  </div>
                  {form.gst_type === "CGST/SGST" ? (
                    <>
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>CGST</span>
                        <span className="font-semibold">₹ {cgst}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>SGST</span>
                        <span className="font-semibold">₹ {sgst}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>IGST</span>
                      <span className="font-semibold">₹ {igst}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-800">
                    <span>Grand Total</span>
                    <span className="text-indigo-700">₹ {grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-8 py-2.5 rounded-xl shadow-sm transition-all">
              {saving ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                      : <><FileText size={15} />Save Invoice</>}
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
                  {["Invoice No","Date","Customer","SO Ref","Challan Ref","Taxable","GST","Grand Total","Due Date","Payment","Action"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 && (
                  <tr><td colSpan={11} className="text-center py-14">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <FileText size={32} className="opacity-30" />
                      <p className="text-sm">No invoices yet. Create from a delivered challan.</p>
                    </div>
                  </td></tr>
                )}
                {invoices.map((inv, idx) => {
                  const pm = PAY_META[inv.payment_status] || PAY_META["UNPAID"];
                  const isOverdue = inv.payment_status !== "PAID" && inv.due_date && new Date(inv.due_date) < new Date();
                  return (
                    <tr key={inv.id} className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors ${idx % 2 !== 0 ? "bg-slate-50/30" : ""}`}>
                      <td className="px-4 py-3.5 font-mono text-xs text-indigo-600 font-semibold">{inv.invoice_number}</td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs whitespace-nowrap">{inv.invoice_date}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800 whitespace-nowrap">{inv.customer_name}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-500">{inv.so_number || "—"}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-500">{inv.challan_number}</td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">₹ {parseFloat(inv.taxable_amount || 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">₹ {parseFloat(inv.total_gst || 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-800 whitespace-nowrap">₹ {parseFloat(inv.grand_total || 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`text-xs font-medium ${isOverdue ? "text-red-500 font-semibold" : "text-slate-600"}`}>
                          {isOverdue && "⚠ "}{inv.due_date || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`flex items-center gap-1.5 w-fit text-xs font-semibold px-2.5 py-1 rounded-full ${pm.color}`}>
                          {pm.icon}{pm.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {inv.payment_status !== "PAID" && (
                          <button onClick={() => markPaid(inv.id)}
                            className="text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-all">
                            Mark Paid
                          </button>
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
