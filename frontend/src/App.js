import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import Login from "./pages/Login";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import Production from "./pages/Production";
import Inventory from "./pages/Inventory";
import Finance from "./pages/Finance";
import Profile from "./pages/Profile";

// Admin / Masters
import UserManagement from "./pages/admin/UserManagement";
import ProductMaster from "./pages/admin/masters/ProductMaster";
import QualityMaster from "./pages/admin/masters/QualityMaster";
import MachineMaster from "./pages/admin/masters/MachineMaster";
import PartyMaster from "./pages/admin/masters/PartyMaster";

// Purchase
import PurchaseOrder from "./pages/purchase/PurchaseOrder";
import GRN from "./pages/purchase/GRN";
import PurchaseInvoice from "./pages/purchase/PurchaseInvoice";

// CRM
import Customers from "./pages/crm/Customers";
import Leads from "./pages/crm/Leads";
import Quotations from "./pages/crm/Quotations";

// Sales
import SalesOrder from "./pages/sales/SalesOrder";
import DeliveryChallan from "./pages/sales/DeliveryChallan";
import SalesInvoice from "./pages/sales/SalesInvoice";
import PaymentReceipt from "./pages/sales/PaymentReceipt";

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); }
    catch { return null; }
  });
  const token = localStorage.getItem("access_token");

  if (!user || !token) return <Login setUser={setUser} />;

  return (
    <Router>
      <MainLayout>
        <Routes>
          {/* Core */}
          <Route path="/"           element={<Dashboard />} />
          <Route path="/production" element={<Production />} />
          <Route path="/inventory"  element={<Inventory />} />
          <Route path="/finance"    element={<Finance />} />
          <Route path="/profile"    element={<Profile />} />

          {/* Admin */}
          <Route path="/admin/users"     element={<UserManagement />} />
          <Route path="/admin/products"  element={<ProductMaster />} />
          <Route path="/admin/qualities" element={<QualityMaster />} />
          <Route path="/admin/machines"  element={<MachineMaster />} />
          <Route path="/admin/parties"   element={<PartyMaster />} />

          {/* Purchase */}
          <Route path="/purchase/orders"  element={<PurchaseOrder />} />
          <Route path="/purchase/grn"     element={<GRN />} />
          <Route path="/purchase/invoice" element={<PurchaseInvoice />} />

          {/* CRM */}
          <Route path="/crm/customers"  element={<Customers />} />
          <Route path="/crm/leads"      element={<Leads />} />
          <Route path="/crm/quotations" element={<Quotations />} />

          {/* Sales */}
          <Route path="/sales/orders"   element={<SalesOrder />} />
          <Route path="/sales/challan"  element={<DeliveryChallan />} />
          <Route path="/sales/invoice"  element={<SalesInvoice />} />
          <Route path="/sales/receipts" element={<PaymentReceipt />} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}
