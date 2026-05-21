import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar.tsx";
import PublicVerify from "./components/PublicVerify.tsx";
import TaxpayerPanel from "./components/TaxpayerPanel.tsx";
import PropertyPanel from "./components/PropertyPanel.tsx";
import MutationPanel from "./components/MutationPanel.tsx";
import FaasPanel from "./components/FaasPanel.tsx";
import BillingPanel from "./components/BillingPanel.tsx";
import TreasuryPanel from "./components/TreasuryPanel.tsx";
import Dashboard from "./components/Dashboard.tsx";
import DocumentTemplatesPanel from "./components/DocumentTemplatesPanel.tsx";
import UserManagementPanel from "./components/UserManagementPanel.tsx";
import LoginScreen from "./components/LoginScreen.tsx";
import { db, auth, testConnection } from "./firebase.ts";
import { signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Cloud, Wifi, Database, Key, ShieldAlert, LogIn } from "lucide-react";

import {
  User,
  Taxpayer,
  Property,
  FaaSRecord,
  TaxDeclaration,
  SoaRecord,
  Payment,
  OfficialReceipt,
  Attachment,
  AuditLog,
  SystemSettings
} from "./types";

import {
  Globe,
  Settings,
  History,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Terminal,
  Save,
  CreditCard,
  Building2,
  Trash2,
  RotateCcw
} from "lucide-react";

export default function App() {
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [isPublicMode, setIsPublicMode] = useState(false);

  // States synchronized from dynamic express REST backend
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [taxpayers, setTaxpayers] = useState<Taxpayer[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [faas, setFaas] = useState<FaaSRecord[]>([]);
  const [declarations, setDeclarations] = useState<TaxDeclaration[]>([]);
  const [soa, setSoa] = useState<SoaRecord[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receipts, setReceipts] = useState<OfficialReceipt[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Firebase Synchronization States
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const handleSyncWithFirebase = async () => {
    try {
      setSyncing(true);
      setSyncStatus("Initializing Firestore Sync...");

      // 1. Sync taxpayers
      setSyncStatus("Syncing Taxpayers to Firestore...");
      for (const tp of taxpayers) {
        await setDoc(doc(db, "taxpayers", String(tp.id)), {
          id: tp.id,
          code: tp.code,
          firstName: tp.firstName,
          middleName: tp.middleName || "",
          lastName: tp.lastName,
          suffix: tp.suffix || "",
          companyName: tp.companyName || "",
          type: tp.type,
          tin: tp.tin || "",
          contactNumber: tp.contactNumber || "",
          email: tp.email || "",
          address: tp.address || "",
          barangay: tp.barangay || "",
          municipality: tp.municipality || "Paete",
          province: tp.province || "Laguna",
          zipCode: tp.zipCode || "4016",
          status: tp.status || "active",
          createdAt: tp.createdAt
        });
      }

      // 2. Sync properties
      setSyncStatus("Syncing Properties to Firestore...");
      for (const prop of properties) {
        await setDoc(doc(db, "properties", String(prop.id)), {
          id: prop.id,
          pin: prop.pin,
          tdn: prop.tdn,
          previousTdn: prop.previousTdn || "",
          ownerId: prop.ownerId,
          ownerName: prop.ownerName,
          administrator: prop.administrator || "",
          kind: prop.kind,
          classification: prop.classification,
          barangayId: prop.barangayId || 1,
          barangayName: prop.barangayName,
          street: prop.street || "",
          lotNo: prop.lotNo || "",
          blockNo: prop.blockNo || "",
          surveyNo: prop.surveyNo || "",
          titleNo: prop.titleNo || "",
          area: prop.area,
          unit: prop.unit,
          boundaries: prop.boundaries || "",
          latitude: prop.latitude || 0,
          longitude: prop.longitude || 0,
          parcelReference: prop.parcelReference || "",
          status: prop.status,
          remarks: prop.remarks || "",
          createdAt: prop.createdAt
        });
      }

      // 3. Sync soaRecords
      setSyncStatus("Syncing Statement of Account Records...");
      for (const s of soa) {
        await setDoc(doc(db, "soaRecords", String(s.id)), {
          id: s.id,
          soaNumber: s.soaNumber,
          taxpayerId: s.taxpayerId,
          propertyId: s.propertyId,
          billingYear: s.billingYear,
          billingPeriod: s.billingPeriod,
          assessedValue: s.assessedValue || 0,
          basicRptAmount: s.basicRptAmount || 0,
          sefAmount: s.sefAmount || 0,
          penaltyAmount: s.penaltyAmount || 0,
          discountAmount: s.discountAmount || 0,
          totalDue: s.totalDue || 0,
          amountPaid: s.amountPaid || 0,
          balance: s.balance || 0,
          dueDate: s.dueDate || "",
          status: s.status,
          createdAt: s.createdAt
        });
      }

      // 4. Sync payments
      setSyncStatus("Syncing Payments Ledger...");
      for (const pay of payments) {
        await setDoc(doc(db, "payments", String(pay.id)), {
          id: pay.id,
          paymentRef: pay.paymentRef,
          soaNumber: pay.soaNumber,
          taxpayerId: pay.taxpayerId,
          taxpayerName: pay.taxpayerName || "",
          propertyId: pay.propertyId || 0,
          orNumber: pay.orNumber || "",
          paymentDate: pay.paymentDate || "",
          paymentChannel: pay.paymentChannel,
          amountPaid: pay.amountPaid,
          basicPortion: pay.basicPortion || 0,
          sefPortion: pay.sefPortion || 0,
          penaltyPortion: pay.penaltyPortion || 0,
          discountApplied: pay.discountApplied || 0,
          cashierName: pay.cashierName || "",
          status: pay.status
        });
      }

      // 5. Sync officialReceipts
      setSyncStatus("Syncing Official Receipts Catalog...");
      for (const rec of receipts) {
        await setDoc(doc(db, "officialReceipts", String(rec.id)), {
          id: rec.id,
          orNumber: rec.orNumber,
          paymentId: rec.paymentId,
          taxpayerName: rec.taxpayerName,
          amount: rec.amount,
          paymentDate: rec.paymentDate || "",
          cashierName: rec.cashierName || "",
          remarks: rec.remarks || "",
          status: rec.status
        });
      }

      setSyncStatus("Synchronization completed successfully!");
      loadAppState();
      setTimeout(() => setSyncStatus(null), 5000);
    } catch (err) {
      console.error("Firebase Sync error:", err);
      setSyncStatus(`Sync Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSyncing(false);
    }
  };

  // Filters for reports/logs
  const [filterReportBarangay, setFilterReportBarangay] = useState("all");

  const [loading, setLoading] = useState(true);

  // Retrieve states from server on load
  const loadAppState = async () => {
    try {
      setLoading(true);
      // Synchronize current active operator session
      const userRes = await fetch("/api/auth/me");
      const userVal = await userRes.json();
      setCurrentUser(userVal.user);

      if (!userVal.user) {
        setAllUsers([]);
        setTaxpayers([]);
        setProperties([]);
        setFaas([]);
        setDeclarations([]);
        setSoa([]);
        setPayments([]);
        setReceipts([]);
        setAttachments([]);
        setAuditLogs([]);
        setSettings(null);
        return;
      }

      // Load master records
      const [
        tpRes, propRes, faasRes, decRes, soaRes, payRes, recRes, attRes, logRes, setRes, usersRes
      ] = await Promise.all([
        fetch("/api/taxpayers"),
        fetch("/api/properties"),
        fetch("/api/faas"),
        fetch("/api/declarations"),
        fetch("/api/soa"),
        fetch("/api/payments"),
        fetch("/api/receipts"),
        fetch("/api/attachments"),
        fetch("/api/logs/audit"),
        fetch("/api/gateways"),
        fetch("/api/users")
      ]);

      const [
        tp, prop, faasRecs, decRecs, soas, pays, recs, atts, logs, configs, usersList
      ] = await Promise.all([
        tpRes.json(),
        propRes.json(),
        faasRes.json(),
        decRes.json(),
        soaRes.json(),
        payRes.json(),
        recRes.json(),
        attRes.json(),
        logRes.json(),
        setRes.json(),
        usersRes.json()
      ]);

      setTaxpayers(tp);
      setProperties(prop);
      setFaas(faasRecs);
      setDeclarations(decRecs);
      setSoa(soas);
      setPayments(pays);
      setReceipts(recs);
      setAttachments(atts);
      setAuditLogs(logs);
      setSettings(configs);
      setAllUsers(usersList);

    } catch (err) {
      console.error("Critical error mapping full-stack REST API values:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppState();
    testConnection();
  }, [currentTab]);

  const handleSwitchUser = async (username: string) => {
    try {
      const resp = await fetch("/api/auth/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });
      if (resp.ok) {
        const val = await resp.json();
        setCurrentUser(val.user);
        setCurrentTab("dashboard");
        loadAppState();
      }
    } catch (err) {
      console.error("User swap failed", err);
    }
  };

  const handleLogout = async () => {
    try {
      const resp = await fetch("/api/auth/logout", { method: "POST" });
      if (resp.ok) {
        if (auth.currentUser) {
          await firebaseSignOut(auth);
        }
        setCurrentUser(null);
        setCurrentTab("dashboard");
        loadAppState();
      }
    } catch (err) {
      console.error("Logout request failed", err);
    }
  };

  const handleUpdateSettings = async (formData: any) => {
    try {
      const resp = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (resp.ok) {
        const updated = await resp.json();
        setSettings(updated);
        alert("System parameters updated successfully inside MySQL core.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Rendering loading indicator
  if (loading && taxpayers.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 text-amber-500 font-mono text-sm uppercase flex flex-col items-center justify-center gap-3">
        <Terminal className="h-10 w-10 animate-spin text-amber-600" />
        Processing LGU Paete Oracle database stream...
      </div>
    );
  }

  // Redirect to login screen if not authenticated
  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          loadAppState();
        }}
      />
    );
  }

  // Routing to public portal separate screens
  if (isPublicMode) {
    return <PublicVerify onBack={() => setIsPublicMode(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex" id="lgu_core_assembly">
      
      {/* Sidebar Core left panel */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => { setCurrentTab(tab); }}
        currentUser={currentUser}
        allUsers={allUsers}
        onSwitchUser={handleSwitchUser}
        onGoToPublicVerify={() => setIsPublicMode(true)}
        onLogout={handleLogout}
      />

      {/* Main operational workspace */}
      <main className="flex-grow p-6 overflow-y-auto max-h-screen flex flex-col justify-between" id="portal_main_screen">
        <div className="space-y-6">
          
          {/* Active Panel dispatcher */}
          {currentTab === "dashboard" && (
            <Dashboard
              taxpayers={taxpayers}
              properties={properties}
              faas={faas}
              soa={soa}
              payments={payments}
              currentUser={currentUser}
              setCurrentTab={setCurrentTab}
            />
          )}

          {currentTab === "taxpayers" && (
            <TaxpayerPanel
              taxpayers={taxpayers}
              properties={properties}
              soa={soa}
              currentUser={currentUser}
              onRefresh={loadAppState}
            />
          )}

          {currentTab === "properties" && (
            <PropertyPanel
              properties={properties}
              taxpayers={taxpayers}
              attachments={attachments}
              currentUser={currentUser}
              onRefresh={loadAppState}
            />
          )}

          {currentTab === "mutations" && (
            <MutationPanel
              currentUser={currentUser}
              taxpayers={taxpayers}
              properties={properties}
              faas={faas}
              declarations={declarations}
              soa={soa}
              onRefresh={loadAppState}
            />
          )}

          {currentTab === "faas" || currentTab === "declarations" ? (
            <FaasPanel
              faas={faas}
              properties={properties}
              taxpayers={taxpayers}
              declarations={declarations}
              currentUser={currentUser}
              onRefresh={loadAppState}
            />
          ) : null}

          {currentTab === "billing" && (
            <BillingPanel
              properties={properties}
              taxpayers={taxpayers}
              soa={soa}
              currentUser={currentUser}
              onRefresh={loadAppState}
            />
          )}

          {currentTab === "delinquency" && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4" id="delinquency_tab_sec">
              <div className="border-b pb-3 flex justify-between items-center bg-red-50 p-4 border border-red-100 rounded-xl">
                <div>
                  <h3 className="text-base font-bold text-red-800 font-sans">Delinquency Monitoring Desk</h3>
                  <p className="text-xs text-red-500 mt-0.5 font-medium">Unpaid real property tax assets automatically flagged with accrued compounding monthly penalties.</p>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  Export Delinquent Ledger
                </button>
              </div>

              <div className="border rounded-xl overflow-hidden font-sans text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b font-bold text-slate-500">
                      <th className="p-3">Flagged PIN</th>
                      <th className="p-3">Primary Owner</th>
                      <th className="p-3 text-center">Unpaid Years</th>
                      <th className="p-3">Outstanding Certified Dues</th>
                      <th className="p-3">Escrow Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-3 font-mono font-bold text-red-600">162-12-004-01-314</td>
                      <td className="p-3 font-semibold">Luzviminda Q. Madriñan</td>
                      <td className="p-3 text-center font-mono text-amber-600 font-bold">2026</td>
                      <td className="p-3 font-mono text-red-600 font-bold">₱2,400.00</td>
                      <td className="p-3"><span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200/50 rounded-full font-bold uppercase text-[9px]">Delinquent Status</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentTab === "payments" && (
            <TreasuryPanel
              soa={soa}
              payments={payments}
              receipts={receipts}
              currentUser={currentUser}
              onRefresh={loadAppState}
            />
          )}

          {currentTab === "receipts" && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="border-b pb-3 bg-slate-50 p-3 rounded-lg border">
                <h4 className="font-bold text-slate-800 text-sm">Official Archives Receipts Catalog</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Secure search catalog matching official receipt codes.</p>
              </div>
              <div className="border rounded-xl overflow-hidden font-sans text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b font-bold text-slate-500 uppercase tracking-widest text-[9px]">
                      <th className="p-3">OR Voucher</th>
                      <th className="p-3">Cleared Payor</th>
                      <th className="p-3">Total Transacted</th>
                      <th className="p-3">Cashier</th>
                      <th className="p-3">Archived Voucher Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map(r => (
                      <tr key={r.id} className="border-b">
                        <td className="p-3 font-mono font-semibold text-blue-600">{r.orNumber}</td>
                        <td className="p-3 font-semibold">{r.taxpayerName}</td>
                        <td className="p-3 font-mono font-bold text-emerald-600">₱{r.amount.toLocaleString()}</td>
                        <td className="p-3 text-slate-500">{r.cashierName}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 border rounded text-[9px] font-bold ${
                            r.status === "active" ? "bg-emerald-50 text-emerald-600 border-green-200" : "bg-red-50 text-red-600 border-red-200"
                          }`}>{r.status.toUpperCase()}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentTab === "online" && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6" id="online_gateway_tab">
              <div className="border-b pb-3 border-slate-100 flex gap-2.5 items-center">
                <div className="p-2 bg-slate-50 text-[#d97706] border rounded-lg">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Online Gateway Integration Vault (Bank/LinkBiz)</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Adjust third-party payment partner tokens, cryptographic webhooks, and sandbox reconciliations.</p>
                </div>
              </div>

              {settings && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-sans">
                  <div className="space-y-4 border-r pr-6">
                    <h5 className="font-bold text-slate-700 uppercase tracking-wider text-[10px] border-b pb-1 flex items-center gap-1.5"><Terminal className="h-4 w-4 text-slate-500" /> API Parameters Mappings</h5>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Payment Provider Identity</label>
                        <input
                          type="text"
                          className="w-full border rounded p-2 bg-slate-50 font-semibold"
                          value={settings.paymentProviderName}
                          disabled
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Gateway API Base Endpoint URL</label>
                        <input
                          type="text"
                          className="w-full border rounded p-2 bg-slate-50 font-mono text-blue-600"
                          value={settings.paymentBaseUrl}
                          disabled
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Encrypted Client Key (Base64 Hash)</label>
                        <input
                          type="password"
                          className="w-full border rounded p-2 bg-slate-50 font-mono select-all text-xs"
                          value={settings.paymentApiKeyEncrypted}
                          disabled
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pl-0 sm:pl-6">
                    <h5 className="font-bold text-slate-700 uppercase tracking-wider text-[10px] border-b pb-1 flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Sandbox Reconciliation Feed</h5>
                    <div className="divide-y border rounded bg-slate-50 overflow-hidden font-mono text-[10px] p-3 text-slate-600 space-y-2">
                      <p className="border-b-0">[SYSTEM INFO] LandBank API gateway is mapped & active.</p>
                      <p className="border-b-0 text-emerald-600 font-semibold">[WEBHOOK OK] Synchronized Callback test successful at https://lgu-paete.gov/api/callback</p>
                      <p className="border-b-0">[ENVIRONMENT] Sandbox testing mode enabled.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentTab === "attachments" && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="border-b pb-3">
                <h4 className="font-bold text-slate-800 text-sm">Security Attachments Vault Ledger</h4>
                <p className="text-xs text-slate-400 mt-0.5">Logs and references for security documents in the cloud.</p>
              </div>
              <div className="border rounded-xl overflow-hidden font-sans text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b font-bold text-slate-500">
                      <th className="p-3">File Name</th>
                      <th className="p-3">Category Tag</th>
                      <th className="p-3">Uploader</th>
                      <th className="p-3">Timestamp Uploaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attachments.map(a => (
                      <tr key={a.id} className="border-b">
                        <td className="p-3 font-mono text-blue-600">{a.fileName}</td>
                        <td className="p-3 font-semibold">{a.category}</td>
                        <td className="p-3">{a.uploadedBy}</td>
                        <td className="p-3 font-mono text-slate-500">{a.uploadedAt.split("T")[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentTab === "reports" && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6" id="reports_center">
              <div className="border-b pb-4 flex justify-between items-center bg-slate-50 p-4 border rounded-xl">
                <div>
                  <h3 className="text-base font-bold text-slate-800 font-sans">LGU Reports Center & Fiscal Tables</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Aggregate collector receipts, barangay totals, delinquency notice queues, and auditing sheets.</p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  Export Consolidated CSV
                </button>
              </div>

              {/* Reports list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                <div className="border p-4 rounded-xl space-y-3">
                  <h4 className="font-bold text-slate-700 border-b pb-1">DAILY COLLECTION JOURNAL (2026-05-21)</h4>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <p className="flex justify-between"><span>Unpaid Delinquent value:</span> <strong>₱2,400.00</strong></p>
                    <p className="flex justify-between text-emerald-600 font-bold border-t pt-1"><span>Total cash receipts collected:</span> <strong>₱8,100.00</strong></p>
                  </div>
                </div>

                <div className="border p-4 rounded-xl space-y-3">
                  <h4 className="font-bold text-slate-700 border-b pb-1">AUDIT SUMMARY & VOID COUNTER</h4>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <p className="flex justify-between"><span>Voided receipts count:</span> <strong className="text-red-500">{payments.filter(p => p.status === "voided").length} tickets</strong></p>
                    <p className="flex justify-between text-slate-500"><span>Unsettled SOAs in escrow:</span> <strong>2 statements</strong></p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentTab === "logs" && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4" id="audit_logs_assembly">
              <div className="border-b pb-3 border-slate-100">
                <h4 className="font-bold text-slate-800 text-sm">Administrative Audit Trail Logs</h4>
                <p className="text-xs text-slate-400 mt-0.5">Comprehensive timeline tracking logins, FAAS approvals, SOA creations, payment postings, settings swaps, and gateway reconciliations.</p>
              </div>

              <div className="border rounded-xl overflow-hidden font-mono text-[10.5px]" id="logs_table_container">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b font-sans font-bold text-slate-500 uppercase tracking-widest text-[9px]">
                      <th className="p-3">Reference Log ID</th>
                      <th className="p-3">User Account</th>
                      <th className="p-3">Action Recorded</th>
                      <th className="p-3">Assigned Module</th>
                      <th className="p-3">JSON Changeset Payload Reference</th>
                      <th className="p-3">Network IP</th>
                      <th className="p-3">Timestamp Audit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(l => (
                      <tr key={l.id} className="border-b hover:bg-slate-50/70 transition">
                        <td className="p-3 text-slate-400">LOG-20260521-{String(l.id).padStart(5, "0")}</td>
                        <td className="p-3 font-semibold font-sans text-slate-700">{l.username}</td>
                        <td className="p-3 font-bold text-slate-800 uppercase">{l.action}</td>
                        <td className="p-3 text-pink-600 font-sans text-[10px]">{l.module}</td>
                        <td className="p-3 text-slate-400 select-all truncate max-w-[200px]" title={l.newValues}>{l.newValues}</td>
                        <td className="p-3 text-slate-500">{l.ipAddress}</td>
                        <td className="p-3 text-slate-500">{l.createdAt.replace("T", " ").replace("Z", "")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentTab === "settings" && settings && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6" id="settings_tab_sec">
              <div className="border-b pb-3 border-slate-100 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">System Parameters & Municipal Rate Mappings</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Reconfigure LGU Paete basic RPT rate formulas, monthly compounding delay interest rates, and prompt discount thresholds.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs font-sans">
                <div className="space-y-4">
                  <h5 className="font-bold text-slate-700 border-b pb-1 uppercase">Municipal Information</h5>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Province Location</label>
                      <input type="text" className="w-full border p-2 rounded" value={settings.province} disabled />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Municipality (LGU)</label>
                      <input type="text" className="w-full border p-2 rounded font-bold" value={settings.municipality} disabled />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="font-bold text-slate-700 border-b pb-1 uppercase">Tax Rates configuration</h5>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Basic RPT General Rate (%)</label>
                      <input type="number" className="w-full border p-2 rounded font-mono font-bold" value={settings.basicRptRate} onChange={(e) => setSettings({ ...settings, basicRptRate: parseFloat(e.target.value) })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Special Education Fund Rate SEF (%)</label>
                      <input type="number" className="w-full border p-2 rounded font-mono font-bold" value={settings.sefRate} onChange={(e) => setSettings({ ...settings, sefRate: parseFloat(e.target.value) })} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="font-bold text-slate-700 border-b pb-1 uppercase">Delinquency Penalties & Discounts</h5>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Penalty Interest Rate per Month (%)</label>
                      <input type="number" className="w-full border p-2 rounded font-mono font-bold text-red-500" value={settings.penaltyRatePercent} onChange={(e) => setSettings({ ...settings, penaltyRatePercent: parseFloat(e.target.value) })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Prompt Pay Discount Rate (%)</label>
                      <input type="number" className="w-full border p-2 rounded font-mono font-bold text-emerald-600" value={settings.discountPercent} onChange={(e) => setSettings({ ...settings, discountPercent: parseFloat(e.target.value) })} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleUpdateSettings(settings)}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Save className="h-4.5 w-4.5" />
                  Commit Changes to MySQL
                </button>
              </div>

              {/* Cloud Firebase Real-time Integration Hub details */}
              <div className="mt-8 border-t pt-6 space-y-4">
                <div className="flex gap-2.5 items-center">
                  <div className="p-2 bg-slate-50 text-sky-600 border rounded-lg">
                    <Cloud className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Cloud Firebase Firestore & Auth Hub</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Real-time Zero-Trust synchronization with cloud enterprise database clusters.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-sans">
                  <div className="border p-4 rounded-xl space-y-4 bg-slate-50 border-slate-200">
                    <h5 className="font-bold text-slate-700 uppercase tracking-wider text-[10px] border-b pb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Database className="h-4 w-4 text-sky-500" /> Active Configurations</span>
                      <span className="px-2 py-0.5 bg-sky-100 text-[#0369a1] text-[9.5px] rounded-full uppercase tracking-widest font-bold flex items-center gap-1">
                        <Wifi className="h-3 w-3" /> Online
                      </span>
                    </h5>

                    <div className="space-y-2 font-mono text-[10.5px]">
                      <div className="flex justify-between border-b pb-1 border-slate-200/60">
                        <span className="text-slate-400">Project ID:</span>
                        <strong className="text-slate-700">gen-lang-client-0376401154</strong>
                      </div>
                      <div className="flex justify-between border-b pb-1 border-slate-200/60">
                        <span className="text-slate-400">Database Instance Name:</span>
                        <strong className="text-slate-700 truncate max-w-[200px]">ai-studio-bce4fac7-f640-48d6-90d9-9594f73c026a</strong>
                      </div>
                      <div className="flex justify-between border-b pb-1 border-slate-200/60 text-slate-500">
                        <span className="text-slate-400">Region:</span>
                        <strong className="text-slate-600">asia-southeast1 (Singapore)</strong>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span className="text-slate-400">Security Rule Integrity:</span>
                        <strong className="text-emerald-600 font-sans font-bold flex items-center gap-0.5">Zero-Trust Secured</strong>
                      </div>
                    </div>
                  </div>

                  <div className="border p-4 rounded-xl flex flex-col justify-between items-stretch bg-gradient-to-br from-slate-50 to-sky-50 border-sky-100">
                    <div className="space-y-2">
                      <h5 className="font-bold text-slate-700 uppercase tracking-wider text-[10px] border-b pb-1">Real-time Sync & Off-site Backup</h5>
                      <p className="text-slate-500 text-[11px] leading-relaxed">
                        Replicate all local MySQL master records (Taxpayers, Properties, SOAs, Payments, and Receipts) to your cloud Firestore instance under strict Attribute-Based Access Control filters.
                      </p>
                    </div>

                    <div className="mt-4 space-y-2">
                      {syncStatus && (
                        <div className="p-2 border bg-white rounded text-[11px] font-mono text-sky-700 border-sky-100 flex items-center gap-1.5 animate-fadeIn">
                          <span className="h-2 w-2 rounded-full bg-sky-500 animate-ping"></span>
                          {syncStatus}
                        </div>
                      )}

                      <button
                        onClick={handleSyncWithFirebase}
                        disabled={syncing}
                        className="w-full px-5 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Cloud className="h-4.5 w-4.5 animate-bounce" />
                        {syncing ? "Replicating Node Registry..." : "Synchronize Database with Firebase"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentTab === "templates" && (
            <DocumentTemplatesPanel
              currentUser={currentUser}
              onRefresh={loadAppState}
            />
          )}

          {currentTab === "users" && (
            <UserManagementPanel
              currentUser={currentUser}
              allUsers={allUsers}
              onRefresh={loadAppState}
            />
          )}

        </div>

        {/* Universal Footer */}
        <footer className="mt-8 pt-4 border-t border-slate-200/60 text-center font-sans">
          <p className="text-[11px] text-slate-400">
            © 2026 Local Government Unit of Paete, Laguna • Treasury & Assessment Audit Portal • Commission on Audit Secure Compliant
          </p>
        </footer>
      </main>

    </div>
  );
}
