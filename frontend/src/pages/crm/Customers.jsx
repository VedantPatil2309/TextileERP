import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Search, Users, Building2, Phone, MapPin, CreditCard, BadgeCheck, BadgeX } from "lucide-react";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");

  const load = () => {
    setLoading(true);
    api.get("/crm/customers")
      .then((res) => setCustomers(res.data))
      .catch(() => console.error("Failed to load customers"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = customers.filter((c) =>
    c.party_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.city?.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_no?.includes(search)
  );

  const active   = customers.filter((c) => c.is_active).length;
  const inactive = customers.length - active;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Customers</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Sourced from Party Master · {customers.length} total
          </p>
        </div>
        <a
          href="/admin/parties"
          className="text-xs text-indigo-600 font-semibold border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-all"
        >
          + Add via Party Master
        </a>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        <KpiTile icon={<Users size={16} className="text-indigo-600" />}     label="Total Customers" value={customers.length} bg="bg-indigo-50" />
        <KpiTile icon={<BadgeCheck size={16} className="text-emerald-600" />} label="Active"         value={active}           bg="bg-emerald-50" />
        <KpiTile icon={<BadgeX size={16} className="text-slate-400" />}      label="Inactive"        value={inactive}         bg="bg-slate-100" />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm
                     placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          placeholder="Search by name, city, contact..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Customer Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400">Loading customers...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
          <Users size={36} className="opacity-30" />
          <p className="text-sm">{search ? "No customers match your search" : "No customers yet. Add them from Party Master."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id}
              className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow">

              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                    {c.party_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 text-sm leading-snug">{c.party_name}</div>
                    <div className="text-xs text-slate-400 font-mono">{c.party_code}</div>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  c.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}>
                  {c.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Card Details */}
              <div className="space-y-2">
                {c.contact_no && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Phone size={12} className="text-slate-400" />
                    {c.contact_no}
                  </div>
                )}
                {c.city && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <MapPin size={12} className="text-slate-400" />
                    {c.city}
                  </div>
                )}
                {c.gst_no && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                    <Building2 size={12} className="text-slate-400" />
                    {c.gst_no}
                  </div>
                )}
                {c.credit_days && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <CreditCard size={12} className="text-slate-400" />
                    {c.credit_days} days credit
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-slate-50 flex gap-2">
                <a
                  href={`/crm/quotations?customer=${c.id}`}
                  className="flex-1 text-center text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all"
                >
                  New Quotation
                </a>
                <a
                  href={`/crm/leads?customer=${c.party_name}`}
                  className="flex-1 text-center text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-all"
                >
                  View Leads
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KpiTile({ icon, label, value, bg }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-5 py-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>{icon}</div>
      <div>
        <div className="text-xl font-bold text-slate-800">{value}</div>
        <div className="text-xs text-slate-400 mt-0.5">{label}</div>
      </div>
    </div>
  );
}
