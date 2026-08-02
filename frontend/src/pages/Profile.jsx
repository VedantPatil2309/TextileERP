import { UserCircle, Shield, Key, Clock } from "lucide-react";

export default function Profile() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return null;

  const roleColors = {
    ADMIN:    { bg: "bg-indigo-100", text: "text-indigo-700" },
    MANAGER:  { bg: "bg-sky-100",    text: "text-sky-700" },
    PURCHASE: { bg: "bg-amber-100",  text: "text-amber-700" },
    ACCOUNTS: { bg: "bg-emerald-100", text: "text-emerald-700" },
  };
  const rc = roleColors[user.role?.toUpperCase()] || { bg: "bg-slate-100", text: "text-slate-700" };

  return (
    <div className="max-w-2xl space-y-5">

      {/* Profile header card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-indigo-600 to-indigo-400" />

        {/* Avatar + info */}
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-10 mb-4">
            <div className="w-20 h-20 rounded-2xl bg-white shadow-md border-4 border-white flex items-center justify-center">
              <div className="w-16 h-16 rounded-xl bg-indigo-600 text-white text-3xl font-bold flex items-center justify-center">
                {user.username?.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="pb-1">
              <h2 className="text-lg font-bold text-slate-800">{user.username}</h2>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${rc.bg} ${rc.text}`}>
                {user.role}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Textile ERP system user. Profile editing and password change will be available in a future update.
          </p>
        </div>
      </div>

      {/* Details card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Account Details</h3>

        <div className="space-y-4">
          <InfoRow
            icon={<UserCircle size={15} className="text-slate-400" />}
            label="Username"
            value={user.username}
          />
          <InfoRow
            icon={<Shield size={15} className="text-slate-400" />}
            label="Role"
            value={user.role}
            badge
            badgeClass={`${rc.bg} ${rc.text}`}
          />
          <InfoRow
            icon={<Key size={15} className="text-slate-400" />}
            label="Access Level"
            value="Full Access"
          />
          <InfoRow
            icon={<Clock size={15} className="text-slate-400" />}
            label="Session"
            value="Active"
            valueClass="text-emerald-600 font-semibold"
          />
        </div>
      </div>

      {/* Permissions card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Module Access</h3>
        <div className="grid grid-cols-2 gap-2">
          {getModules(user.role).map((mod) => (
            <div
              key={mod.name}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100"
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${mod.access ? "bg-emerald-500" : "bg-slate-300"}`} />
              <span className={`text-xs font-medium ${mod.access ? "text-slate-700" : "text-slate-400"}`}>
                {mod.name}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

function InfoRow({ icon, label, value, badge, badgeClass, valueClass }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      {badge ? (
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}>{value}</span>
      ) : (
        <span className={`text-xs font-semibold text-slate-800 ${valueClass || ""}`}>{value}</span>
      )}
    </div>
  );
}

function getModules(role) {
  const all = [
    { name: "Dashboard",  roles: ["ADMIN", "MANAGER", "PURCHASE", "ACCOUNTS"] },
    { name: "Production", roles: ["ADMIN", "MANAGER"] },
    { name: "Inventory",  roles: ["ADMIN", "MANAGER"] },
    { name: "Finance",    roles: ["ADMIN", "ACCOUNTS"] },
    { name: "Purchase",   roles: ["ADMIN", "PURCHASE", "ACCOUNTS"] },
    { name: "CRM",        roles: ["ADMIN"] },
    { name: "Masters",    roles: ["ADMIN"] },
    { name: "Users",      roles: ["ADMIN"] },
  ];
  return all.map((m) => ({
    name: m.name,
    access: m.roles.includes(role?.toUpperCase()),
  }));
}
