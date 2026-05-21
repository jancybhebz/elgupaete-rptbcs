import React, { useState } from "react";
import { User, SoaRecord, Payment, OfficialReceipt } from "../types";
import { Search, Plus, CreditCard, ShieldCheck, Printer, AlertTriangle, Coins, Ban, ClipboardCheck } from "lucide-react";

interface TreasuryPanelProps {
  soa: SoaRecord[];
  payments: Payment[];
  receipts: OfficialReceipt[];
  currentUser: User | null;
  onRefresh: () => void;
}

export default function TreasuryPanel({
  soa,
  payments,
  receipts,
  currentUser,
  onRefresh
}: TreasuryPanelProps) {
  const [soaQuery, setSoaQuery] = useState("");
  const [matchedSoa, setMatchedSoa] = useState<SoaRecord | null>(null);
  
  // Post Payment Form States
  const [orNum, setOrNum] = useState("");
  const [payChannel, setPayChannel] = useState<"Cash" | "Check" | "Bank Transfer" | "LandBank LinkBiz" | "GCash" | "Maya" | "eGovPay">("Cash");
  const [amountReceived, setAmountReceived] = useState("");
  
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

    </div>
  );
}
