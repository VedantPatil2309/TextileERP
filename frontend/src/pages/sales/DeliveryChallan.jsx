import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Plus, X, Truck } from "lucide-react";

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
  PENDING:   { label: "Pending",   color: "bg-slate-100 text-slate-600"    },
  DELIVERED: { label: "Delivered", color: "bg-emerald-50 text-emerald-700" },
  INVOICED:  { label: "Invoiced",  color: "bg-indigo-50 text-indigo-700"   },
};

export default function DeliveryChallan() {
  const [challans,  setChallans]  = useState([]);
  const [openSOs,   setOpenSOs]   = useState([]);
  const [activeTab, setActiveTab] = useState("list");
  const [saving,    setSaving]    = useState(false);

  const [form, setForm] = useState({
    challan_date: "", so_id: "", vehicle_no: "", driver_name: "", remarks: "",
  });
  const [deliveryItems, setDeliveryItems] = useState([]);

  const field = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const loadChallans = () =>
    api.get("/sales/challans").then((res) => setChallans(res.data));

  const loadOpenSOs = () =>
    api.get("/sales/orders?status=OPEN").then((res) => setOpenSOs(res.data));

  useEffect(() => { loadChallans(); loadOpenSOs(); }, []);

  // When SO selected — load its pending items
  const onSOSelect = (soId) => {
    const selectedSoId = Number(soId);
    field("so_id", selectedSoId);
    setDeliveryItems([]);
    if (!soId) return;
    api.get(`/sales/order-items/${selectedSoId}`).then((res) => {
      setDeliveryItems(res.data.map((i) => ({
        so_item_id:    i.id,
        product_id:    i.product_id,
        quality_id:    i.quality_id,
        product_name:  i.product_name,
        quality_name:  i.quality_name || "",
        unit:          i.unit || "",
        ordered_qty:   i.qty,
        pending_qty:   i.pending_qty,
        delivery_qty:  i.pending_qty, // default to full pending
      })));
    });
  };

  const updateDeliveryQty = (idx, val) => {
    setDeliveryItems((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, delivery_qty: val } : item
      )
    );
  };

  const save = () => {
    if (!form.challan_date || !form.so_id) {
      alert("Date and Sales Order are required"); return;
    }
    const validItems = deliveryItems.filter((i) => parseFloat(i.delivery_qty) > 0);
    if (validItems.length === 0) {
      alert("Enter delivery qty for at least one item"); return;
    }
    setSaving(true);
    api.post("/sales/challans", { ...form, items: validItems })
      .then((res) => {
        if (res.data.status === "success") {
          setForm({ challan_date: "", so_id: "", vehicle_no: "", driver_name: "", remarks: "" });
          setDeliveryItems([]);
          setActiveTab("list");
          loadChallans();
          loadOpenSOs();
        } else alert("Failed to create challan");
      })
      .catch(() => alert("Error creating challan"))
      .finally(() => setSaving(false));
  };

  const pending   = challans.filter((c) => c.status === "PENDING").length;
  const delivered = challans.filter((c) => c.status === "DELIVERED").length;
  const invoiced  = challans.filter((c) => c.status === "INVOICED").length;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Delivery Challans</h2>
          <p className="text-xs text-slate-400 mt-0.5">{challans.length} total challans</p>
        </div>
        <button onClick={() => setActiveTab(activeTab === "list" ? "create" : "list")}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm">
          {activeTab === "create" ? <><X size={15} />Cancel</> : <><Plus size={15} />New Challan</>}
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending",   value: pending,   bg: "bg-slate-50",    text: "text-slate-700"   },
          { label: "Delivered", value: delivered, bg: "bg-emerald-50",  text: "text-emerald-700" },
          { label: "Invoiced",  value: invoiced,  bg: "bg-indigo-50",   text: "text-indigo-700"  },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border border-slate-100 ${s.bg} px-5 py-4 flex items-center gap-4`}>
            <div className={`text-3xl font-bold ${s.text}`}>{s.value}</div>
            <div className={`text-xs font-semibold ${s.text}`}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── CREATE FORM ── */}
      {activeTab === "create" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Challan Details</h3>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Challan Date *">
                <input type="date" className={inputCls}
                  value={form.challan_date} onChange={(e) => field("challan_date", e.target.value)} />
              </FormField>

              <FormField label="Sales Order *">
                <select className={inputCls} value={form.so_id}
                  onChange={(e) => onSOSelect(e.target.value)}>
                  <option value="">Select Open Sales Order</option>
                  {openSOs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.so_number} — {o.customer_name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Vehicle No">
                <input className={inputCls} placeholder="e.g. GJ05AB1234"
                  value={form.vehicle_no} onChange={(e) => field("vehicle_no", e.target.value)} />
              </FormField>

              <FormField label="Driver Name">
                <input className={inputCls} placeholder="e.g. Ramesh Kumar"
                  value={form.driver_name} onChange={(e) => field("driver_name", e.target.value)} />
              </FormField>

              <FormField label="Remarks" span={2}>
                <input className={inputCls} placeholder="Optional notes"
                  value={form.remarks} onChange={(e) => field("remarks", e.target.value)} />
              </FormField>
            </div>
          </div>

          {/* Items with delivery qty */}
          {deliveryItems.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-1">Delivery Items</h3>
              <p className="text-xs text-slate-400 mb-4">Adjust delivery qty — cannot exceed pending qty from SO</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["#", "Product", "Quality", "Unit", "Ordered Qty", "Pending Qty", "Deliver Now"].map((h) => (
                        <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {deliveryItems.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-50">
                        <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{item.product_name}</td>
                        <td className="px-4 py-3 text-slate-600">{item.quality_name || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{item.unit || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{item.ordered_qty}</td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${item.pending_qty <= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                            {item.pending_qty}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            max={item.pending_qty}
                            className="w-28 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={item.delivery_qty}
                            onChange={(e) => updateDeliveryQty(idx, e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-8 py-2.5 rounded-xl shadow-sm transition-all">
              {saving ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                      : <><Truck size={15} />Save Challan</>}
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
                  {["Challan No", "Date", "SO Number", "Customer", "Vehicle No", "Driver", "Status"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {challans.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-14">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Truck size={32} className="opacity-30" />
                      <p className="text-sm">No challans yet. Create one from an open Sales Order.</p>
                    </div>
                  </td></tr>
                )}
                {challans.map((c, idx) => {
                  const m = STATUS_META[c.status] || STATUS_META["PENDING"];
                  return (
                    <tr key={c.id} className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors ${idx % 2 !== 0 ? "bg-slate-50/30" : ""}`}>
                      <td className="px-4 py-3.5 font-mono text-xs text-indigo-600 font-semibold">{c.challan_number}</td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs whitespace-nowrap">{c.challan_date}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-500">{c.so_number}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800 whitespace-nowrap">{c.customer_name}</td>
                      <td className="px-4 py-3.5 text-slate-600">{c.vehicle_no || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-600">{c.driver_name || "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${m.color}`}>{m.label}</span>
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
