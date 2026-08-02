import { useEffect, useState } from "react";
import { api } from "../../services/api";

export default function GRN() {
  // Data states
  const [openPOs, setOpenPOs] = useState([]);
  const [grnList, setGrnList] = useState([]);

  // GRN header form
  const [form, setForm] = useState({
    grn_date: "",
    po_id: "",
    party_id: "",
    party_name: "",
    vehicle_no: "",
    bill_no: "",
    bill_date: "",
    remarks: "",
  });

  // GRN items (received qty per PO item)
  const [receivedItems, setReceivedItems] = useState([]);

  const [activeTab, setActiveTab] = useState("list");

  const loadOpenPOs = () => {
    api.get("/purchase/orders?status=OPEN").then((res) => setOpenPOs(res.data));
  };

  const loadGRNList = () => {
    api.get("/purchase/grn").then((res) => setGrnList(res.data));
  };

  useEffect(() => {
    loadOpenPOs();
    loadGRNList();
  }, []);

  // When PO is selected, load its pending items
  const onPOSelect = (po_id) => {
    const selectedPoId = Number(po_id);
    if (!po_id) {
      setReceivedItems([]);
      setForm((f) => ({ ...f, po_id: "", party_id: "", party_name: "" }));
      return;
    }
    const po = openPOs.find((p) => p.id === selectedPoId);
    setForm((f) => ({
      ...f,
      po_id: selectedPoId,
      party_id: po?.party_id || "",
      party_name: po?.party_name || "",
    }));

    api.get(`/purchase/orders/${selectedPoId}/items`).then((res) => {
      const items = res.data;
      setReceivedItems(
        items.map((i) => ({
          po_item_id: i.po_item_id,
          product_id: i.product_id,
          quality_id: i.quality_id,
          product_name: i.product_name,
          quality_name: i.quality_name,
          unit: i.unit,
          rate: i.rate,
          pending_qty: i.pending_qty,
          received_qty: "",
          accepted_qty: "",
          rejected_qty: "0",
          inspection_note: "",
        }))
      );
    });
  };

  const updateItem = (index, field, value) => {
    const updated = [...receivedItems];
    updated[index][field] = value;

    // Auto-calculate accepted = received - rejected
    if (field === "received_qty" || field === "rejected_qty") {
      const recv = parseFloat(updated[index].received_qty) || 0;
      const rej = parseFloat(updated[index].rejected_qty) || 0;
      updated[index].accepted_qty = Math.max(0, recv - rej).toString();
    }

    setReceivedItems(updated);
  };

  const saveGRN = () => {
    if (!form.grn_date || !form.po_id) {
      alert("GRN Date and Purchase Order are required");
      return;
    }
    if (receivedItems.some((i) => !i.received_qty)) {
      alert("Please enter received quantity for all items");
      return;
    }

    const payload = { ...form, items: receivedItems };

    api
      .post("/purchase/grn", payload)
      .then((res) => {
        if (res.data.status === "success") {
          alert(res.data.message);
          setForm({
            grn_date: "",
            po_id: "",
            party_id: "",
            party_name: "",
            vehicle_no: "",
            bill_no: "",
            bill_date: "",
            remarks: "",
          });
          setReceivedItems([]);
          setActiveTab("list");
          loadGRNList();
          loadOpenPOs();
        } else {
          alert("Failed to create GRN");
        }
      })
      .catch(() => alert("Error while creating GRN"));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Goods Receipt Note (GRN)</h2>
        <button
          onClick={() => setActiveTab(activeTab === "list" ? "create" : "list")}
          className="bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 hover:scale-105 transition-all duration-200 shadow-md"
        >
          {activeTab === "list" ? "+ New GRN" : "← Back to List"}
        </button>
      </div>

      {/* ── CREATE GRN ── */}
      {activeTab === "create" && (
        <div>
          {/* GRN Header */}
          <div className="bg-white p-4 rounded shadow mb-4">
            <h3 className="font-semibold text-gray-700 mb-3">GRN Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">GRN Date *</label>
                <input
                  type="date"
                  className="border p-2 w-full"
                  value={form.grn_date}
                  onChange={(e) => setForm({ ...form, grn_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Purchase Order *</label>
                <select
                  className="border p-2 w-full"
                  value={form.po_id}
                  onChange={(e) => onPOSelect(e.target.value)}
                >
                  <option value="">Select Open PO</option>
                  {openPOs.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.po_number} — {po.party_name}
                    </option>
                  ))}
                </select>
              </div>

              {form.party_name && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Supplier</label>
                  <input
                    className="border p-2 w-full bg-gray-50"
                    value={form.party_name}
                    readOnly
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Vehicle No</label>
                <input
                  placeholder="Vehicle No"
                  className="border p-2 w-full"
                  value={form.vehicle_no}
                  onChange={(e) => setForm({ ...form, vehicle_no: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Supplier Bill No</label>
                <input
                  placeholder="Supplier Bill No"
                  className="border p-2 w-full"
                  value={form.bill_no}
                  onChange={(e) => setForm({ ...form, bill_no: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Supplier Bill Date</label>
                <input
                  type="date"
                  className="border p-2 w-full"
                  value={form.bill_date}
                  onChange={(e) => setForm({ ...form, bill_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Remarks</label>
                <input
                  placeholder="Remarks"
                  className="border p-2 w-full"
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* GRN Items — from PO */}
          {receivedItems.length > 0 && (
            <div className="bg-white p-4 rounded shadow mb-4">
              <h3 className="font-semibold text-gray-700 mb-3">
                Items from PO — Enter Received Quantities
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border p-2">#</th>
                      <th className="border p-2">Product</th>
                      <th className="border p-2">Quality</th>
                      <th className="border p-2">Unit</th>
                      <th className="border p-2">Pending Qty</th>
                      <th className="border p-2">Received Qty *</th>
                      <th className="border p-2">Rejected Qty</th>
                      <th className="border p-2">Accepted Qty</th>
                      <th className="border p-2">Inspection Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receivedItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border p-2 text-center">{idx + 1}</td>
                        <td className="border p-2">{item.product_name}</td>
                        <td className="border p-2">{item.quality_name}</td>
                        <td className="border p-2">{item.unit}</td>
                        <td className="border p-2 text-center font-medium">
                          {item.pending_qty}
                        </td>
                        <td className="border p-2">
                          <input
                            type="number"
                            className="border p-1 w-24"
                            value={item.received_qty}
                            max={item.pending_qty}
                            onChange={(e) =>
                              updateItem(idx, "received_qty", e.target.value)
                            }
                          />
                        </td>
                        <td className="border p-2">
                          <input
                            type="number"
                            className="border p-1 w-20"
                            value={item.rejected_qty}
                            onChange={(e) =>
                              updateItem(idx, "rejected_qty", e.target.value)
                            }
                          />
                        </td>
                        <td className="border p-2 text-center">
                          <span
                            className={`font-semibold ${
                              item.accepted_qty > 0
                                ? "text-green-600"
                                : "text-gray-400"
                            }`}
                          >
                            {item.accepted_qty || "—"}
                          </span>
                        </td>
                        <td className="border p-2">
                          <input
                            placeholder="Note"
                            className="border p-1 w-32"
                            value={item.inspection_note}
                            onChange={(e) =>
                              updateItem(idx, "inspection_note", e.target.value)
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="bg-white p-4 rounded shadow">
            <div className="flex justify-center">
              <button
                onClick={saveGRN}
                className="bg-blue-600 text-white px-8 py-2 rounded-xl hover:bg-blue-700 hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Save GRN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GRN LIST ── */}
      {activeTab === "list" && (
        <table className="w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">GRN Number</th>
              <th className="border p-2">Date</th>
              <th className="border p-2">PO Number</th>
              <th className="border p-2">Supplier</th>
              <th className="border p-2">Bill No</th>
              <th className="border p-2">Vehicle</th>
              <th className="border p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {grnList.length === 0 && (
              <tr>
                <td className="border p-4 text-center text-gray-400" colSpan={7}>
                  No GRNs found. Click "+ New GRN" to create one.
                </td>
              </tr>
            )}
            {grnList.map((g) => (
              <tr key={g.id}>
                <td className="border p-2 font-medium text-blue-700">{g.grn_number}</td>
                <td className="border p-2">{g.grn_date}</td>
                <td className="border p-2">{g.po_number}</td>
                <td className="border p-2">{g.party_name}</td>
                <td className="border p-2">{g.bill_no || "—"}</td>
                <td className="border p-2">{g.vehicle_no || "—"}</td>
                <td className="border p-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      g.status === "ACCEPTED"
                        ? "bg-green-100 text-green-700"
                        : g.status === "PENDING"
                        ? "bg-yellow-100 text-yellow-700"
                        : g.status === "REJECTED"
                        ? "bg-red-100 text-red-600"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {g.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
