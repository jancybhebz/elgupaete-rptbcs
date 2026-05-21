import React, { useState } from "react";
import { User, SoaRecord, Payment, OfficialReceipt, Taxpayer, Property } from "../types";
import { 
  Search, 
  Plus, 
  CreditCard, 
  ShieldCheck, 
  Printer, 
  AlertTriangle, 
  Coins, 
  Ban, 
  ClipboardCheck,
  X,
  Globe,
  Activity,
  Wifi,
  QrCode,
  Laptop,
  CheckCircle2,
  ArrowRight,
  Clock,
  BookOpen,
  Sparkles,
  RefreshCw,
  Wallet,
  Smartphone,
  Building,
  HelpCircle
} from "lucide-react";

interface TreasuryPanelProps {
  soa: SoaRecord[];
  payments: Payment[];
  receipts: OfficialReceipt[];
  currentUser: User | null;
  onRefresh: () => void;
  taxpayers: Taxpayer[];
  properties: Property[];
}

export default function TreasuryPanel({
  soa,
  payments,
  receipts,
  currentUser,
  onRefresh,
  taxpayers = [],
  properties = []
}: TreasuryPanelProps) {
  const [soaQuery, setSoaQuery] = useState("");
  const [matchedSoa, setMatchedSoa] = useState<SoaRecord | null>(null);
  
  // Post Payment Form States
  const [orNum, setOrNum] = useState("");
  const [payChannel, setPayChannel] = useState<"Cash" | "Check" | "Bank Transfer" | "LandBank LinkBiz" | "GCash" | "Maya" | "eGovPay">("Cash");
  const [amountReceived, setAmountReceived] = useState("");
  
  // New Payment Modal State variables
  const [isNewPaymentModalOpen, setIsNewPaymentModalOpen] = useState(false);
  const [modalSelectedSoaId, setModalSelectedSoaId] = useState("");
  const [modalPayChannel, setModalPayChannel] = useState<"Cash" | "Check" | "Bank Transfer" | "LandBank LinkBiz" | "GCash" | "Maya" | "eGovPay">("Cash");
  const [modalOrNum, setModalOrNum] = useState("");
  const [modalAmountReceived, setModalAmountReceived] = useState("");
  const [modalCheckNo, setModalCheckNo] = useState("");
  const [modalCheckBank, setModalCheckBank] = useState("");
  const [modalOnlineRef, setModalOnlineRef] = useState("");
  const [modalCashPaid, setModalCashPaid] = useState(""); // Cash Tendered for live change calculations

  // Online Gateway Simulation States
  const [onlineGatewayStatus, setOnlineGatewayStatus] = useState<"idle" | "connecting" | "authenticating" | "processing" | "confirming" | "success">("idle");
  const [onlineLogs, setOnlineLogs] = useState<string[]>([]);
  const [gatewayProgress, setGatewayProgress] = useState(0);
  const [modalError, setModalError] = useState("");
  const [isProcessingModalPayment, setIsProcessingModalPayment] = useState(false);
  
  const [voidOrNum, setVoidOrNum] = useState("");
  const [voidReasonText, setVoidReasonText] = useState("");
  const [showVoidDialog, setShowVoidDialog] = useState(false);

  const [activeReceipt, setActiveReceipt] = useState<OfficialReceipt | null>(null);
  const [postError, setPostError] = useState("");

  const handleSearchSoa = () => {
    setPostError("");
    const matched = soa.find(s => s.soaNumber === soaQuery.trim() && s.status !== "cancelled");
    if (!matched) {
      setPostError("Statement of Account (SOA) not found or expired.");
      setMatchedSoa(null);
    } else if (matched.status === "fully paid") {
      setPostError("This Statement of Account is already fully paid and settled.");
      setMatchedSoa(matched);
    } else {
      setMatchedSoa(matched);
      setAmountReceived(String(matched.balance)); // default to outstanding
    }
  };

  const handlePostPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedSoa || !amountReceived) return;
    setPostError("");

    try {
      const response = await fetch("/api/treasury/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soaId: matchedSoa.id,
          orNumber: orNum,
          paymentChannel: payChannel,
          amountPaid: parseFloat(amountReceived)
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setPostError(data.message || "Failed to post payment.");
      } else {
        setOrNum("");
        setAmountReceived("");
        setMatchedSoa(null);
        setSoaQuery("");
        onRefresh();
        
        // Load target printed sheet preview
        if (data.or) {
          setActiveReceipt(data.or);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalSelectedSoaId || !modalAmountReceived || !modalOrNum) {
      setModalError("Please select a Statement of Account (SOA), provide an Official Receipt (OR) Number, and confirm the payment amount.");
      return;
    }
    setModalError("");
    setIsProcessingModalPayment(true);

    try {
      const response = await fetch("/api/treasury/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soaId: parseInt(modalSelectedSoaId),
          orNumber: modalOrNum,
          paymentChannel: modalPayChannel,
          amountPaid: parseFloat(modalAmountReceived)
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setModalError(data.message || "Failed to process cashier posting.");
      } else {
        setIsNewPaymentModalOpen(false);
        onRefresh();
        if (data.or) {
          setActiveReceipt(data.or);
        }
      }
    } catch (err) {
      setModalError("Network failure connecting to treasury service.");
      console.error(err);
    } finally {
      setIsProcessingModalPayment(false);
    }
  };

  const handleSimulateOnlinePayment = async () => {
    if (!modalSelectedSoaId || !modalAmountReceived) {
      setModalError("Please select a Statement of Account (SOA) first.");
      return;
    }
    setModalError("");
    setOnlineGatewayStatus("connecting");
    setGatewayProgress(10);
    setOnlineLogs(["[Gateway] Connecting to secure Paete Municipal online merchant gateway routing switch..."]);

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    await delay(600);
    setOnlineGatewayStatus("authenticating");
    setGatewayProgress(35);
    setOnlineLogs(prev => [...prev, `[Authenticating] Digital handshake established. Authorized Provider: ${modalPayChannel}.`, "[Routing] Transmitting RPT secured tax billing manifest..."]);

    await delay(700);
    setOnlineGatewayStatus("processing");
    setGatewayProgress(65);
    setOnlineLogs(prev => [...prev, `[Processing] E-Wallet credentials pre-cleared. Online Ref: ${modalOnlineRef}`, `[Processor] Total amount authorization cleared: ₱${parseFloat(modalAmountReceived).toLocaleString(undefined, { minimumFractionDigits: 2 })}`]);

    await delay(800);
    setOnlineGatewayStatus("confirming");
    setGatewayProgress(90);
    setOnlineLogs(prev => [...prev, "[Clearing] Fund transfers confirmed. Generating official digital receipt payload..."]);

    await delay(500);
    setOnlineGatewayStatus("success");
    setGatewayProgress(100);
    setOnlineLogs(prev => [...prev, "[SUCCESS] Transaction cryptographically verified and posted to treasury archives!"]);

    // Post payment automatically to LGU database ledger via our API
    try {
      const response = await fetch("/api/treasury/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soaId: parseInt(modalSelectedSoaId),
          orNumber: `OR-ONL-${modalOnlineRef.slice(-7)}`,
          paymentChannel: modalPayChannel,
          amountPaid: parseFloat(modalAmountReceived)
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setModalError(data.message || "Simulation succeeded, but server ledger rejected recording.");
        setOnlineGatewayStatus("idle");
      } else {
        await delay(500);
        setIsNewPaymentModalOpen(false);
        onRefresh();
        if (data.or) {
          setActiveReceipt(data.or);
        }
      }
    } catch (err) {
      setModalError("Simulation succeeded, but registry server is currently unresponsive.");
      setOnlineGatewayStatus("idle");
    }
  };

  const handleVoidReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidOrNum || !voidReasonText) return;

    try {
      const response = await fetch("/api/treasury/void-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orNumber: voidOrNum,
          voidReason: voidReasonText
        })
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.message || "Voiding failed");
      } else {
        setVoidOrNum("");
        setVoidReasonText("");
        setShowVoidDialog(false);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-sm space-y-3" id="treasury_panel_assembly">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-50 p-2.5 rounded-sm border border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-900 font-sans">Treasury Counter & Cashier Desk</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Accept citizen payments, post balances, issue official COA receipts, and manage voiding processes under authorization gates.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setModalSelectedSoaId("");
              setModalPayChannel("Cash");
              setModalAmountReceived("");
              setModalOrNum("");
              setModalCheckNo("");
              setModalCheckBank("");
              setModalCashPaid("");
              setModalOnlineRef(`REF-${Date.now().toString().slice(-8)}`);
              setOnlineGatewayStatus("idle");
              setOnlineLogs([]);
              setGatewayProgress(0);
              setModalError("");
              setIsNewPaymentModalOpen(true);
            }}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-700 text-white rounded-sm text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            id="btn_open_new_payment"
          >
            <Plus className="h-4 w-4" />
            New Payment Posting
          </button>

          {currentUser && (currentUser.role === "Treasury Supervisor" || currentUser.role === "System Administrator") && (
            <button
              onClick={() => setShowVoidDialog(true)}
              className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-sm text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Ban className="h-4 w-4" />
              Void Receipt
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3" id="treasury_workspace">
        
        {/* Left Col: Pos workflow counter */}
        <div className="lg:col-span-1 bg-slate-50 p-3 rounded-sm border border-slate-200 space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 font-sans border-b pb-1.5">Cashier Settlement Portal</h4>
          
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Search Statement (SOA Reference)</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="e.g. SOA-2026-000001"
                value={soaQuery}
                onChange={(e) => setSoaQuery(e.target.value)}
                className="flex-grow bg-white border border-slate-200 rounded-sm p-1.5 text-xs font-mono"
                id="search_soa_counter"
              />
              <button
                onClick={handleSearchSoa}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-sm text-xs font-bold font-sans cursor-pointer transition shrink-0"
              >
                Scan Due
              </button>
            </div>
            
            {postError && (
              <p className="p-2 border rounded border-amber-200/50 text-[11px] font-semibold text-amber-700 bg-amber-50">
                {postError}
              </p>
            )}
          </div>

          {/* Form posting matched soa */}
          {matchedSoa && matchedSoa.status !== "fully paid" && (
            <form onSubmit={handlePostPayment} className="bg-white border rounded-xl p-4 space-y-3.5 shadow-inner" id="payment_posting_form">
              <div className="text-[10px] space-y-1 bg-indigo-50 border border-indigo-200/40 p-2.5 rounded font-sans leading-relaxed text-indigo-900">
                <p>Taxpayer Ref: <strong className="font-mono text-xs">{matchedSoa.taxpayerId}</strong></p>
                <p>Coverage: <strong className="font-bold">{matchedSoa.billingYear} ({matchedSoa.billingPeriod})</strong></p>
                <p className="text-stone-700 border-t pt-1.5 mt-1">Outstanding Balance: <strong className="text-amber-600 font-mono text-sm block">₱{matchedSoa.balance}</strong></p>
              </div>

              <div className="space-y-2 text-xs font-sans">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Manual OR Receipt Number</label>
                  <input
                    type="text"
                    placeholder="e.g. OR-2026-88001"
                    value={orNum}
                    onChange={(e) => setOrNum(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Payment Channel</label>
                  <select
                    value={payChannel}
                    onChange={(e: any) => setPayChannel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  >
                    <option value="Cash">Cash Currency</option>
                    <option value="Check">Check / Bank Draft</option>
                    <option value="Bank Transfer">Direct Bank Transfer</option>
                    <option value="LandBank LinkBiz">LandBank LinkBizPortal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Settlement Amount (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-sm p-1.5 font-mono font-bold text-emerald-600 text-sm"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-1.5 bg-[#059669] hover:bg-emerald-700 text-white font-bold rounded-sm text-xs transition flex justify-center gap-1.5 cursor-pointer"
                id="btn_finalize_payment"
              >
                <ClipboardCheck className="h-4 w-4" />
                Record payment & Print OR
              </button>
            </form>
          )}
        </div>

        {/* Right Col: Ledger logs payments */}
        <div className="lg:col-span-2 space-y-4">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 font-sans border-b pb-2 flex items-center gap-1.5">
            <Coins className="h-4.5 w-4.5 text-amber-500" />
            Official Receipts Master Record
          </h4>

          <div className="border border-slate-200/60 rounded-sm overflow-hidden" id="receipts_master_table">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                  <th className="py-1.5 px-3">OR Ticket Number</th>
                  <th className="py-1.5 px-3">Target Taxpayer</th>
                  <th className="py-1.5 px-3">Amount Settled</th>
                  <th className="py-1.5 px-3">Settlement Date</th>
                  <th className="py-1.5 px-3">Desk Cashier</th>
                  <th className="py-1.5 px-3">Status</th>
                  <th className="py-1.5 px-3 text-right">Reprint Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition opacity-95">
                    <td className="py-1.5 px-3 font-mono font-bold text-indigo-700">{r.orNumber}</td>
                    <td className="py-1.5 px-3 font-semibold text-slate-800 text-[11px]">{r.taxpayerName}</td>
                    <td className="py-1.5 px-3 font-mono font-bold text-emerald-600 text-[11px]">₱{r.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-1.5 px-3 font-mono text-slate-500 text-[11px]">{r.paymentDate.split("T")[0]}</td>
                    <td className="py-1.5 px-3 text-slate-500 text-[11px]">{r.cashierName}</td>
                    <td className="py-1.5 px-3">
                      <span className={`px-1 rounded-sm text-[8px] font-bold font-mono tracking-wide ${
                        r.status === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50" : "bg-red-50 text-red-650 border border-red-200"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-right">
                      <button
                        onClick={() => setActiveReceipt(r)}
                        className="py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold font-mono transition inline-flex items-center gap-1 cursor-pointer"
                        id={`btn_reprint_receipt_${r.id}`}
                      >
                        <Printer className="h-3 w-3" />
                        Reprint OR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Supervisor voiding gate dialog */}
      {showVoidDialog && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleVoidReceiptSubmit} className="bg-white rounded-2xl w-full max-w-md border shadow-2xl p-6 space-y-4">
            <div className="flex gap-3 border-b pb-3 items-center">
              <div className="p-2 bg-red-50 text-red-600 rounded">
                <AlertTriangle className="h-5 w-5 animate-bounce" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">VOID RECEIPT AUTHORIZATION GATE</h4>
                <p className="text-[10px] font-semibold text-slate-400 font-mono uppercase">Audited Action Roll</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs font-sans">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select OR to Void</label>
                <select
                  value={voidOrNum}
                  onChange={(e) => setVoidOrNum(e.target.value)}
                  className="w-full bg-slate-50 border p-2 rounded text-xs font-mono font-bold"
                  required
                >
                  <option value="">-- Choose active OR --</option>
                  {receipts.filter(o => o.status === "active").map(o => (
                    <option key={o.id} value={o.orNumber}>
                      OR {o.orNumber} • Amount: ₱{o.amount.toLocaleString()} ({o.taxpayerName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Supervisor Void Reason / Log</label>
                <textarea
                  placeholder="Explicitly identify posting mistake or bank reversal details..."
                  value={voidReasonText}
                  onChange={(e) => setVoidReasonText(e.target.value)}
                  className="w-full bg-slate-50 border p-2 rounded text-xs h-16 h-20 resize-none font-sans"
                  required
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setShowVoidDialog(false); setVoidOrNum(""); }}
                className="px-4 py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
              >
                Dismiss Guard
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white transition cursor-pointer"
              >
                Authorize Void
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Printable OR Receipt Modal Certificate */}
      {activeReceipt && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="or_reprint_modal">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto border shadow-2xl p-6">
            
            <div className="flex justify-between items-center border-b border-dashed pb-3 mb-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-sans tracking-widest flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Official Cashiers Ticket</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/document-templates/generate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          documentType: "Official Receipt",
                          sourceModule: "treasury",
                          sourceRecordId: activeReceipt.id
                        })
                      });
                      if (res.ok) {
                        const doc = await res.json();
                        alert(`Cryptographically sealed Official Receipt compiled successfully!\nSerial: ${doc.documentNumber}\n\nYou can access, print, and download this and other layout sheets in the 'Document Templates -> Generated Prints Log' panel.`);
                      } else {
                        const err = await res.json();
                        alert(`Compilation error: ${err.message || "Please verify that a default active 'Official Receipt' template exists in system settings."}`);
                      }
                    } catch (e) {
                      alert("Network error calling document render service.");
                    }
                  }}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-sans font-bold flex items-center gap-1 cursor-pointer transition"
                >
                  Compile OR PDF
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Print OR
                </button>
                <button
                  onClick={() => setActiveReceipt(null)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-bold text-slate-500 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Print Area Core */}
            <div className="border border-slate-300 p-5 rounded-lg space-y-4 font-mono text-[11px] text-slate-800 bg-white" id="printable_receipt_area">
              
              <div className="text-center space-y-1">
                <span className="block font-sans font-bold text-slate-400 leading-normal">MUNICIPAL TREASURY SYSTEM</span>
                <strong className="text-xs text-slate-900 block font-sans">PAETE TOWN HALL, LAGUNA</strong>
                <p className="text-[10px] text-slate-400 leading-normal">OFFICIAL RECEIPT RECORD</p>
                <div className="border-b border-dashed pt-2"></div>
              </div>

              <div className="space-y-1.5">
                <p className="flex justify-between">OR NUMBER: <strong className="float-right text-indigo-600 font-sans text-xs">{activeReceipt.orNumber}</strong></p>
                <p className="flex justify-between">PAY DATE: <strong className="float-right">{activeReceipt.paymentDate.split("T")[0]}</strong></p>
                <p className="flex justify-between">CASHIER DESK: <strong className="float-right text-slate-700 font-sans">{activeReceipt.cashierName}</strong></p>
                <p className="flex justify-between">STATUS: <strong className="float-right text-emerald-600 font-sans uppercase font-bold">{activeReceipt.status}</strong></p>
              </div>

              <div className="border-t border-b border-dashed py-3 space-y-1.5 font-sans">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">TAX PAYOR LEGAL ASSIGNMENT:</p>
                <strong className="text-slate-800 block text-xs">{activeReceipt.taxpayerName}</strong>
                <p className="text-slate-400 font-mono text-[10px] leading-relaxed pt-1.5">{activeReceipt.remarks}</p>
              </div>

              <div className="grid grid-cols-2 text-stone-900 bg-slate-50 p-3 border rounded text-xs items-center">
                <strong className="font-sans font-extrabold uppercase text-[10px]">TOTAL COLLECTED CASH:</strong>
                <strong className="text-right font-mono text-base text-emerald-600 font-black">
                  ₱{(activeReceipt.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </strong>
              </div>

              {activeReceipt.status === "voided" && (
                <div className="border border-red-200 bg-red-50 p-2.5 rounded text-red-700 text-[10px] space-y-1">
                  <p className="font-sans font-bold flex items-center gap-1"><Ban className="h-3.5 w-3.5 text-red-500" /> VOIDED TRANSACTION NOTICE</p>
                  <p className="italic leading-normal">Reason: {activeReceipt.voidReason || "Mistake in cashier entry sheet reversals."}</p>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* 2-Column Professional Master Cashier Posting Modal */}
      {isNewPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn" id="new_payment_posting_modal">
          <div className="bg-white rounded-2xl w-full max-w-4xl border border-slate-200 shadow-2xl p-6 md:p-8 space-y-6 max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4 animate-fadeIn">
              <div className="flex gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center border border-emerald-100">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold uppercase px-2 py-0.5 rounded-full font-mono">
                      Secure Settlement
                    </span>
                    <span className="text-[9px] bg-indigo-50 border border-indigo-200 text-indigo-800 font-extrabold uppercase px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                      <Wifi className="h-3 w-3 text-indigo-600 animate-pulse" /> Live connection
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-lg mt-1 font-sans">Treasury Counter Payment Settlement</h4>
                  <p className="text-xs text-slate-400 mt-0.5 font-sans">Reconcile Municipal Statement of Account (SOA) via cash, banking drafts or secure online networks.</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewPaymentModalOpen(false)}
                className="p-1 px-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
                id="btn_close_new_payment_modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4.5 w-4.5 text-red-500 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Input Form (7 cols) */}
              <div className="lg:col-span-12 xl:col-span-7 space-y-5">
                
                {/* 1. Select Outstanding SOA */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Step 1: Select Outstanding Statement of Account (SOA)
                  </label>
                  <select
                    value={modalSelectedSoaId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setModalSelectedSoaId(val);
                      setOnlineGatewayStatus("idle");
                      const found = soa.find(s => String(s.id) === val);
                      if (found) {
                        setModalAmountReceived(String(found.balance));
                        const nextOrNum = `OR-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
                        setModalOrNum(nextOrNum);
                      } else {
                        setModalAmountReceived("");
                        setModalOrNum("");
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  >
                    <option value="">-- Click to search or select unpaid billing records --</option>
                    {soa.filter(s => s.status !== "fully paid" && s.status !== "cancelled").map((s) => {
                      const tp = taxpayers.find(t => t.id === s.taxpayerId);
                      const tpName = tp ? (tp.type !== "individual" && tp.companyName ? tp.companyName : `${tp.lastName}, ${tp.firstName}`) : "Walk-in Citizen";
                      return (
                        <option key={s.id} value={s.id}>
                          {s.soaNumber} • Bal: ₱{s.balance.toLocaleString()} • {tpName} ({s.billingYear} {s.billingPeriod})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 2. Payment Channel Option Selector */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Step 2: Choose Payment & Settlement Method
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { value: "Cash", label: "Cash Desk", desc: "Currency bills" },
                      { value: "Check", label: "Bank Check", desc: "Corporate draft" },
                      { value: "Bank Transfer", label: "Direct Bank", desc: "Over the counter" },
                      { value: "LandBank LinkBiz", label: "LandBank", desc: "Online gateway", isOnline: true },
                      { value: "GCash", label: "GCash", desc: "Digital wallet", isOnline: true },
                      { value: "Maya", label: "Maya wallet", desc: "Digital wallet", isOnline: true },
                      { value: "eGovPay", label: "eGovPay State", desc: "Gov portal", isOnline: true }
                    ].map((chan) => {
                      const isSelected = modalPayChannel === chan.value;
                      return (
                        <button
                          type="button"
                          key={chan.value}
                          onClick={() => {
                            setModalPayChannel(chan.value as any);
                            setOnlineGatewayStatus("idle");
                          }}
                          className={`p-2.5 rounded-xl border text-left transition duration-200 cursor-pointer ${
                            isSelected 
                              ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black tracking-wide leading-tight">{chan.label}</span>
                            {chan.isOnline && (
                              <span className="bg-sky-500 text-[8px] text-white font-black uppercase px-1 rounded-xs scale-90">ONLINE</span>
                            )}
                          </div>
                          <span className="block text-[9px] opacity-65 leading-normal mt-0.5">{chan.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Fields Dependent on Payment Channel */}
                {modalSelectedSoaId && (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/50 space-y-4">
                    
                    {/* Common Amount to Pay Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mb-1 font-mono">Settlement Amount (₱) *</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={modalAmountReceived}
                          onChange={(e) => setModalAmountReceived(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-bold text-emerald-600 text-sm focus:outline-none"
                        />
                      </div>

                      {/* Display OR for standard payments */}
                      {!["LandBank LinkBiz", "GCash", "Maya", "eGovPay"].includes(modalPayChannel) && (
                        <div>
                          <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mb-1 font-mono">Official Receipt (OR) Number *</label>
                          <input
                            type="text"
                            required
                            value={modalOrNum}
                            onChange={(e) => setModalOrNum(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-black text-indigo-700 text-sm focus:outline-none"
                            placeholder="e.g. OR-2026-991223"
                          />
                        </div>
                      )}

                      {/* Cash Change Refund tool */}
                      {modalPayChannel === "Cash" && (
                        <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-3 mt-1.5">
                          <div>
                            <label className="block text-[9px] font-extrabold text-amber-600 uppercase tracking-widest mb-1">Cash Tendered by citizen (₱)</label>
                            <input
                              type="number"
                              placeholder="e.g. 5000"
                              value={modalCashPaid}
                              onChange={(e) => setModalCashPaid(e.target.value)}
                              className="w-full bg-amber-50/50 border border-amber-200 rounded-lg p-2 font-mono font-bold text-slate-800 text-xs focus:outline-none"
                            />
                          </div>
                          <div className="flex flex-col justify-center bg-slate-100 p-2 text-center rounded-lg">
                            <span className="block text-[8px] font-bold text-slate-400 uppercase font-mono">Cashier Refund Change</span>
                            <span className="block text-sm font-mono font-extrabold text-amber-700">
                              {parseFloat(modalCashPaid) >= parseFloat(modalAmountReceived)
                                ? `₱${(parseFloat(modalCashPaid) - parseFloat(modalAmountReceived)).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                : "₱0.00"
                              }
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Check Input Row */}
                    {modalPayChannel === "Check" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-3">
                        <div>
                          <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">Check Serial / Reference No.</label>
                          <input
                            type="text"
                            required
                            value={modalCheckNo}
                            onChange={(e) => setModalCheckNo(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono"
                            placeholder="e.g. CHK-99238120"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">Drawee Issuing Bank</label>
                          <input
                            type="text"
                            required
                            value={modalCheckBank}
                            onChange={(e) => setModalCheckBank(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs"
                            placeholder="e.g. LandBank Paete Branch"
                          />
                        </div>
                      </div>
                    )}

                    {/* Online Reference Row for digital triggers */}
                    {["LandBank LinkBiz", "GCash", "Maya", "eGovPay"].includes(modalPayChannel) && (
                      <div className="border-t pt-3 space-y-3">
                        <div className="flex justify-between items-center bg-sky-50 border border-sky-100 p-2.5 rounded-lg text-[11px] text-sky-950">
                          <p className="flex items-center gap-1.5 font-sans">
                            <Sparkles className="h-4 w-4 text-sky-600 shrink-0" />
                            <span>Digital gateway will dynamically post and wire real-time funds.</span>
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              const randomRef = `EPAY-${Math.floor(10000000 + Math.random() * 90000000)}`;
                              setModalOnlineRef(randomRef);
                            }}
                            className="text-[9px] font-bold text-sky-700 hover:underline bg-white px-2 py-1 rounded shadow-xs cursor-pointer border border-sky-200"
                          >
                            Regenerate Ref
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 font-mono">Online Redirection Reference</label>
                            <input
                              type="text"
                              required
                              value={modalOnlineRef}
                              onChange={(e) => setModalOnlineRef(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-xs font-bold text-indigo-8o0 text-indigo-700"
                              placeholder="e.g. EBX-2026-X8"
                            />
                          </div>
                          <div className="flex flex-col justify-end">
                            <span className="block text-[9px] text-slate-400 italic">Expected OR Generation</span>
                            <strong className="block text-xs font-mono text-slate-700 mt-0.5">
                              OR-ONL-{modalOnlineRef.slice(-7)}
                            </strong>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* Footer Controls based on Standard vs Digital Online */}
                {modalSelectedSoaId && (
                  <div className="border-t pt-4 flex gap-3 justify-end">
                    {["LandBank LinkBiz", "GCash", "Maya", "eGovPay"].includes(modalPayChannel) ? (
                      <button
                        type="button"
                        disabled={onlineGatewayStatus !== "idle" && onlineGatewayStatus !== "success"}
                        onClick={handleSimulateOnlinePayment}
                        className={`px-5 py-3 rounded-lg text-xs font-bold text-white transition flex items-center gap-2 cursor-pointer shadow-lg w-full justify-center ${
                          modalPayChannel === "GCash" ? "bg-indigo-600 hover:bg-indigo-700 border-indigo-800" :
                          modalPayChannel === "Maya" ? "bg-emerald-600 hover:bg-emerald-700 border-emerald-800" :
                          modalPayChannel === "LandBank" ? "bg-emerald-700 hover:bg-emerald-800" : "bg-sky-600 hover:bg-sky-700"
                        }`}
                        id="btn_online_gateway_submit"
                      >
                        <Globe className="h-4 w-4 animate-pulse shrink-0" />
                        Initialize Quick QR & Gateway Redirect for Payment Clearing
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleModalSubmit}
                        disabled={isProcessingModalPayment}
                        className="px-6 py-3 bg-emerald-600 hover:bg-[#047857] text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md w-full"
                        id="btn_cashier_post_manual"
                      >
                        <ClipboardCheck className="h-4.5 w-4.5" />
                        {isProcessingModalPayment ? "Generating Official Document..." : "Authorize Cashier POST & Generate OR Printer Screen"}
                      </button>
                    )}
                  </div>
                )}

              </div>
              
              {/* Right Column: Matched SOA Ledger Details Reviewer (5 cols) */}
              <div className="lg:col-span-12 xl:col-span-5 bg-slate-50 rounded-2xl p-4 border border-slate-205 flex flex-col justify-between max-h-[60vh] xl:max-h-[75vh]">
                <div className="space-y-4 overflow-y-auto">
                  <div className="border-b border-slate-205/60 pb-2.5 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-emerald-600" />
                      SOA Ledger Audit Details
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">Real-time Fetch</span>
                  </div>

                  {modalSelectedSoaId ? (() => {
                    const found = soa.find(s => String(s.id) === modalSelectedSoaId);
                    if (!found) return null;

                    const tp = taxpayers.find(t => t.id === found.taxpayerId);
                    const prop = properties.find(p => p.id === found.propertyId);

                    return (
                      <div className="space-y-4 text-xs font-sans">
                        
                        {/* Taxpayer Card info */}
                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Assigned Estate Holder</span>
                          {tp ? (
                            <div className="bg-white p-2.5 border rounded-lg border-slate-200/50">
                              <p className="font-extrabold text-slate-800">
                                {tp.type !== "individual" && tp.companyName ? tp.companyName : `${tp.lastName}, ${tp.firstName} ${tp.middleName || ""}`}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {tp.code || `TP-${tp.id}`}</p>
                              <p className="text-[10px] text-slate-500 font-sans italic leading-tight mt-1 truncate">{tp.address || "Paete, Laguna"}</p>
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">No direct profile linked to billing record.</p>
                          )}
                        </div>

                        {/* Property Parcel Details */}
                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Parcel Assignment Asset</span>
                          {prop ? (
                            <div className="bg-white p-2.5 border rounded-lg border-slate-200/50 text-[11px] space-y-1">
                              <p className="flex justify-between"><span className="text-slate-400 font-semibold">Location PIN:</span> <strong className="font-mono text-indigo-700">{prop.pin}</strong></p>
                              <p className="flex justify-between"><span className="text-slate-400">Parcel Kind:</span> <strong className="capitalize text-slate-700">{prop.kind || "Land"}</strong></p>
                              <p className="flex justify-between"><span className="text-slate-400">Classification:</span> <strong className="capitalize text-slate-700">{prop.classification || "Agricultural"}</strong></p>
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">No asset parcel mapping found.</p>
                          )}
                        </div>

                        {/* Financial Ledger breakdown */}
                        <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-200">
                          <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest block border-b pb-1 mb-2">Billing coverage Ledger</span>
                          
                          <div className="space-y-1 font-mono text-[11px] text-slate-600">
                            <p className="flex justify-between"><span>Assessed Base:</span> <strong className="text-slate-800">₱{found.assessedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></p>
                            <p className="flex justify-between text-blue-600"><span>Basic RPT Due:</span> <span>₱{found.basicRptAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
                            <p className="flex justify-between text-indigo-600"><span>SEF Support Fund:</span> <span>₱{found.sefAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
                            <p className="flex justify-between text-amber-600"><span>Penalty Accrued:</span> <span>₱{(found.penaltyAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
                            <p className="flex justify-between text-red-550"><span>Discounts Granted:</span> <span>-₱{(found.discountAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
                            <div className="border-t border-dashed my-2"></div>
                            <p className="flex justify-between text-xs font-bold text-slate-900 font-sans"><span>Net Outstanding:</span> <strong className="font-mono text-emerald-600 text-sm">₱{found.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></p>
                          </div>
                        </div>

                      </div>
                    );
                  })() : (
                    <div className="h-48 flex flex-col justify-center items-center text-slate-400 space-y-2">
                      <HelpCircle className="h-10 w-10 opacity-40 text-slate-300" />
                      <p className="text-center font-semibold text-[11px]">Select a Statement of Account on step 1 to view live billing calculations and taxpayer registers.</p>
                    </div>
                  )}

                </div>

                {/* Secure Gateway Animation Console log */}
                {onlineGatewayStatus !== "idle" && (
                  <div className="bg-slate-950 text-[10px] text-neutral-300 font-mono p-3 rounded-lg tracking-wide shrink-0 space-y-2 border border-slate-800 animate-fadeIn mt-4 select-none">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 text-slate-400">
                      <span className="flex items-center gap-1"><Activity className="h-3 w-3 text-sky-500 animate-ping" /> GATEWAY LOGGING</span>
                      <span>Progress: {gatewayProgress}%</span>
                    </div>
                    
                    <div className="space-y-1 max-h-24 overflow-y-auto font-mono text-[9px] leading-tight">
                      {onlineLogs.map((log, index) => (
                        <p key={index} className="text-emerald-400">{log}</p>
                      ))}
                    </div>

                    <div className="w-full bg-slate-850 h-1 rounded-full overflow-hidden mt-1 bg-slate-800">
                      <div className="h-full bg-sky-500 transition-all duration-300" style={{ width: `${gatewayProgress}%` }}></div>
                    </div>
                  </div>
                )}

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
