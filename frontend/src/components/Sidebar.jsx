import { NavLink, useLocation } from "react-router-dom";
import { hasAccess } from "../utils/rbac";
import { useState } from "react";
import {
  LayoutDashboard, Factory, Package, DollarSign,
  ShoppingCart, Users, Settings, ChevronDown,
  Menu, X, Boxes, UserCircle, FileText, Target, Quote,
  Cpu, Star, Truck, TrendingUp, ClipboardList,
  BadgeIndianRupee
} from "lucide-react";

export default function Sidebar() {
  const user = JSON.parse(localStorage.getItem("user"));
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState({
    purchase: false, crm: false, masters: false, sales: false
  });

  const toggle = (key) =>
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));

  const isGroupActive = (paths) =>
    paths.some((p) => location.pathname.startsWith(p));

  return (
    <>
      {/* Mobile bar */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Cpu size={14} className="text-white" />
          </div>
          <span className="font-bold text-slate-800 text-sm">Textile ERP</span>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="text-slate-500 hover:text-slate-800">
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed md:static top-0 left-0 z-40 h-screen w-60 bg-white border-r border-slate-100 flex flex-col shadow-sm transform transition-transform duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>

        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow">
              <Cpu size={16} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-slate-800 text-sm leading-none">Textile ERP</div>
              <div className="text-xs text-slate-400 mt-0.5">Management System</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">

          <SideLink to="/" icon={<LayoutDashboard size={16} />} label="Dashboard" />
          <SideLink to="/production" icon={<Factory size={16} />} label="Production" />

          {hasAccess(user, ["ADMIN", "MANAGER"]) && (
            <SideLink to="/inventory" icon={<Boxes size={16} />} label="Inventory" />
          )}

          {/* Purchase Dropdown */}
          {hasAccess(user, ["ADMIN", "PURCHASE", "ACCOUNTS"]) && (
            <Dropdown
              label="Purchase"
              icon={<ShoppingCart size={16} />}
              isOpen={openMenus.purchase}
              isActive={isGroupActive(["/purchase"])}
              onToggle={() => toggle("purchase")}
            >
              <SubLink to="/purchase/orders" icon={<FileText size={13} />}    label="Purchase Orders" />
              <SubLink to="/purchase/grn"    icon={<Truck size={13} />}       label="GRN" />
              <SubLink to="/purchase/invoice" icon={<DollarSign size={13} />} label="Invoice" />
            </Dropdown>
          )}

          {/* Sales Dropdown */}
          {hasAccess(user, ["ADMIN", "MANAGER", "SALES", "ACCOUNTS"]) && (
            <Dropdown
              label="Sales"
              icon={<TrendingUp size={16} />}
              isOpen={openMenus.sales}
              isActive={isGroupActive(["/sales"])}
              onToggle={() => toggle("sales")}
            >
              <SubLink to="/sales/orders"   icon={<ClipboardList size={13} />}     label="Sales Orders" />
              <SubLink to="/sales/challan"  icon={<Truck size={13} />}             label="Delivery Challan" />
              <SubLink to="/sales/invoice"  icon={<FileText size={13} />}          label="Sales Invoice" />
              <SubLink to="/sales/receipts" icon={<BadgeIndianRupee size={13} />}  label="Payment Receipts" />
            </Dropdown>
          )}

          <SideLink to="/finance" icon={<DollarSign size={16} />} label="Finance" />

          {/* Admin section */}
          {user?.role?.toUpperCase() === "ADMIN" && (
            <>
              <div className="pt-3 pb-1 px-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Administration</p>
              </div>

              <SideLink to="/admin/users" icon={<Users size={16} />} label="Users" />

              <Dropdown
                label="Masters"
                icon={<Settings size={16} />}
                isOpen={openMenus.masters}
                isActive={isGroupActive(["/admin/products","/admin/qualities","/admin/machines","/admin/parties"])}
                onToggle={() => toggle("masters")}
              >
                <SubLink to="/admin/products"  icon={<Package size={13} />}     label="Product Master" />
                <SubLink to="/admin/qualities" icon={<Star size={13} />}        label="Quality Master" />
                <SubLink to="/admin/machines"  icon={<Cpu size={13} />}         label="Machine Master" />
                <SubLink to="/admin/parties"   icon={<UserCircle size={13} />}  label="Party Master" />
              </Dropdown>

              <Dropdown
                label="CRM"
                icon={<Target size={16} />}
                isOpen={openMenus.crm}
                isActive={isGroupActive(["/crm"])}
                onToggle={() => toggle("crm")}
              >
                <SubLink to="/crm/customers"  icon={<Users size={13} />}    label="Customers" />
                <SubLink to="/crm/leads"      icon={<Target size={13} />}   label="Leads" />
                <SubLink to="/crm/quotations" icon={<Quote size={13} />}    label="Quotations" />
              </Dropdown>
            </>
          )}
        </nav>

        {/* Bottom user strip */}
        <div className="px-3 py-3 border-t border-slate-100">
          <NavLink to="/profile" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors group">
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-700 truncate">{user?.username}</div>
              <div className="text-[10px] text-slate-400 truncate">{user?.role}</div>
            </div>
          </NavLink>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/30 md:hidden z-30" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
}

function SideLink({ to, icon, label }) {
  return (
    <NavLink to={to} end={to === "/"}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
          isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}>
      {({ isActive }) => (
        <>
          <span className={isActive ? "text-indigo-600" : "text-slate-400"}>{icon}</span>
          {label}
        </>
      )}
    </NavLink>
  );
}

function Dropdown({ label, icon, isOpen, isActive, onToggle, children }) {
  return (
    <div>
      <button onClick={onToggle}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
          isActive && !isOpen ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}>
        <div className="flex items-center gap-3">
          <span className={isActive && !isOpen ? "text-indigo-600" : "text-slate-400"}>{icon}</span>
          {label}
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="ml-4 mt-0.5 pl-3 border-l border-slate-100 space-y-0.5 py-1">
          {children}
        </div>
      )}
    </div>
  );
}

function SubLink({ to, icon, label }) {
  return (
    <NavLink to={to}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
          isActive ? "text-indigo-700 bg-indigo-50" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
        }`}>
      {({ isActive }) => (
        <>
          <span className={isActive ? "text-indigo-500" : "text-slate-400"}>{icon}</span>
          {label}
        </>
      )}
    </NavLink>
  );
}
