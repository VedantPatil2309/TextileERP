import { useState } from "react";
import { useLocation, NavLink } from "react-router-dom";
import { Bell, ChevronDown, LogOut, User } from "lucide-react";

const PAGE_TITLES = {
  "/":                   "Dashboard",
  "/production":         "Production",
  "/inventory":          "Inventory",
  "/finance":            "Finance",
  "/purchase/orders":    "Purchase Orders",
  "/purchase/grn":       "Goods Receipt Note",
  "/purchase/invoice":   "Purchase Invoice",
  "/admin/users":        "User Management",
  "/admin/products":     "Product Master",
  "/admin/qualities":    "Quality Master",
  "/admin/machines":     "Machine Master",
  "/admin/parties":      "Party Master",
  "/crm/customers":      "Customers",
  "/crm/leads":          "Leads",
  "/crm/quotations":     "Quotations",
  "/profile":            "My Profile",
};

export default function Navbar() {
  const user = JSON.parse(localStorage.getItem("user"));
  const location = useLocation();
  const [dropOpen, setDropOpen] = useState(false);

  const title = PAGE_TITLES[location.pathname] || "Textile ERP";
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric"
  });

  return (
    <div className="bg-white border-b border-slate-100 px-6 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-sm">

      {/* Left — Page Title */}
      <div>
        <h1 className="text-base font-semibold text-slate-800">{title}</h1>
        <p className="text-xs text-slate-400">{today}</p>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">

        {/* Notification bell */}
        <button className="relative w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-200" />

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropOpen(!dropOpen)}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-slate-700 leading-none">{user?.username}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{user?.role}</div>
            </div>
            <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${dropOpen ? "rotate-180" : ""}`} />
          </button>

          {dropOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-slate-100 rounded-xl shadow-lg z-20 overflow-hidden py-1">
                <NavLink
                  to="/profile"
                  onClick={() => setDropOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <User size={14} className="text-slate-400" />
                  My Profile
                </NavLink>
                <div className="mx-3 my-1 border-t border-slate-100" />
                <button
                  onClick={() => { localStorage.clear(); window.location.reload(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={14} />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
