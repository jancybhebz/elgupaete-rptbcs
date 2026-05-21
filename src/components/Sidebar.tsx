import React from "react";
import {
  Users,
  Home,
  Building2,
  FileSpreadsheet,
  FileCheck,
  Receipt,
  AlertOctagon,
  Wallet,
  Coins,
  CreditCard,
  FileBarChart,
  MapPin,
  Paperclip,
  Settings,
  History,
  ShieldAlert,
  UserCheck,
  Power,
  ScanLine,
  GitFork
} from "lucide-react";
import { User } from "../types";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: User | null;
  allUsers: User[];
  onSwitchUser: (username: string) => void;
  onGoToPublicVerify: () => void;
  onLogout: () => void;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  currentUser,
  allUsers,
  onSwitchUser,
  onGoToPublicVerify,
  onLogout
}: SidebarProps) {
  
  // High fidelity list of navigation menus with role restriction mappings
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home, roles: ["all"] },
    { id: "taxpayers", label: "Taxpayers Records", icon: Users, roles: ["System Administrator", "Municipal Assessor", "Assessor Staff", "Municipal Treasurer", "Treasury Cashier", "Treasury Supervisor", "Report Viewer", "Auditor / Read-only User"] },
    { id: "properties", label: "Real Properties", icon: Building2, roles: ["System Administrator", "Municipal Assessor", "Assessor Staff", "Municipal Treasurer", "Treasury Supervisor", "Auditor / Read-only User"] },
    { id: "mutations", label: "Property Mutations", icon: GitFork, roles: ["System Administrator", "Municipal Assessor", "Assessor Staff", "Municipal Treasurer", "Treasury Supervisor", "Auditor / Read-only User"] },
    { id: "faas", label: "FAAS Appraisal", icon: FileSpreadsheet, roles: ["System Administrator", "Municipal Assessor", "Assessor Staff", "Auditor / Read-only User"] },
    { id: "declarations", label: "Tax Declarations", icon: FileCheck, roles: ["System Administrator", "Municipal Assessor", "Assessor Staff", "Municipal Treasurer", "Treasury Supervisor", "Auditor / Read-only User"] },
    { id: "billing", label: "Billing / SOA", icon: Receipt, roles: ["System Administrator", "Municipal Treasurer", "Treasury Cashier", "Treasury Supervisor", "Auditor / Read-only User"] },
    { id: "delinquency", label: "Delinquency Monitor", icon: AlertOctagon, roles: ["System Administrator", "Municipal Treasurer", "Treasury Cashier", "Treasury Supervisor", "Report Viewer", "Auditor / Read-only User"] },
    { id: "payments", label: "Cashier Posting", icon: Wallet, roles: ["System Administrator", "Municipal Treasurer", "Treasury Cashier", "Treasury Supervisor"] },
    { id: "receipts", label: "Official Receipts", icon: Coins, roles: ["all"] },
    { id: "online", label: "Online Gateway", icon: CreditCard, roles: ["System Administrator", "Municipal Treasurer", "Treasury Supervisor", "Report Viewer"] },
    { id: "attachments", label: "Attachment Vault", icon: Paperclip, roles: ["System Administrator", "Municipal Assessor", "Assessor Staff", "Municipal Treasurer", "Treasury Supervisor"] },
    { id: "reports", label: "LGU Reports Desk", icon: FileBarChart, roles: ["System Administrator", "Municipal Treasurer", "Treasury Supervisor", "Report Viewer", "Auditor / Read-only User"] },
    { id: "logs", label: "Audit Trails", icon: History, roles: ["System Administrator", "Auditor / Read-only User"] },
    { id: "settings", label: "System Config", icon: Settings, roles: ["System Administrator"] },
    { id: "users", label: "User Management", icon: Users, roles: ["System Administrator"] },
    { id: "templates", label: "Document Templates", icon: FileSpreadsheet, roles: ["System Administrator"] }
  ];

  const currentRole = currentUser?.role || "System Administrator";

  const filteredMenu = menuItems.filter(item => {
    if (item.roles.includes("all")) return true;
    return item.roles.includes(currentRole);
  });

  return (
    <aside className="w-60 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col justify-between" id="portal_side_assembly">
      
      {/* Branding Header Area */}
      <div>
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex flex-col gap-1 bg-gradient-to-b from-slate-950 to-slate-900/60">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-amber-605 text-white rounded bg-amber-600">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-white text-sm tracking-tight font-sans">Paete Treasury</span>
              <span className="block text-[8px] uppercase tracking-widest text-amber-500 font-mono font-bold">RPT Core</span>
            </div>
          </div>
          <p className="text-[9px] text-slate-500 leading-tight font-sans font-medium">LGU Paete • System v4.0</p>
        </div>

        {/* Roles/Test-accounts quick-swapping widget */}
        <div className="p-2 mx-2 my-2 bg-slate-950/60 rounded-sm border border-slate-800 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">Sandbox Operator</span>
          </div>
          
          <select
            value={currentUser?.username}
            onChange={(e) => onSwitchUser(e.target.value)}
            className="w-full bg-slate-900 text-[11px] text-white border border-slate-805 rounded-sm py-1 px-1.5 focus:outline-none focus:border-amber-500 cursor-pointer border-slate-80* border-slate-800"
            id="role_sandbox_dropdown"
          >
            {allUsers.map(u => (
              <option key={u.id} value={u.username}>
                {u.name.split(" ")[0]} ({u.role.split(" ")[0]})
              </option>
            ))}
          </select>

          <div className="pt-1.5 border-t border-slate-800 text-[9px] text-slate-400 space-y-0.5">
            <p className="flex justify-between">
              <span>Office:</span>
              <strong className="text-white truncate max-w-28 text-[9px]">{currentUser?.office?.replace("Office of the ", "")}</strong>
            </p>
            <p className="flex justify-between">
              <span>Role Level:</span>
              <strong className="text-amber-500 truncate max-w-28 text-[9px]">{currentUser?.role}</strong>
            </p>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="px-1.5 space-y-0.5 overflow-y-auto max-h-[380px]" id="sidebar_nav_container">
          {filteredMenu.map(item => {
            const IconComponent = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-[11px] cursor-pointer transition-all duration-100 ${
                  isActive
                    ? "bg-slate-800 text-amber-500 font-bold border-l-2 border-amber-500"
                    : "hover:bg-slate-800/80 text-slate-400 hover:text-slate-100 font-medium"
                }`}
                id={`sidebar_link_${item.id}`}
              >
                <IconComponent className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-amber-500" : "text-slate-500 hover:text-slate-400"}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer Area */}
      <div className="p-2 border-t border-slate-800 bg-slate-950/60 sticky bottom-0">
        <button
          onClick={onGoToPublicVerify}
          className="w-full py-1 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-sm text-[10px] font-bold flex items-center justify-center gap-1.5 mb-2 border border-slate-700/50 transition cursor-pointer text-slate-300"
          id="sidebar_public_verify_link"
        >
          <ScanLine className="h-3.5 w-3.5 text-emerald-400" />
          Public Verification Link
        </button>

        <div className="flex items-center gap-3 justify-between">
          <div className="flex items-center gap-2 truncate">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
            <div className="text-[10px] text-slate-500 font-mono truncate">
              Connected: Oracle v8
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => onSwitchUser("admin")}
              className="p-1 px-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer text-[10px] font-semibold"
              title="Reset Sandbox Session"
            >
              Reset
            </button>
            <button
              onClick={onLogout}
              className="p-1 px-1.5 rounded bg-slate-800 hover:bg-red-700 text-slate-400 hover:text-white transition cursor-pointer text-[10px] font-semibold flex items-center gap-1"
              title="Log out of system operator session"
              id="btn_logout_action"
            >
              <Power className="h-3 w-3 text-red-500" />
              Exit
            </button>
          </div>
        </div>
      </div>

    </aside>
  );
}
