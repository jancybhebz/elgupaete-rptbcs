import React, { useState } from "react";
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  Building, 
  Search, 
  Lock, 
  Unlock, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  X, 
  AlertTriangle,
  UserCheck,
  Calendar
} from "lucide-react";
import { User } from "../types";

interface UserManagementPanelProps {
  currentUser: User | null;
  allUsers: User[];
  onRefresh: () => void;
}

export default function UserManagementPanel({
  currentUser,
  allUsers,
  onRefresh
}: UserManagementPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    email: "",
    role: "Assessor Staff",
    office: "Office of the Municipal Assessor",
    password: "",
    status: "active" as "active" | "inactive" | "locked"
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // List of Offices
  const offices = [
    "LGU Paete Admin Group",
    "Office of the Municipal Assessor",
    "Office of the Municipal Treasurer",
    "Audit and Accounting Office"
  ];

  // List of Roles
  const roles = [
    "System Administrator",
    "Municipal Assessor",
    "Assessor Staff",
    "Municipal Treasurer",
    "Treasury Cashier",
    "Treasury Supervisor",
    "Report Viewer",
    "Auditor / Read-only User"
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenAddForm = () => {
    setFormData({
      username: "",
      name: "",
      email: "",
      role: "Assessor Staff",
      office: "Office of the Municipal Assessor",
      password: "",
      status: "active"
    });
    setEditingUser(null);
    setFormError(null);
    setFormSuccess(null);
    setShowAddForm(true);
  };

  const handleOpenEditForm = (user: User) => {
    setEditingUser(user);
    // Password field left empty for edit unless changed
    setFormData({
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      office: user.office,
      password: "",
      status: user.status
    });
    setFormError(null);
    setFormSuccess(null);
    setShowAddForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    // Basic Validations
    if (!formData.username.trim() || !formData.name.trim() || !formData.email.trim()) {
      setFormError("Please fill in all primary fields.");
      return;
    }

    if (!editingUser && !formData.password.trim()) {
      setFormError("A temporary login password is required for new operators.");
      return;
    }

    try {
      const endpoint = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";

      const payload = {
        username: formData.username.trim(),
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        office: formData.office,
        status: formData.status,
        ...(formData.password.trim() ? { password: formData.password.trim() } : {})
      };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errVal = await res.json();
        throw new Error(errVal.message || "Failed to finalize operator record.");
      }

      setFormSuccess(editingUser ? "Operator profile updated successfully." : "New operator registered to LGU registry.");
      onRefresh();
      
      setTimeout(() => {
        setShowAddForm(false);
        setEditingUser(null);
      }, 1500);

    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.username === "admin") {
      alert("CRITICAL ACTION DENIED: The master system administrator account cannot be expunged.");
      return;
    }

    if (!confirm(`Are you absolutely sure you want to permanently delete user record "${user.name}" (${user.username})? All future audits will trace this deletion.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const errVal = await res.json();
        throw new Error(errVal.message || "Delete request unsuccessful.");
      }

      alert("User account has been expunged from the physical schema database successfully.");
      onRefresh();
    } catch (err) {
      alert(`Delete failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleToggleStatus = async (user: User, toggleOption: "active" | "locked" | "inactive") => {
    if (user.id === currentUser?.id) {
      alert("OPERATION ABORTED: You cannot modify your own administrative status while active.");
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: toggleOption })
      });

      if (!res.ok) {
        throw new Error("Unable to change status.");
      }

      onRefresh();
    } catch (err) {
      alert(`Action failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Filtered List
  const filteredUsers = allUsers.filter(u => {
    const term = searchTerm.toLowerCase();
    return (
      u.name.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term) ||
      u.office.toLowerCase().includes(term)
    );
  });

  const totalUsers = allUsers.length;
  const activeCount = allUsers.filter(u => u.status === "active").length;
  const lockedCount = allUsers.filter(u => u.status === "locked").length;

  return (
    <div className="space-y-6" id="user_management_hub_sec">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 font-sans flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-500" />
            LGU System login & User Management
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Configure system users, control RBAC credentials, lock compromised accounts, and audit operators.</p>
        </div>
        <button
          onClick={handleOpenAddForm}
          className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          id="btn_register_operator_open"
        >
          <UserPlus className="h-4 w-4" />
          Register New Account
        </button>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="user_stats_summary_grid">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="block text-xs text-slate-400 font-medium">Replicated Logins</span>
            <span className="text-2xl font-bold font-mono text-slate-800">{totalUsers}</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-500 border border-amber-100 rounded-xl">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="block text-xs text-slate-400 font-medium">Active Sessions</span>
            <span className="text-2xl font-bold font-mono text-emerald-600">{activeCount}</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-500 border border-emerald-100 rounded-xl">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="block text-xs text-slate-400 font-medium">Locked Operators</span>
            <span className="text-2xl font-bold font-mono text-red-500">{lockedCount}</span>
          </div>
          <div className="p-3 bg-red-50 text-red-500 border border-red-100 rounded-xl">
            <Lock className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Inline Registration or Modification Form Drawer */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 animate-fadeIn" id="operator_submit_form_box">
          <div className="flex justify-between items-center border-b pb-4 mb-5 border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                {editingUser ? `Update Operator Profile: ${editingUser.name}` : "Create System Operator Access"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure unique username identifier, secure temporary credentials, and department assignment.
              </p>
            </div>
            <button
              onClick={() => { setShowAddForm(false); setEditingUser(null); }}
              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" id="form_operator_element">
            {formError && (
              <div className="p-3 bg-red-50 text-red-600 text-xs font-semibold rounded-lg border border-red-100 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-lg border border-emerald-100 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                {formSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Username / ID Key</label>
                <input
                  type="text"
                  name="username"
                  required
                  disabled={!!editingUser}
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="e.g. assessor_staff_maria"
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Full Legal Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="First name, Middle Initial, Last name"
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Government Email Address</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="e.g. m.alarcon@paete.gov.ph"
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Office / Division Assignment</label>
                <select
                  name="office"
                  value={formData.office}
                  onChange={handleInputChange}
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none"
                >
                  {offices.map(off => (
                    <option key={off} value={off}>{off}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 border-r border-slate-55">
                <label className="text-[11px] font-bold text-slate-600 uppercase">System Security Role (RBAC)</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none text-slate-800 font-semibold"
                >
                  {roles.map(r_opt => (
                    <option key={r_opt} value={r_opt}>{r_opt}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Account Status State</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none font-semibold text-slate-700"
                >
                  <option value="active">Active System Operator</option>
                  <option value="inactive">Suspended / Inactive</option>
                  <option value="locked">Compromised / Locked</option>
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-600 uppercase">
                  {editingUser ? "Reset Password Hash (Leave blank to keep current)" : "Temporary Credentials Password"}
                </label>
                <input
                  type="password"
                  name="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={editingUser ? "•••••••• (Only type to rewrite password)" : "Provide custom password"}
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end border-t pt-4">
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setEditingUser(null); }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-semibold cursor-pointer transition shadow-sm"
                id="btn_save_operator_profile"
              >
                {editingUser ? "Save Operator Changes" : "Register and Authorize Operator"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Operator Directories Grid */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="relative flex-grow max-w-md w-full">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by full legal name, ID key, role cluster, registry divisions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-100 bg-slate-50/50 rounded-xl text-xs focus:bg-white focus:border-amber-500 focus:outline-none transition-all"
              id="user_register_search_bar"
            />
          </div>
          <span className="text-[10px] bg-slate-50 border px-3 py-1 text-slate-500 rounded-full font-mono font-medium">
            Registry Count: {filteredUsers.length} / {totalUsers}
          </span>
        </div>

        {/* Dynamic Table Assembly */}
        <div className="border rounded-xl overflow-hidden font-sans text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b font-bold text-slate-500 uppercase tracking-wider text-[9px]">
                <th className="p-4">operator details</th>
                <th className="p-4">authorized system role</th>
                <th className="p-4">department & office</th>
                <th className="p-4">status</th>
                <th className="p-4">registered timestamp</th>
                <th className="p-4 text-right">system actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => {
                const isMe = user.id === currentUser?.id;
                // Generate simple logo avatar letters
                const initials = user.name.split(" ").map(n => n[0]).join("").substring(0, 2);

                return (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-slate-50/40 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-slate-900 border text-amber-500 font-bold flex items-center justify-center rounded-xl shrink-0 uppercase shadow-inner text-[11px]">
                          {initials}
                        </div>
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            {user.name}
                            {isMe && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-[#d97706] text-[8px] rounded-full uppercase tracking-wider font-extrabold shadow-sm">
                                active operator
                              </span>
                            )}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-mono">
                            @{user.username} • <span className="underline select-all">{user.email}</span>
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <Shield className="h-4 w-4 text-amber-600" />
                        <span className="font-bold text-slate-700">{user.role}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-slate-500 font-medium">{user.office}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      {user.status === "active" && (
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 border border-green-100 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 max-w-fit">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> active ok
                        </span>
                      )}
                      {user.status === "inactive" && (
                        <span className="px-2.5 py-0.5 bg-slate-50 text-slate-500 border border-slate-200 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 max-w-fit">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span> inactive
                        </span>
                      )}
                      {user.status === "locked" && (
                        <span className="px-2.5 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 max-w-fit">
                          <Lock className="h-3 w-3 shrink-0" /> account locked
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-slate-400 font-mono text-[10px]">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>{user.createdAt ? user.createdAt.split("T")[0] : "2026-01-10"}</span>
                      </div>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditForm(user)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition cursor-pointer"
                          title="Modify Account Profile"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>

                        {!isMe && (
                          <>
                            {user.status === "active" ? (
                              <button
                                onClick={() => handleToggleStatus(user, "locked")}
                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                                title="Lock Operator Session Access"
                              >
                                <Lock className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleStatus(user, "active")}
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition cursor-pointer"
                                title="Unlock Operator Account"
                              >
                                <Unlock className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer"
                              title="Delete Operator permanently"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
