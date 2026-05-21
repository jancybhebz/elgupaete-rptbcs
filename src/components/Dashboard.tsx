import React from "react";
import {
  Users,
  Building2,
  FileCheck,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  Percent,
  Activity,
  Award,
  CalendarCheck2
} from "lucide-react";
import { Taxpayer, Property, FaaSRecord, SoaRecord, Payment, User } from "../types";

interface DashboardProps {
  taxpayers: Taxpayer[];
  properties: Property[];
  faas: FaaSRecord[];
  soa: SoaRecord[];
  payments: Payment[];
  currentUser: User | null;
  setCurrentTab: (tab: string) => void;
}

export default function Dashboard({
  taxpayers,
  properties,
  faas,
  soa,
  payments,
  currentUser,
  setCurrentTab
}: DashboardProps) {

  // Analytical compute engines
  const totalTaxpayers = taxpayers.length;
  const totalProperties = properties.filter(p => p.status === "active").length;
  
  // Assessed value totaling
  const approvedFaas = faas.filter(f => f.status === "approved");
  const totalAssessedValue = approvedFaas.reduce((acc, curr) => acc + curr.assessedValue, 0);

  // Annual billing totaling
  const activeSoas = soa.filter(s => s.status !== "cancelled");
  const totalRptBilled = activeSoas.reduce((acc, curr) => acc + curr.basicRptAmount, 0);
  const totalSefBilled = activeSoas.reduce((acc, curr) => acc + curr.sefAmount, 0);

  // Collections modeling
  const postedPayments = payments.filter(p => p.status === "posted");
  const totalCollectionsToday = postedPayments.reduce((acc, curr) => acc + curr.amountPaid, 0);

  // Delinquencies
  const delinquentPropertiesCount = properties.filter(p => {
    // Has an outstanding balance on any issued SOA that is overdue
    const propSoas = soa.filter(s => s.propertyId === p.id && s.balance > 0);
    return propSoas.length > 0;
  }).length;

  const pendingOnlineCount = payments.filter(p => p.status === "pending" || p.paymentChannel.includes("LinkBiz")).length;

  // Render Role Banners
  const getRoleHeaderTip = () => {
    switch (currentUser?.role) {
      case "System Administrator":
        return {
          title: "Root System Administrator Operations Console",
          desc: "Full operational access. You are monitoring standard database schemas, role provisioning, system config audit logs, and transaction rolls.",
          theme: "bg-blue-50 border-blue-200 text-blue-800"
        };
      case "Municipal Assessor":
        return {
          title: "Municipal Assessor Workspace",
          desc: "Core tasks: FAAS appraisal approval, mapping parcel coordinates, creating revised assessments, and issuing new Tax Declarations.",
          theme: "bg-purple-50 border-purple-200 text-purple-800"
        };
      case "Assessor Staff":
        return {
          title: "Assessor Appraisal Desk",
          desc: "Active tasks: Registering raw property records, drafting Appraisal Assessments (FAAS) for Municipal Assessor review, logging locations.",
          theme: "bg-indigo-50 border-indigo-200 text-indigo-800"
        };
      case "Municipal Treasurer":
        return {
          title: "Municipal Treasurer Oversight Board",
          desc: "Key duties: Monitoring collection trends, adjusting penalty rates, checking online gateway configurations, and auditing cash balances.",
          theme: "bg-amber-50 border-amber-200 text-amber-800"
        };
      case "Treasury Cashier":
        return {
          title: "Cashier Counter & Collection Desk",
          desc: "Primary duties: Searching for taxpayers' Statement of Account, posting manual payments, issuing Official Receipts, and reprinting receipts.",
          theme: "bg-emerald-50 border-emerald-200 text-emerald-800"
        };
      case "Treasury Supervisor":
        return {
          title: "Treasury Supervisor Controls",
          desc: "Key tasks: Auditing cashiers counters, approving void requests, verifying LandBank bank reconciliations, checking delinquent list exports.",
          theme: "bg-rose-50 border-rose-200 text-rose-800"
        };
      case "Report Viewer":
      case "Auditor / Read-only User":
        return {
          title: "LGU Fiscal Audit Console • Read-only Mode",
          desc: "You can render billing maps, collection ledgers, and download report CSVs. Creation and update commands are prohibited by policy rules.",
          theme: "bg-slate-50 border-slate-200 text-slate-800"
        };
      default:
        return {
          title: "LGU Paete General Registry",
          desc: "Managing general system files, ledger lists, and structural cadastral templates.",
          theme: "bg-slate-50 border-slate-200 text-slate-800"
        };
    }
  };

  const tip = getRoleHeaderTip();

  return (
    <div className="space-y-3 font-sans" id="dashboard_panel_root">
      
      {/* Title & Date Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-white p-3 rounded-sm border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Municipal Administration Workspace</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Local Government Unit of Paete, Laguna • Eastern District Portal</p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-sm border border-slate-200">
          <CalendarCheck2 className="h-3.5 w-3.5 text-amber-600" />
          <span className="font-mono text-[11px] font-bold text-slate-700">2026-05-21 (UTC-8)</span>
        </div>
      </div>

      {/* Role Notice Banner */}
      <div className={`p-2.5 rounded-sm border ${tip.theme} flex gap-2 text-xs`} id="role_banner">
        <Activity className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-xs">{tip.title}</h4>
          <p className="text-[11px] mt-0.5 leading-tight opacity-90 font-medium">{tip.desc}</p>
        </div>
      </div>

      {/* Metric Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2" id="metric_widget_grid">
        
        {/* Taxpayers Widget */}
        <div className="bg-white p-3 rounded-sm border border-slate-200 shadow-sm flex items-center gap-3 hover:border-amber-500/30 transition-all">
          <div className="p-2 bg-slate-50 border border-slate-200/60 text-slate-700 rounded-sm">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Taxpayers</span>
            <span className="text-base font-bold text-slate-800 font-mono leading-tight block">{totalTaxpayers}</span>
            <span className="text-[9px] text-green-600 font-bold block">+3 new this month</span>
          </div>
        </div>

        {/* Property Count Widget */}
        <div className="bg-white p-3 rounded-sm border border-slate-200 shadow-sm flex items-center gap-3 hover:border-amber-500/30 transition-all">
          <div className="p-2 bg-slate-50 border border-slate-200/60 text-slate-700 rounded-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active Properties</span>
            <span className="text-base font-bold text-slate-800 font-mono leading-tight block">{totalProperties}</span>
            <span className="text-[9px] text-slate-500 font-medium block">CAD parcels: {totalProperties}</span>
          </div>
        </div>

        {/* Total Assessed Valuation Widget */}
        <div className="bg-white p-3 rounded-sm border border-slate-200 shadow-sm flex items-center gap-3 hover:border-amber-500/30 transition-all">
          <div className="p-2 bg-slate-50 border border-slate-200/60 text-slate-700 rounded-sm">
            <Percent className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Assessed Valuation</span>
            <span className="text-base font-bold text-slate-800 font-mono leading-tight block">₱{(totalAssessedValue / 1000000).toFixed(2)}M</span>
            <span className="text-[9px] text-slate-500 font-medium block truncate max-w-28">Total: ₱{(totalAssessedValue / 1000).toFixed(0)}k</span>
          </div>
        </div>

        {/* Collections Today */}
        <div className="bg-white p-3 rounded-sm border border-slate-200 shadow-sm flex items-center gap-3 hover:border-amber-500/30 transition-all">
          <div className="p-2 bg-slate-50 border border-slate-200/60 text-slate-700 rounded-sm">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Collected Today</span>
            <span className="text-base font-bold text-emerald-600 font-mono leading-tight block">₱{totalCollectionsToday.toLocaleString()}</span>
            <span className="text-[9px] text-emerald-605 font-bold block text-emerald-700">Receipts posted: {postedPayments.length}</span>
          </div>
        </div>

      </div>

      {/* Sub-metrics secondary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" id="secondary_metric_row">
        <div className="bg-slate-50 p-2 rounded-sm border border-slate-200 text-slate-700 flex justify-between items-center text-xs">
          <div>
            <span className="block text-[9px] uppercase font-bold text-slate-500">Total SEF Billed (2026)</span>
            <strong className="text-xs font-mono text-slate-800">₱{totalSefBilled.toLocaleString()}</strong>
          </div>
          <span className="text-[9px] text-amber-700 font-bold bg-amber-50 border border-amber-200/50 px-1 rounded-sm">1.0% Rate</span>
        </div>

        <div className="bg-slate-50 p-2 rounded-sm border border-slate-200 text-slate-700 flex justify-between items-center text-xs">
          <div>
            <span className="block text-[9px] uppercase font-bold text-slate-500">Delinquent Properties</span>
            <strong className="text-xs font-mono text-red-600 bg-red-50 border border-red-200/30 px-1 py-0.5 rounded-sm">{delinquentPropertiesCount} flagged</strong>
          </div>
          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
        </div>

        <div className="bg-slate-50 p-2 rounded-sm border border-slate-200 text-slate-700 flex justify-between items-center text-xs">
          <div>
            <span className="block text-[9px] uppercase font-bold text-slate-500">Pending Gateways</span>
            <strong className="text-xs font-mono text-slate-800">{pendingOnlineCount} callbacks</strong>
          </div>
          <CreditCard className="h-3.5 w-3.5 text-purple-500" />
        </div>
      </div>

      {/* Analytical Visualizers (SVG Sparkline & Barangay charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2" id="dashboard_analytics_grid">
        
        {/* Trend line spark */}
        <div className="bg-white p-3 rounded-sm border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-xs font-bold text-slate-800 font-sans">LGU Collection Trend (2026)</h3>
              <p className="text-[10px] text-slate-400 font-sans">Value of cashiers collections and online gateways.</p>
            </div>
            <span className="px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 font-bold text-[9px] font-mono">+12.4% vs FY25</span>
          </div>

          {/* Interactive Responsive SVG Trend Chart */}
          <div className="h-36 w-full bg-slate-50 rounded-sm relative flex items-end p-2 border border-slate-200/50" id="trend_chart_container">
            <svg viewBox="0 0 500 150" className="w-full h-full text-amber-500">
              {/* Background horizontal lines */}
              <line x1="0" y1="20" x2="500" y2="20" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="50" x2="500" y2="50" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="80" x2="500" y2="80" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="110" x2="500" y2="110" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />

              {/* Gradient Filling */}
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d97706" stopOpacity="0.15"/>
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0.0"/>
                </linearGradient>
              </defs>

              {/* Line path filled */}
              <path
                d="M 10,130 C 50,110 80,115 120,80 C 160,50 200,60 250,90 C 300,120 350,40 400,30 C 450,22 470,12 490,10 L 490,140 L 10,140 Z"
                fill="url(#chartGradient)"
              />

              {/* Actual sparkline */}
              <path
                d="M 10,130 C 50,110 80,115 120,80 C 160,50 200,60 250,90 C 300,120 350,40 400,30 C 450,22 470,12 490,10"
                fill="none"
                stroke="#d97706"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Circles on main target spots */}
              <circle cx="10" cy="130" r="3.5" fill="#1e293b" stroke="#d97706" strokeWidth="1.5" />
              <circle cx="120" cy="80" r="3.5" fill="#1e293b" stroke="#d97706" strokeWidth="1.5" />
              <circle cx="250" cy="90" r="3.5" fill="#1e293b" stroke="#d97706" strokeWidth="1.5" />
              <circle cx="400" cy="30" r="3.5" fill="#1e293b" stroke="#d97706" strokeWidth="1.5" />
              <circle cx="490" cy="10" r="3.5" fill="#d97706" stroke="#fff" strokeWidth="1.5" />
            </svg>

            {/* Labels overlay */}
            <div className="absolute top-1 left-2 text-[9px] text-slate-400 font-semibold font-mono">1M Peak</div>
            <div className="absolute bottom-1 right-2 text-[9px] text-slate-400 font-semibold font-mono">May (Current)</div>
          </div>

          <div className="grid grid-cols-4 text-center mt-2 text-[9px] text-slate-500 font-bold font-mono">
            <div>Q1 (8.4K)</div>
            <div>Q2 (12.2K)</div>
            <div>Q3</div>
            <div>Q4</div>
          </div>
        </div>

        {/* Top Barangay rankings */}
        <div className="bg-white p-3 rounded-sm border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 font-sans">Collections by Barangay</h3>
            <p className="text-[10px] text-slate-400 font-sans mb-2.5">Rankings based on resident tax declarations settled.</p>

            <div className="space-y-2.5" id="barangay_rank_stack">
              <div>
                <div className="flex justify-between text-[11px] text-slate-650 mb-0.5 font-semibold">
                  <span>Brgy. Bagumbayan</span>
                  <span className="font-mono text-slate-900 font-bold">₱8,100 (60%)</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-sm overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-sm" style={{ width: "60%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-650 mb-0.5 font-semibold">
                  <span>Brgy. Quinale</span>
                  <span className="font-mono text-slate-900">₱0 (0%)</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-sm overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-sm" style={{ width: "0%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-650 mb-0.5 font-semibold">
                  <span>Brgy. Maytoong</span>
                  <span className="font-mono text-slate-900">₱0 (0%)</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-sm overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-sm" style={{ width: "0%" }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3.5 p-2 rounded-sm bg-amber-50 border border-amber-200/50 text-[10px] text-amber-800 leading-tight flex gap-1 font-sans">
            <Award className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <p className="font-medium">
              <strong>Bagumbayan</strong> is the top performing barangay for the revision cycle. High commercial compliance.
            </p>
          </div>
        </div>

      </div>

      {/* Quick Action shortcuts based on role */}
      <div className="bg-slate-900 text-slate-100 p-3 rounded-sm border border-slate-800 shadow-md" id="sandbox_shortcuts_panel">
        <h3 className="text-xs font-bold font-mono tracking-wider text-amber-500 uppercase">Operational Shortcut Board</h3>
        <p className="text-[10px] text-slate-400 mt-0.5">Direct jumps to test specific workflows tailored for LGU staff.</p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mt-2.5" id="shortcut_grid">
          {currentUser?.role.includes("Assessor") && (
            <>
              <button
                onClick={() => setCurrentTab("properties")}
                className="py-2 px-3 rounded-sm bg-slate-800 hover:bg-slate-750 transition text-xs font-semibold text-slate-300 text-left border border-slate-700/60 cursor-pointer"
              >
                <span className="block text-amber-505 font-bold uppercase text-[8px] mb-0.5 font-mono text-amber-500">ASSESSOR ACTION</span>
                Register Property
              </button>
              <button
                onClick={() => setCurrentTab("faas")}
                className="py-2 px-3 rounded-sm bg-slate-800 hover:bg-slate-750 transition text-xs font-semibold text-slate-300 text-left border border-slate-700/60 cursor-pointer"
              >
                <span className="block text-purple-405 font-bold uppercase text-[8px] mb-0.5 font-mono text-purple-400">STAFF APPRAISAL</span>
                Review Pending FAAS
              </button>
            </>
          )}

          {currentUser?.role.includes("Treasurer") && (
            <>
              <button
                onClick={() => setCurrentTab("billing")}
                className="py-2 px-3 rounded-sm bg-slate-800 hover:bg-slate-750 transition text-xs font-semibold text-slate-300 text-left border border-slate-700/60 cursor-pointer"
              >
                <span className="block text-amber-505 font-bold uppercase text-[8px] mb-0.5 font-mono text-amber-500">SOA BILLS</span>
                Issue Statement of Account
              </button>
              <button
                onClick={() => setCurrentTab("delinquency")}
                className="py-2 px-3 rounded-sm bg-slate-800 hover:bg-slate-750 transition text-xs font-semibold text-slate-300 text-left border border-slate-700/60 cursor-pointer"
              >
                <span className="block text-red-405 font-bold uppercase text-[8px] mb-0.5 font-mono text-red-400">DELINQUENCY AUDIT</span>
                Track Overdue Ledgers
              </button>
            </>
          )}

          {currentUser?.role === "System Administrator" && (
            <>
              <button
                onClick={() => setCurrentTab("settings")}
                className="py-2 px-3 rounded-sm bg-slate-800 hover:bg-slate-750 transition text-xs font-semibold text-slate-300 text-left border border-slate-700/60 cursor-pointer"
              >
                <span className="block text-indigo-405 font-bold uppercase text-[8px] mb-0.5 font-mono text-indigo-400">ADMIN SYSTEM</span>
                Reconfigure Tax Rate Specs
              </button>
              <button
                onClick={() => setCurrentTab("logs")}
                className="py-2 px-3 rounded-sm bg-slate-800 hover:bg-slate-750 transition text-xs font-semibold text-slate-300 text-left border border-slate-700/60 cursor-pointer"
              >
                <span className="block text-slate-405 font-bold uppercase text-[8px] mb-0.5 font-mono text-slate-400">SYSTEM MONITOR</span>
                Inspect Global Audit Logs
              </button>
            </>
          )}

          {currentUser?.role.includes("Cashier") && (
            <button
              onClick={() => setCurrentTab("payments")}
              className="py-2 px-3 rounded-sm bg-slate-800 hover:bg-slate-750 transition text-xs font-semibold text-slate-300 text-left border border-slate-700/60 cursor-pointer col-span-2"
            >
              <span className="block text-emerald-405 font-bold uppercase text-[8px] mb-0.5 font-mono text-emerald-400">CASHIER DESK</span>
              Accept Payments & Output Official Receipts
            </button>
          )}

          <button
            onClick={() => setCurrentTab("taxpayers")}
            className="py-2 px-3 rounded-sm bg-slate-800 hover:bg-slate-750 transition text-xs font-semibold text-slate-300 text-left border border-slate-700/60 cursor-pointer"
          >
            <span className="block text-sky-405 font-bold uppercase text-[8px] mb-0.5 font-mono text-sky-400">UNIVERSAL SEARCH</span>
            Inspect Taxpayer Registry
          </button>
        </div>
      </div>

    </div>
  );
}
