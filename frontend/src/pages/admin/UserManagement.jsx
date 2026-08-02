import { useEffect, useState } from "react";
import { api } from "../../services/api";
import {
  Plus, X, Users, ShieldCheck, ToggleRight, ToggleLeft,
  KeyRound, Edit2, CheckCircle
} from "lucide-react";

const inputCls = `w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800
  placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
  focus:border-transparent transition-all bg-white`;

function FormField({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const ROLES = ["ADMIN", "MANAGER", "PURCHASE", "ACCOUNTS", "SALES", "PRODUCTION", "STORE"];

const ROLE_COLORS = {
  ADMIN:      "bg-indigo-100 text-indigo-700",
  MANAGER:    "bg-sky-100 text-sky-700",
  PURCHASE:   "bg-amber-100 text-amber-700",
  ACCOUNTS:   "bg-emerald-100 text-emerald-700",
  SALES:      "bg-purple-100 text-purple-700",
  PRODUCTION: "bg-orange-100 text-orange-700",
  STORE:      "bg-teal-100 text-teal-700",
};

const MODULE_ACCESS = {
  ADMIN:      ["Dashboard", "Production", "Inventory", "Purchase", "Sales", "Finance", "CRM", "Masters", "Users"],
  MANAGER:    ["Dashboard", "Production", "Inventory", "Purchase", "Sales", "Finance", "CRM"],
  PURCHASE:   ["Dashboard", "Purchase"],
  ACCOUNTS:   ["Dashboard", "Finance", "Purchase", "Sales"],
  SALES:      ["Dashboard", "Sales", "CRM"],
  PRODUCTION: ["Dashboard", "Production"],
  STORE:      ["Dashboard", "Inventory"],
};

export default function UserManagement() {
  const [users,    setUsers]    = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);   // user being edited
  const [saving,   setSaving]   = useState(false);
  const [resetId,  setResetId]  = useState(null);   // user whose password is being reset
  const [newPw,    setNewPw]    = useState("");

  const [form, setForm] = useState({
    username: "", password: "", confirm_password: "", role: "SALES",
  });
  const field = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = () =>
    api.get("/admin/users").then((res) => setUsers(res.data));

  useEffect(() => {
    load();
  }, []);

  const save = () => {
    if (!form.username || !form.password || !form.role) {
      alert("Username, Password and Role are required"); return;
    }
    if (form.password !== form.confirm_password) {
      alert("Passwords do not match"); return;
    }
    setSaving(true);
    api.post("/admin/users", { username: form.username, password: form.password, role: form.role })
      .then((res) => {
        if (res.data.status === "success") {
          setForm({ username: "", password: "", confirm_password: "", role: "SALES" });
          setShowForm(false);
          load();
        } else alert(res.data.message || "Failed to create user");
      })
      .catch(() => alert("Error creating user"))
      .finally(() => setSaving(false));
  };

  const updateRole = (id, role) => {
    api.put(`/admin/users/${id}`, { role })
      .then(() => { setEditUser(null); load(); })
      .catch(() => alert("Failed to update role"));
  };

  const toggleStatus = (id) =>
    api.patch(`/admin/users/${id}/status`).then(load);

  const resetPassword = (id) => {
    if (!newPw || newPw.length < 6) {
      alert("Password must be at least 6 characters"); return;
    }
    api.patch(`/admin/users/${id}/reset-password`, { new_password: newPw })
      .then((res) => {
        if (res.data.status === "success") {
          setResetId(null); setNewPw(""); load();
        } else alert("Failed to reset password");
      });
  };

  // Summary counts
  const activeCount   = users.filter((u) => u.is_active).length;
  const roleCount     = [...new Set(users.map((u) => u.role))].length;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">User Management</h2>
          <p className="text-xs text-slate-400 mt-0.5">{users.length} users · {roleCount} roles</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm">
          {showForm ? <><X size={15} />Cancel</> : <><Plus size={15} />Add User</>}
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-5 py-4 flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Users size={16} className="text-indigo-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800">{users.length}</div>
            <div className="text-xs text-slate-400">Total Users</div>
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-5 py-4 flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <CheckCircle size={16} className="text-emerald-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800">{activeCount}</div>
            <div className="text-xs text-slate-400">Active</div>
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-5 py-4 flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
            <ShieldCheck size={16} className="text-slate-500" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800">{roleCount}</div>
            <div className="text-xs text-slate-400">Unique Roles</div>
          </div>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Create New User</h3>
          <div className="grid grid-cols-2 gap-4">

            <FormField label="Username *">
              <input className={inputCls} placeholder="e.g. rajesh.kumar"
                value={form.username} onChange={(e) => field("username", e.target.value)} />
            </FormField>

            <FormField label="Role *">
              <select className={inputCls} value={form.role} onChange={(e) => field("role", e.target.value)}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </FormField>

            <FormField label="Password *">
              <input type="password" className={inputCls} placeholder="Min 6 characters"
                value={form.password} onChange={(e) => field("password", e.target.value)} />
            </FormField>

            <FormField label="Confirm Password *">
              <input type="password" className={inputCls} placeholder="Re-enter password"
                value={form.confirm_password} onChange={(e) => field("confirm_password", e.target.value)} />
            </FormField>
          </div>

          {/* Module access preview */}
          {form.role && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-semibold text-slate-500 mb-2">
                {form.role} will have access to:
              </p>
              <div className="flex flex-wrap gap-2">
                {(MODULE_ACCESS[form.role] || []).map((m) => (
                  <span key={m} className="text-xs font-medium bg-white border border-slate-200 text-slate-600 px-2.5 py-1 rounded-lg">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end mt-5">
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all shadow-sm">
              {saving
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating...</>
                : <><Plus size={15} />Create User</>}
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["#","Username","Role","Module Access","Status","Actions"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">No users found.</td></tr>
              )}
              {users.map((u, idx) => (
                <>
                  <tr key={u.id}
                    className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors ${idx % 2 !== 0 ? "bg-slate-50/30" : ""}`}>
                    <td className="px-5 py-4 text-xs text-slate-400">{idx + 1}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {u.username?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-800">{u.username}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {editUser === u.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            defaultValue={u.role}
                            onChange={(e) => updateRole(u.id, e.target.value)}
                          >
                            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <button onClick={() => setEditUser(null)} className="text-slate-400 hover:text-slate-600">
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[u.role] || "bg-slate-100 text-slate-600"}`}>
                          {u.role}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(MODULE_ACCESS[u.role] || []).slice(0, 4).map((m) => (
                          <span key={m} className="text-[10px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">{m}</span>
                        ))}
                        {(MODULE_ACCESS[u.role] || []).length > 4 && (
                          <span className="text-[10px] font-medium bg-slate-100 text-slate-400 px-2 py-0.5 rounded-md">
                            +{(MODULE_ACCESS[u.role] || []).length - 4} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => toggleStatus(u.id)}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${
                          u.is_active
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}>
                        {u.is_active ? <><ToggleRight size={13} />Active</> : <><ToggleLeft size={13} />Inactive</>}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditUser(editUser === u.id ? null : u.id); setResetId(null); }}
                          className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-all"
                          title="Change Role">
                          <Edit2 size={12} />Role
                        </button>
                        <button
                          onClick={() => { setResetId(resetId === u.id ? null : u.id); setEditUser(null); setNewPw(""); }}
                          className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg transition-all"
                          title="Reset Password">
                          <KeyRound size={12} />Reset
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Password reset inline row */}
                  {resetId === u.id && (
                    <tr key={`reset-${u.id}`} className="bg-amber-50 border-b border-amber-100">
                      <td colSpan={6} className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-amber-700">New password for {u.username}:</span>
                          <input
                            type="password"
                            className="border border-amber-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white w-48"
                            placeholder="Min 6 characters"
                            value={newPw}
                            onChange={(e) => setNewPw(e.target.value)}
                          />
                          <button
                            onClick={() => resetPassword(u.id)}
                            className="text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition-all">
                            Confirm Reset
                          </button>
                          <button onClick={() => { setResetId(null); setNewPw(""); }}
                            className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
