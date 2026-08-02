import { useEffect, useState } from "react";
import { api } from "../../services/api";

export default function PurchaseInvoice() {
  const [pendingGRNs, setPendingGRNs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [grnItems, setGrnItems] = useState([]);

  const [form, setForm] = useState({
    invoice_date: "",
    grn_id: "",
    po_id: "",
    party_id: "",
    party_name: "",
    supplier_inv_no: "",
    supplier_inv_date: "",
    taxable_amount: "",
    gst_percent: "",
    gst_amount: "",
    total_amount: "",
    due_date: "",
  });

  const [activeTab, setActiveTab] = useState("list");

  const loadPendingGRNs = () => {
    api.get("/purchase/grn?status=ACCEPTED").then((res) => setPendingGRNs(res.data));
  };

  const loadInvoices = () => {
    api.get("/purchase/invoices").then((res) => setInvoices(res.data));
  };

  useEffect(() => {
    loadPendingGRNs();
    loadInvoices();
  }, []);

  const onGRNSelect = (grn_id) => {
    const selectedGrnId = Number(grn_id);
    if (!grn_id) {
      setGrnItems([]);
      setForm((f) => ({
        ...f,
        grn_id: "",
        po_id: "",
        party_id: "",
        party_name: "",
        taxable_amount: "",
        gst_amount: "",
        total_amount: "",
      }));
      return;
    }

    const grn = pendingGRNs.find((g) => g.id === selectedGrnId);
    setForm((f) => ({
      ...f,
      grn_id: selectedGrnId,
      po_id: grn?.po_id || "",
      party_id: grn?.party_id || "",
      party_name: grn?.party_name || "",
    }));

    api.get(`/purchase/grn/${selectedGrnId}/items`).then((res) => {
      const items = res.data;
      setGrnItems(items);
      const taxable = items.reduce(
        (sum, i) => sum + parseFloat(i.accepted_qty) * parseFloat(i.rate),
        0
      ).toFixed(2);
      setForm((f) => ({
        ...f,
        taxable_amount: taxable,
      }));
    });
  };

  // Auto-calculate GST amount and total when gst% or taxable changes
  const onGSTChange = (gst_percent) => {
    const taxable = parseFloat(form.taxable_amount) || 0;
    const gst_amount = ((taxable * parseFloat(gst_percent || 0)) / 100).toFixed(2);
    const total_amount = (taxable + parseFloat(gst_amount)).toFixed(2);
    setForm((f) => ({ ...f, gst_percent, gst_amount, total_amount }));
  };

  // Auto-calculate due date from party credit days
  const onInvoiceDateChange = (invoice_date) => {
    const grn = pendingGRNs.find((g) => g.id === Number(form.grn_id));
    const creditDays = grn?.credit_days || 0;
    let due_date = "";
    if (invoice_date && creditDays) {
      const d = new Date(invoice_date);
      d.setDate(d.getDate() + parseInt(creditDays, 10));
      due_date = d.toISOString().split("T")[0];
    }
    setForm((f) => ({ ...f, invoice_date, due_date }));
  };

  const saveInvoice = () => {
    if (!form.invoice_date || !form.grn_id || !form.supplier_inv_no) {
      alert("Invoice Date, GRN and Supplier Invoice No are required");
      return;
    }

    api
      .post("/purchase/invoices", form)
      .then((res) => {
        if (res.data.status === "success") {
          alert(res.data.message);
          setForm({
            invoice_date: "",
            grn_id: "",
            po_id: "",
            party_id: "",
            party_name: "",
            supplier_inv_no: "",
            supplier_inv_date: "",
            taxable_amount: "",
            gst_percent: "",
            gst_amount: "",
            total_amount: "",
            due_date: "",
          });
          setGrnItems([]);
          setActiveTab("list");
          loadInvoices();
          loadPendingGRNs();
        } else {
          alert("Failed to create invoice");
        }
      })
      .catch(() => alert("Error while creating Purchase Invoice"));
  };

  const markPaid = (id) => {
    api.patch(`/purchase/invoices/${id}/pay`).then(() => {
      alert("Invoice marked as Paid");
      loadInvoices();
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Purchase Invoice</h2>
        <button
          onClick={() => setActiveTab(activeTab === "list" ? "create" : "list")}
          className="bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 hover:scale-105 transition-all duration-200 shadow-md"
        >
          {activeTab === "list" ? "+ New Invoice" : "← Back to List"}
        </button>
      </div>

      {/* ── CREATE INVOICE ── */}
      {activeTab === "create" && (
        <div>
          {/* Invoice Header */}
          <div className="bg-white p-4 rounded shadow mb-4">
            <h3 className="font-semibold text-gray-700 mb-3">Invoice Details</h3>
            <div className="grid grid-cols-2 gap-3">

              <div>
                <label className="block text-sm font-medium mb-1">Select GRN *</label>
                <select
                  className="border p-2 w-full"
                  value={form.grn_id}
                  onChange={(e) => onGRNSelect(e.target.value)}
                >
                  <option value="">Select Accepted GRN</option>
                  {pendingGRNs.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.grn_number} — {g.party_name} ({g.grn_date})
                    </option>
                  ))}
                </select>
              </div>

              {form.party_name && (
                <div>
                  <label className="block text-sm font-medium mb-1">Supplier</label>
                  <input
                    className="border p-2 w-full bg-gray-50"
                    value={form.party_name}
                    readOnly
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Invoice Date *</label>
                <input
                  type="date"
                  className="border p-2 w-full"
                  value={form.invoice_date}
                  onChange={(e) => onInvoiceDateChange(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Supplier Invoice No *
                </label>
                <input
                  placeholder="Supplier Invoice No"
                  className="border p-2 w-full"
                  value={form.supplier_inv_no}
                  onChange={(e) =>
                    setForm({ ...form, supplier_inv_no: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Supplier Invoice Date
                </label>
                <input
                  type="date"
                  className="border p-2 w-full"
                  value={form.supplier_inv_date}
                  onChange={(e) =>
                    setForm({ ...form, supplier_inv_date: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Due Date</label>
                <input
                  type="date"
                  className="border p-2 w-full bg-gray-50"
                  value={form.due_date}
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Items Preview */}
          {grnItems.length > 0 && (
            <div className="bg-white p-4 rounded shadow mb-4">
              <h3 className="font-semibold text-gray-700 mb-3">Items from GRN</h3>
              <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2">#</th>
                    <th className="border p-2">Product</th>
                    <th className="border p-2">Quality</th>
                    <th className="border p-2">Accepted Qty</th>
                    <th className="border p-2">Unit</th>
                    <th className="border p-2">Rate</th>
                    <th className="border p-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {grnItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="border p-2 text-center">{idx + 1}</td>
                      <td className="border p-2">{item.product_name}</td>
                      <td className="border p-2">{item.quality_name}</td>
                      <td className="border p-2 text-center">{item.accepted_qty}</td>
                      <td className="border p-2 text-center">{item.unit}</td>
                      <td className="border p-2 text-right">₹ {item.rate}</td>
                      <td className="border p-2 text-right">
                        ₹ {(item.accepted_qty * item.rate).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* GST & Totals */}
          {form.taxable_amount && (
            <div className="bg-white p-4 rounded shadow mb-4">
              <h3 className="font-semibold text-gray-700 mb-3">Tax & Amount</h3>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <div>
                  <label className="block text-sm font-medium mb-1">Taxable Amount</label>
                  <input
                    className="border p-2 w-full bg-gray-50 font-semibold"
                    value={`₹ ${form.taxable_amount}`}
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">GST %</label>
                  <select
                    className="border p-2 w-full"
                    value={form.gst_percent}
                    onChange={(e) => onGSTChange(e.target.value)}
                  >
                    <option value="">Select GST %</option>
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">GST Amount</label>
                  <input
                    className="border p-2 w-full bg-gray-50"
                    value={form.gst_amount ? `₹ ${form.gst_amount}` : ""}
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-blue-700 font-bold">
                    Total Amount
                  </label>
                  <input
                    className="border p-2 w-full bg-blue-50 font-bold text-blue-700"
                    value={form.total_amount ? `₹ ${form.total_amount}` : ""}
                    readOnly
                  />
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="bg-white p-4 rounded shadow">
            <div className="flex justify-center">
              <button
                onClick={saveInvoice}
                className="bg-blue-600 text-white px-8 py-2 rounded-xl hover:bg-blue-700 hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Save Purchase Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── INVOICE LIST ── */}
      {activeTab === "list" && (
        <table className="w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Invoice No</th>
              <th className="border p-2">Date</th>
              <th className="border p-2">Supplier</th>
              <th className="border p-2">GRN No</th>
              <th className="border p-2">Supplier Bill</th>
              <th className="border p-2">Taxable</th>
              <th className="border p-2">GST</th>
              <th className="border p-2">Total</th>
              <th className="border p-2">Due Date</th>
              <th className="border p-2">Payment</th>
              <th className="border p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr>
                <td
                  className="border p-4 text-center text-gray-400"
                  colSpan={11}
                >
                  No invoices found. Click "+ New Invoice" to create one.
                </td>
              </tr>
            )}
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td className="border p-2 font-medium text-blue-700">
                  {inv.invoice_number}
                </td>
                <td className="border p-2">{inv.invoice_date}</td>
                <td className="border p-2">{inv.party_name}</td>
                <td className="border p-2">{inv.grn_number}</td>
                <td className="border p-2">{inv.supplier_inv_no}</td>
                <td className="border p-2">₹ {inv.taxable_amount}</td>
                <td className="border p-2">₹ {inv.gst_amount}</td>
                <td className="border p-2 font-semibold">₹ {inv.total_amount}</td>
                <td className="border p-2">
                  <span
                    className={
                      new Date(inv.due_date) < new Date() &&
                      inv.payment_status !== "PAID"
                        ? "text-red-600 font-semibold"
                        : ""
                    }
                  >
                    {inv.due_date}
                  </span>
                </td>
                <td className="border p-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      inv.payment_status === "PAID"
                        ? "bg-green-100 text-green-700"
                        : inv.payment_status === "PARTIAL"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {inv.payment_status}
                  </span>
                </td>
                <td className="border p-2">
                  {inv.payment_status !== "PAID" && (
                    <button
                      onClick={() => markPaid(inv.id)}
                      className="text-green-600 underline text-sm"
                    >
                      Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
