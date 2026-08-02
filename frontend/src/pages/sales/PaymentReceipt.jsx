import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Plus, X, IndianRupee, CheckCircle, Banknote, CreditCard, Building } from "lucide-react";

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

const MODE_ICONS = {
  Cash:   <Banknote size={13} />,
  Cheque: <CreditCard size={13} />,
  NEFT:   <Building size={13} />,
  RTGS:   <Building size={13} />,
  UPI:    <IndianRupee size={13} />,
};

const PAYMENT_MODES = ["Cash", "Cheque", "NEFT", "RTGS", "UPI"];

export default function PaymentReceipt() {
  const [receipts,        setReceipts]        = useState([]);
  const [unpaidInvoices,  setUnpaidInvoices]  = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showForm,        setShowForm]        = useState(false);
  const [saving,          setSaving]          = useState(false);

  const [form, setForm] = useState({
    receipt_date: "", invoice_id: "", amount_received: "",
    payment_mode: "Cash", reference_no: "", remarks: "",
  });

  const field = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const loadReceipts = () =>
    api.get("/sales/receipts").then((res) => setReceipts(res.data));

  const loadUnpaidInvoices = () =>
    api.get("/sales/invoices?payment_status=UNPAID,PARTIAL")
      .then((res) => setUnpaidInvoices(res.data));

  useEffect(() => { loadReceipts(); loadUnpaidInvoices(); }, []);

  const onInvoiceSelect = (invId) => {
    const selectedInvoiceId = Number(invId);
    field("invoice_id", selectedInvoiceId);
    const inv = unpaidInvoices.find((i) => i.id === selectedInvoiceId);
    setSelectedInvoice(inv || null);
    if (inv) field("amount_received", inv.balance_amount || inv.grand_total);
  };

  const save = () => {
    if (!form.receipt_date || !form.invoice_id || !form.amount_received) {
      alert("Date, Invoice and Amount are required"); return;
    }
    setSaving(true);
    api.post("/sales/receipts", form)
      .then((res) => {
        if (res.data.status === "success") {
          setForm({ receipt_date: "", invoice_id: "", amount_received: "", payment_mode: "Cash", reference_no: "", remarks: "" });
          setSelectedInvoice(null);
          setShowForm(false);
          loadReceipts();
          loadUnpaidInvoices();
        } else alert("Failed to save receipt");
      })
      .catch(() => alert("Error saving receipt"))
      .finally(() => setSaving(false));
  };

  // Summary
  const totalReceived = receipts.reduce((s, r) => s + parseFloat(r.amount_received || 0), 0);
  const todayReceipts = receipts.filter((r) => r.receipt_date === new Date().toISOString().split("T")[0]);
  const todayAmount   = todayReceipts.reduce((s, r) => s + parseFloat(r.amount_received || 0), 0);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Payment Receipts</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {receipts.length} receipts · ₹ {(totalReceived / 1000).toFixed(1)}K total collected
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm">
          {showForm ? <><X size={15} />Cancel</> : <><Plus size={15} />New Receipt</>}
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <IndianRupee size={16} className="text-emerald-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800">₹ {(totalReceived / 1000).toFixed(1)}K</div>
            <div className="text-xs text-slate-400">Total Collected</div>
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle size={16} className="text-indigo-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800">{receipts.length}</div>
            <div className="text-xs text-slate-400">Total Receipts</div>
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Banknote size={16} className="text-amber-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800">₹ {(todayAmount / 1000).toFixed(1)}K</div>
            <div className="text-xs text-slate-400">Received Today</div>
          </div>
        </div>
      </div>

      {/* Pending invoices alert */}
      {unpaidInvoices.length > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5">
          <IndianRupee size={16} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            <span className="font-bold">{unpaidInvoices.length} invoice{unpaidInvoices.length > 1 ? "s" : ""}</span> pending payment totalling{" "}
            <span className="font-bold">
              ₹ {unpaidInvoices.reduce((s, i) => s + parseFloat(i.balance_amount || i.grand_total || 0), 0).toLocaleString("en-IN")}
            </span>
          </p>
        </div>
      )}

      {/* ── FORM ── */}
      {showForm && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">New Payment Receipt</h3>
          <div className="grid grid-cols-3 gap-4">

            <FormField label="Receipt Date *">
              <input type="date" className={inputCls}
                value={form.receipt_date} onChange={(e) => field("receipt_date", e.target.value)} />
            </FormField>

            <FormField label="Invoice *">
              <select className={inputCls} value={form.invoice_id}
                onChange={(e) => onInvoiceSelect(e.target.value)}>
                <option value="">Select Unpaid Invoice</option>
                {unpaidInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} — {inv.customer_name} (₹{parseFloat(inv.balance_amount || inv.grand_total).toLocaleString("en-IN")})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Payment Mode">
              <select className={inputCls} value={form.payment_mode}
                onChange={(e) => field("payment_mode", e.target.value)}>
                {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </FormField>

            <FormField label="Amount Received (₹) *">
              <input type="number" className={inputCls} placeholder="Enter amount"
                value={form.amount_received} onChange={(e) => field("amount_received", e.target.value)} />
            </FormField>

            <FormField label="Reference / Cheque No">
              <input className={inputCls} placeholder="e.g. UTR number or Cheque no."
                value={form.reference_no} onChange={(e) => field("reference_no", e.target.value)} />
            </FormField>

            <FormField label="Remarks">
              <input className={inputCls} placeholder="Optional notes"
                value={form.remarks} onChange={(e) => field("remarks", e.target.value)} />
            </FormField>

          </div>

          {/* Invoice summary panel */}
          {selectedInvoice && (
            <div className="mt-4 grid grid-cols-4 gap-3">
              {[
                { label: "Invoice Total", value: `₹ ${parseFloat(selectedInvoice.grand_total).toLocaleString("en-IN")}` },
                { label: "Amount Paid",   value: `₹ ${parseFloat(selectedInvoice.amount_paid || 0).toLocaleString("en-IN")}` },
                { label: "Balance Due",   value: `₹ ${parseFloat(selectedInvoice.balance_amount || selectedInvoice.grand_total).toLocaleString("en-IN")}`, highlight: true },
                { label: "Current Status", value: selectedInvoice.payment_status },
              ].map((s) => (
                <div key={s.label} className={`rounded-xl px-4 py-3 border ${s.highlight ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"}`}>
                  <div className="text-xs text-slate-500">{s.label}</div>
                  <div className={`font-bold text-sm mt-0.5 ${s.highlight ? "text-red-600" : "text-slate-800"}`}>{s.value}</div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end mt-5">
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-8 py-2.5 rounded-xl shadow-sm transition-all">
              {saving ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                      : <><IndianRupee size={15} />Save Receipt</>}
            </button>
          </div>
        </div>
      )}

      {/* ── RECEIPTS LIST ── */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Receipt No","Date","Customer","Invoice Ref","Amount Received","Mode","Reference No","Remarks"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3.5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {receipts.length === 0 && (
                <tr><td colSpan={8} className="text-center py-14">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <IndianRupee size={32} className="opacity-30" />
                    <p className="text-sm">No payment receipts yet.</p>
                  </div>
                </td></tr>
              )}
              {receipts.map((r, idx) => (
                <tr key={r.id} className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors ${idx % 2 !== 0 ? "bg-slate-50/30" : ""}`}>
                  <td className="px-4 py-3.5 font-mono text-xs text-indigo-600 font-semibold">{r.receipt_number}</td>
                  <td className="px-4 py-3.5 text-slate-600 text-xs whitespace-nowrap">{r.receipt_date}</td>
                  <td className="px-4 py-3.5 font-semibold text-slate-800 whitespace-nowrap">{r.customer_name}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-500">{r.invoice_number}</td>
                  <td className="px-4 py-3.5 font-bold text-emerald-700 whitespace-nowrap">
                    ₹ {parseFloat(r.amount_received).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full w-fit">
                      {MODE_ICONS[r.payment_mode]}
                      {r.payment_mode}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-mono text-slate-500">{r.reference_no || "—"}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">{r.remarks || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
