import { useEffect, useState } from "react";
import { api } from "../../services/api";

export default function PurchaseOrder() {
  // Master data for dropdowns
  const [parties, setParties] = useState([]);
  const [products, setProducts] = useState([]);
  const [qualities, setQualities] = useState([]);

  // PO list
  const [orders, setOrders] = useState([]);

  // PO header form
  const [form, setForm] = useState({
    po_date: "",
    party_id: "",
    po_type: "",
    remarks: "",
  });

  // PO items
  const [items, setItems] = useState([]);
  const [itemForm, setItemForm] = useState({
    product_id: "",
    quality_id: "",
    quantity: "",
    unit: "",
    rate: "",
  });

  // UI state
  const [activeTab, setActiveTab] = useState("list"); // "list" | "create"

  const loadMasters = () => {
    api.get("/purchase/masters").then((res) => {
      setParties(res.data.parties);
      setProducts(res.data.products);
      setQualities(res.data.qualities);
    });
  };

  const loadOrders = () => {
    api.get("/purchase/orders").then((res) => setOrders(res.data));
  };

  useEffect(() => {
    loadMasters();
    loadOrders();
  }, []);

  // Add item to local list
  const addItem = () => {
    if (!itemForm.product_id || !itemForm.quantity || !itemForm.rate) {
      alert("Product, Quantity and Rate are required for each item");
      return;
    }
    const product = products.find((p) => p.id === itemForm.product_id);
    const quality = qualities.find((q) => q.id === itemForm.quality_id);
    const newItem = {
      ...itemForm,
      product_name: product?.product_name || "",
      quality_name: quality?.quality_name || "",
      amount: (parseFloat(itemForm.quantity) * parseFloat(itemForm.rate)).toFixed(2),
    };
    setItems([...items, newItem]);
    setItemForm({ product_id: "", quality_id: "", quantity: "", unit: "", rate: "" });
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Save full PO
  const savePO = () => {
    if (!form.po_date || !form.party_id || !form.po_type) {
      alert("Date, Party and PO Type are required");
      return;
    }
    if (items.length === 0) {
      alert("Please add at least one item");
      return;
    }

    const payload = { ...form, items };

    api
      .post("/purchase/orders", payload)
      .then((res) => {
        if (res.data.status === "success") {
          alert(res.data.message);
          setForm({ po_date: "", party_id: "", po_type: "", remarks: "" });
          setItems([]);
          setActiveTab("list");
          loadOrders();
        } else {
          alert("Failed to create Purchase Order");
        }
      })
      .catch(() => alert("Error while creating Purchase Order"));
  };

  const cancelPO = (id) => {
    if (!window.confirm("Are you sure you want to cancel this PO?")) return;
    api.patch(`/purchase/orders/${id}/cancel`).then(() => {
      alert("PO Cancelled");
      loadOrders();
    });
  };

  const totalAmount = items.reduce((sum, i) => sum + parseFloat(i.amount), 0).toFixed(2);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Purchase Order</h2>
        <button
          onClick={() => setActiveTab(activeTab === "list" ? "create" : "list")}
          className="bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 hover:scale-105 transition-all duration-200 shadow-md"
        >
          {activeTab === "list" ? "+ New PO" : "← Back to List"}
        </button>
      </div>

      {/* ── CREATE FORM ── */}
      {activeTab === "create" && (
        <div>
          {/* PO Header */}
          <div className="bg-white p-4 rounded shadow mb-4">
            <h3 className="font-semibold text-gray-700 mb-3">PO Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">PO Date *</label>
                <input
                  type="date"
                  className="border p-2 w-full"
                  value={form.po_date}
                  onChange={(e) => setForm({ ...form, po_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">PO Type *</label>
                <select
                  className="border p-2 w-full"
                  value={form.po_type}
                  onChange={(e) => setForm({ ...form, po_type: e.target.value })}
                >
                  <option value="">Select Type</option>
                  <option value="RAW_MATERIAL">Raw Material</option>
                  <option value="PACKING">Packing Material</option>
                  <option value="JOB_WORK">Job Work</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Supplier (Party) *</label>
                <select
                  className="border p-2 w-full"
                  value={form.party_id}
                  onChange={(e) => setForm({ ...form, party_id: e.target.value })}
                >
                  <option value="">Select Party</option>
                  {parties
                    .filter((p) => p.party_type === "Supplier" || p.party_type === "supplier" || p.party_type === "SUPPLIER")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.party_code} - {p.party_name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Remarks</label>
                <input
                  placeholder="Remarks (optional)"
                  className="border p-2 w-full"
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* PO Items */}
          <div className="bg-white p-4 rounded shadow mb-4">
            <h3 className="font-semibold text-gray-700 mb-3">Add Items</h3>
            <div className="grid grid-cols-5 gap-2 mb-2">
              <select
                className="border p-2"
                value={itemForm.product_id}
                onChange={(e) => setItemForm({ ...itemForm, product_id: e.target.value })}
              >
                <option value="">Product *</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.product_name}
                  </option>
                ))}
              </select>

              <select
                className="border p-2"
                value={itemForm.quality_id}
                onChange={(e) => setItemForm({ ...itemForm, quality_id: e.target.value })}
              >
                <option value="">Quality</option>
                {qualities.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.quality_name}
                  </option>
                ))}
              </select>

              <input
                placeholder="Qty *"
                type="number"
                className="border p-2"
                value={itemForm.quantity}
                onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
              />

              <select
                className="border p-2"
                value={itemForm.unit}
                onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
              >
                <option value="">Unit</option>
                <option value="KG">KG</option>
                <option value="MTR">MTR</option>
                <option value="PCS">PCS</option>
                <option value="RLL">RLL</option>
              </select>

              <input
                placeholder="Rate *"
                type="number"
                className="border p-2"
                value={itemForm.rate}
                onChange={(e) => setItemForm({ ...itemForm, rate: e.target.value })}
              />
            </div>

            <button
              onClick={addItem}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-all mb-4"
            >
              + Add Item
            </button>

            {/* Items Table */}
            {items.length > 0 && (
              <table className="w-full border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2">#</th>
                    <th className="border p-2">Product</th>
                    <th className="border p-2">Quality</th>
                    <th className="border p-2">Qty</th>
                    <th className="border p-2">Unit</th>
                    <th className="border p-2">Rate</th>
                    <th className="border p-2">Amount</th>
                    <th className="border p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="border p-2 text-center">{idx + 1}</td>
                      <td className="border p-2">{item.product_name}</td>
                      <td className="border p-2">{item.quality_name}</td>
                      <td className="border p-2">{item.quantity}</td>
                      <td className="border p-2">{item.unit}</td>
                      <td className="border p-2">{item.rate}</td>
                      <td className="border p-2">₹ {item.amount}</td>
                      <td className="border p-2 text-center">
                        <button
                          onClick={() => removeItem(idx)}
                          className="text-red-500 hover:underline"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td className="border p-2 text-right" colSpan={6}>
                      Total
                    </td>
                    <td className="border p-2">₹ {totalAmount}</td>
                    <td className="border p-2"></td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* Save Button */}
          <div className="bg-white p-4 rounded shadow">
            <div className="flex justify-center">
              <button
                onClick={savePO}
                className="bg-blue-600 text-white px-8 py-2 rounded-xl hover:bg-blue-700 hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Save Purchase Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PO LIST ── */}
      {activeTab === "list" && (
        <table className="w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">PO Number</th>
              <th className="border p-2">Date</th>
              <th className="border p-2">Party</th>
              <th className="border p-2">Type</th>
              <th className="border p-2">Amount</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td className="border p-4 text-center text-gray-400" colSpan={7}>
                  No Purchase Orders found. Click "+ New PO" to create one.
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="border p-2 font-medium text-blue-700">{o.po_number}</td>
                <td className="border p-2">{o.po_date}</td>
                <td className="border p-2">{o.party_name}</td>
                <td className="border p-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      o.po_type === "RAW_MATERIAL"
                        ? "bg-blue-100 text-blue-700"
                        : o.po_type === "PACKING"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {o.po_type === "RAW_MATERIAL"
                      ? "Raw Material"
                      : o.po_type === "PACKING"
                      ? "Packing"
                      : "Job Work"}
                  </span>
                </td>
                <td className="border p-2">₹ {o.total_amount}</td>
                <td className="border p-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      o.status === "OPEN"
                        ? "bg-green-100 text-green-700"
                        : o.status === "PARTIAL"
                        ? "bg-orange-100 text-orange-700"
                        : o.status === "CLOSED"
                        ? "bg-gray-100 text-gray-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {o.status}
                  </span>
                </td>
                <td className="border p-2">
                  {o.status === "OPEN" && (
                    <button
                      onClick={() => cancelPO(o.id)}
                      className="text-red-500 underline text-sm"
                    >
                      Cancel
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
