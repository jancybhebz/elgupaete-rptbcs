import React, { useState, useEffect } from "react";
import { User, Property, Taxpayer, SoaRecord } from "../types";
import { Search, Plus, Receipt, ShieldCheck, Printer, CheckCircle, Scale, Coins, QrCode } from "lucide-react";

interface BillingPanelProps {
  properties: Property[];
  taxpayers: Taxpayer[];
  soa: SoaRecord[];
  currentUser: User | null;
  onRefresh: () => void;
}

export default function BillingPanel({
  properties,
  taxpayers,
  soa,
  currentUser,
  onRefresh
}: BillingPanelProps) {
  const [selectedPropId, setSelectedPropId] = useState("");
  const [calcYear, setCalcYear] = useState("2026");
  const [calcPeriod, setCalcPeriod] = useState<"annual" | "q1" | "q2" | "q3" | "q4">("annual");
  const [computedResults, setComputedResults] = useState<any | null>(null);
  
  const [selectedSoa, setSelectedSoa] = useState<SoaRecord | null>(null);
  const [loading, setLoading] = useState(false);

  // Re-run tax projection computation on state changes
  useEffect(() => {
    if (!selectedPropId) {
      setComputedResults(null);
      return;
    }
    const fetchProjection = async () => {
      try {
        const response = await fetch("/api/soa/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId: selectedPropId,
            year: parseInt(calcYear),
            billingPeriod: calcPeriod
          })
        });
        if (response.ok) {
          const data = await response.json();
          setComputedResults(data);
        } else {
          setComputedResults(null);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchProjection();
  }, [selectedPropId, calcYear, calcPeriod]);

  const handleIssueSoa = async () => {
    if (!selectedPropId || !computedResults) return;
    setLoading(true);

    const prop = properties.find(p => p.id === parseInt(selectedPropId));
    if (!prop) return;

    try {
      const response = await fetch("/api/soa/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taxpayerId: prop.ownerId,
          propertyId: prop.id,
          billingYear: computedResults.billingYear,
          billingPeriod: computedResults.billingPeriod,
          assessedValue: computedResults.assessedValue,
          basicRptAmount: computedResults.basicRptAmount,
          sefAmount: computedResults.sefAmount,
          penaltyAmount: computedResults.penaltyAmount,
          discountAmount: computedResults.discountAmount,
          totalDue: computedResults.totalDue,
          dueDate: computedResults.dueDate
        })
      });
      if (response.ok) {
        setSelectedPropId("");
        setComputedResults(null);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-sm space-y-3" id="billing_panel_root">
      
      {/* Visual top block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-50 p-2.5 rounded-sm border border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-900 font-sans">Municipal Billing & Statements (SOA)</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Perform live municipal tax projections, calculate interest penalties or prompt discounts, and issue Statements of Account (SOA).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3" id="billing_workspace">
        
        {/* Left column: Calc Form & Projection Output */}
        <div className="lg:col-span-1 bg-slate-50/50 p-3 rounded-sm border border-slate-205 space-y-3 border-slate-200">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 font-sans border-b pb-2">Calculate Tax Projections</h4>
          
          <div className="space-y-3 text-xs font-sans">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Target Cadastral Property</label>
              <select
                value={selectedPropId}
                onChange={(e) => setSelectedPropId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-sm p-1.5 font-sans"
              >
                <option value="">-- Choose Mapped Parcel --</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>
                    PIN {p.pin} • owner: {p.ownerName} ({p.classification})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tax Year Target</label>
                <select
                  value={calcYear}
                  onChange={(e) => setCalcYear(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-sm p-1.5 font-mono"
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025 (Arrears)</option>
                  <option value="2024">2024 (Arrears)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Billing Span</label>
                <select
                  value={calcPeriod}
                  onChange={(e: any) => setCalcPeriod(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-sm p-1.5"
                >
                  <option value="annual">Annual Complete</option>
                  <option value="q1">Q1 (Jan - Mar)</option>
                  <option value="q2">Q2 (Apr - Jun)</option>
                  <option value="q3">Q3 (Jul - Sep)</option>
                  <option value="q4">Q4 (Oct - Dec)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Computed Output */}
          {computedResults && (
            <div className="bg-white border rounded-sm p-3 space-y-2 shadow-inner" id="projection_output">
              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#059669] flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" />
                Live Oracle Projections
              </span>

              <div className="space-y-1.5 text-xs text-slate-600 border-b border-dashed pb-2.5">
                <p className="flex justify-between font-sans">
                  <span>Assessed Taxable Estate:</span>
                  <strong className="text-slate-800 font-mono">₱{computedResults.assessedValue.toLocaleString()}</strong>
                </p>
                <p className="flex justify-between">
                  <span>Basic RPT (1.0%):</span>
                  <strong className="text-slate-800 font-mono">₱{computedResults.basicRptAmount.toLocaleString()}</strong>
                </p>
                <p className="flex justify-between">
                  <span>SEF Fund (1.0%):</span>
                  <strong className="text-slate-800 font-mono">₱{computedResults.sefAmount.toLocaleString()}</strong>
                </p>
                {computedResults.discountAmount > 0 && (
                  <p className="flex justify-between text-green-600">
                    <span>Prompt Discount (10%):</span>
                    <strong className="font-mono">-(₱{computedResults.discountAmount.toLocaleString()})</strong>
                  </p>
                )}
                {computedResults.penaltyAmount > 0 && (
                  <p className="flex justify-between text-red-600 font-semibold font-sans">
                    <span>Delinquency penalty:</span>
                    <strong className="font-mono text-red-500">+(₱{computedResults.penaltyAmount.toLocaleString()})</strong>
                  </p>
                )}
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded border">
                <span className="font-bold text-[10px] uppercase text-slate-500">Total Certified Due:</span>
                <strong className="text-base text-slate-800 font-mono">
                  ₱{computedResults.totalDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>

              {currentUser?.role !== "Report Viewer" && currentUser?.role !== "Auditor / Read-only User" && currentUser?.role !== "Assessor Staff" && (
                <button
                  type="button"
                  onClick={handleIssueSoa}
                  disabled={loading}
                  className="w-full py-1.5 bg-[#d97706] hover:bg-[#b45309] text-white rounded-sm text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  id="btn_issue_soa"
                >
                  <Receipt className="h-4 w-4" />
                  {loading ? "Filing..." : "File Official SOA"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right column: Issued SOAs List */}
        <div className="lg:col-span-2 space-y-4">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 font-sans border-b pb-2 flex items-center gap-1">
            <Coins className="h-4 w-4" />
            Issued Statements of Account (SOAs)
          </h4>

          <div className="border border-slate-200/60 rounded-sm overflow-hidden" id="issued_soa_table">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                  <th className="py-1.5 px-3">SOA Code</th>
                  <th className="py-1.5 px-3">Year/Span</th>
                  <th className="py-1.5 px-3">Tax Base</th>
                  <th className="py-1.5 px-3">Total Due</th>
                  <th className="py-1.5 px-3">Balance Due</th>
                  <th className="py-1.5 px-3">Status</th>
                  <th className="py-1.5 px-3 text-right">Certificate preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {soa.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition opacity-95">
                    <td className="py-1.5 px-3 font-mono font-bold text-slate-900">{s.soaNumber}</td>
                    <td className="py-1.5 px-3 font-mono text-[11px]">
                      {s.billingYear} <span className="text-[9px] text-slate-400 font-sans">({s.billingPeriod})</span>
                    </td>
                    <td className="py-1.5 px-3 font-mono text-[11px]">₱{s.assessedValue.toLocaleString()}</td>
                    <td className="py-1.5 px-3 font-mono text-[11px]">₱{s.totalDue.toLocaleString()}</td>
                    <td className="py-1.5 px-3 font-mono font-semibold text-red-655 text-red-600">
                      ₱{s.balance.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-3">
                      <span className={`px-1 py-0.2 rounded-sm text-[8px] font-bold uppercase tracking-wide font-mono ${
                        s.status === "fully paid" ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50" : "bg-amber-50 text-amber-700 border border-amber-200/50 animate-none"
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedSoa(s)}
                        className="py-0.5 px-1.5 rounded-sm bg-slate-800 hover:bg-slate-705 text-slate-300 hover:text-white text-[10px] font-bold font-mono transition inline-flex items-center gap-1 cursor-pointer"
                        id={`btn_print_view_soa_${s.id}`}
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Preview Draft
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Printable SOA Modal Certificate */}
      {selectedSoa && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="soa_printer_modal">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto border shadow-2xl p-6">
            
            <div className="flex justify-between items-center border-b border-dashed pb-3 mb-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-sans tracking-widest flex items-center gap-1.5"><Scale className="h-4 w-4" /> Official Municipal Billing Ticket</span>
              <div className="flex gap-1">
                <button
                  onClick={() => window.print()}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                <button
                  onClick={() => setSelectedSoa(null)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-bold text-slate-500 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Print Area Core */}
            <div className="border border-slate-300 p-6 rounded-xl space-y-6 font-sans text-xs text-slate-800 bg-white" id="printable_area">
              
              {/* Header */}
              <div className="text-center space-y-1">
                <h4 className="font-bold text-slate-800 text-sm">REPUBLIC OF THE PHILIPPINES</h4>
                <h3 className="font-extrabold text-slate-900 text-base">LOCAL GOVERNMENT UNIT OF PAETE</h3>
                <p className="text-[11px] text-slate-500 font-medium">PROVINCE OF LAGUNA • OFFICE OF THE MUNICIPAL TREASURER</p>
                <div className="border-b-2 border-double border-slate-400 pt-2.5"></div>
              </div>

              {/* SOA Title */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-slate-950 text-base">REAL PROPERTY TAX SOA</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Statement of Account Certificate</p>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-slate-400 font-bold font-mono">STATEMENT CODENAME:</span>
                  <strong className="text-orange-600 font-mono text-base font-black">{selectedSoa.soaNumber}</strong>
                </div>
              </div>

              {/* Parcel & Owner summary metadata */}
              <div className="grid grid-cols-2 gap-4 border border-slate-200/55 p-3 rounded bg-slate-50/50">
                <div className="space-y-1.5 list-none">
                  <li>Owner ID: <strong className="float-right text-slate-900 font-mono">{selectedSoa.taxpayerId}</strong></li>
                  <li>Billing Year: <strong className="float-right text-slate-900 font-mono">{selectedSoa.billingYear}</strong></li>
                  <li>Coverage Range: <strong className="float-right text-slate-900 uppercase">{selectedSoa.billingPeriod}</strong></li>
                </div>
                <div className="space-y-1.5 list-none border-l pl-4 font-sans">
                  <li>Property PIN: <strong className="float-right text-slate-900 font-mono">{selectedSoa.propertyId}</strong></li>
                  <li>Assessed Base Value: <strong className="float-right text-slate-900 font-mono">₱{(selectedSoa.assessedValue).toLocaleString()}</strong></li>
                  <li>Overdue Due Date: <strong className="float-right text-slate-900 font-mono">{selectedSoa.dueDate}</strong></li>
                </div>
              </div>

              {/* Taxation details structure */}
              <div className="space-y-2">
                <div className="grid grid-cols-3 text-[10px] font-black text-slate-400 uppercase tracking-wide border-b border-slate-150 pb-1">
                  <span>TAX COMPONENT</span>
                  <span className="text-center">PERCENT RATE</span>
                  <span className="text-right">CALCULATED VALUE (₱)</span>
                </div>
                <div className="space-y-2 border-b border-slate-100 pb-2">
                  <div className="grid grid-cols-3 font-medium">
                    <span>Basic Real Property Tax (RPT)</span>
                    <span className="text-center font-mono">1.0%</span>
                    <span className="text-right font-mono">₱{(selectedSoa.basicRptAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="grid grid-cols-3 font-medium">
                    <span>Special Education Fund (SEF)</span>
                    <span className="text-center font-mono">1.0%</span>
                    <span className="text-right font-mono">₱{(selectedSoa.sefAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Penalties or discounts additions */}
                <div className="space-y-1.5 border-b border-slate-100 pb-2">
                  <div className="grid grid-cols-2 text-red-600">
                    <span>Accrued Interest Penalties due to Delay</span>
                    <strong className="text-right font-mono">+(₱{(selectedSoa.penaltyAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })})</strong>
                  </div>
                  <div className="grid grid-cols-2 text-[#059669]">
                    <span>Prompts Discount deductions applied</span>
                    <strong className="text-right font-mono">-(₱{(selectedSoa.discountAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })})</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 text-stone-900 bg-stone-100 p-2 border border-slate-150 rounded items-center">
                  <strong className="font-extrabold uppercase text-[10px]">TOTAL ANNUAL DUES CERTIFIED:</strong>
                  <strong className="text-right font-mono text-base text-slate-950">
                    ₱{(selectedSoa.totalDue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div className="grid grid-cols-2 text-[#059669] p-2 bg-green-50 border border-green-100 rounded text-[11px] items-center">
                  <span className="font-semibold text-emerald-800">Payments recorded to date:</span>
                  <strong className="text-right font-mono">
                    ₱{selectedSoa.amountPaid.toLocaleString()}
                  </strong>
                </div>
              </div>

              {/* Bottom verify QR segment */}
              <div className="flex justify-between items-center bg-slate-50 p-4 border border-slate-200/60 rounded">
                <div className="space-y-1 max-w-[340px]">
                  <strong className="text-[#059669] flex items-center gap-1 text-[11px] font-sans font-bold uppercase">
                    <ShieldCheck className="h-4.5 w-4.5 shrink-0" />
                    Online Verification Secured
                  </strong>
                  <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
                    This billing contains a secure cryptographic token sequence. Test and verify authenticity on LGU public terminals.
                  </p>
                  <p className="font-mono text-[10px] text-slate-700 bg-white border px-2 py-0.5 rounded w-fit select-all">
                    Verifier Tag: {selectedSoa.verificationCode}
                  </p>
                </div>
                {/* Visual QR Code placeholder as requested */}
                <div className="p-1 px-1.5 bg-white border border-slate-200 rounded flex flex-col items-center justify-center shrink-0">
                  <QrCode className="h-12 w-12 text-slate-800" />
                  <span className="font-mono text-[8px] mt-1 text-slate-400 uppercase">SCAN OR MATCH</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
