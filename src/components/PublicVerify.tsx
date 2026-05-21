import React, { useState } from "react";
import { Search, CheckCircle2, AlertTriangle, ShieldCheck, ArrowLeft, Landmark } from "lucide-react";

interface VerificationResult {
  verified: boolean;
  documentType?: string;
  referenceNumber?: string;
  taxpayerMaskedName?: string;
  assessedValue?: number;
  totalAmount?: number;
  issueDate?: string;
  status?: string;
  verificationResult?: string;
  message?: string;
}

interface PublicVerifyProps {
  onBack?: () => void;
  initialCode?: string;
}

export default function PublicVerify({ onBack, initialCode = "" }: PublicVerifyProps) {
  const [code, setCode] = useState(initialCode);
  const [docType, setDocType] = useState<"soa" | "or">("soa");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`/api/public/verify/${docType}/${code.trim()}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "No matching official document found in the municipal records.");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError("Unable to connect to the LGU Paete verification servers. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between" id="public_verify_root">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-sans text-lg font-semibold text-slate-100">LGU Paete, Laguna</h1>
              <p className="font-mono text-[10px] uppercase text-amber-500 tracking-wider">Public Verification Portal</p>
            </div>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition text-sm font-medium text-slate-300"
              id="back_to_internal_portal"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Portal
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow p-6 flex flex-col items-center justify-center max-w-4xl w-full mx-auto">
        <div className="w-full max-w-xl bg-slate-950/80 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-2xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-white">Trust & Verification System</h2>
            <p className="text-sm text-slate-400 mt-2">
              Verify the authenticity of Real Property Tax Statements of Account (SOA) and Official Receipts (OR) issued by Paete Municipality.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => { setDocType("soa"); setResult(null); setError(""); }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  docType === "soa" ? "bg-amber-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                }`}
                id="select_soa_verify"
              >
                Statement of Account (SOA)
              </button>
              <button
                type="button"
                onClick={() => { setDocType("or"); setResult(null); setError(""); }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  docType === "or" ? "bg-amber-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                }`}
                id="select_or_verify"
              >
                Official Treasury Receipt (OR)
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder={docType === "soa" ? "Enter SOA Number (e.g. SOA-2026-000001)" : "Enter OR Number (e.g. OR-2026-77881)"}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-sm transition-all"
                id="verification_input"
                required
              />
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 text-white font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm cursor-pointer"
              id="submit_verification"
            >
              {loading ? "Verifying Record..." : "Authenticate Document"}
            </button>
          </form>

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 rounded-xl bg-red-950/40 border border-red-900/60 text-red-400 flex gap-3 text-sm mr-auto" id="verify_error_box">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Verification Alert</p>
                <p className="mt-1 text-xs opacity-90">{error}</p>
              </div>
            </div>
          )}

          {/* Output Information Sheet */}
          {result && result.verified && (
            <div className="mt-6 rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-5 space-y-4" id="verify_success_box">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-7 w-7 text-emerald-400" />
                <div>
                  <p className="text-emerald-400 font-bold uppercase tracking-wider text-xs">Authenticity Guaranteed</p>
                  <p className="text-slate-100 font-bold text-lg font-mono">{result.referenceNumber}</p>
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-4 space-y-3 font-sans">
                <div className="grid grid-cols-2 text-xs">
                  <span className="text-slate-400 font-medium">Document Classification:</span>
                  <span className="text-slate-200 font-semibold text-right">{result.documentType}</span>
                </div>
                <div className="grid grid-cols-2 text-xs">
                  <span className="text-slate-400 font-medium">Target Taxpayer:</span>
                  <span className="text-slate-200 font-semibold font-mono text-right">{result.taxpayerMaskedName}</span>
                </div>
                {result.assessedValue !== undefined && (
                  <div className="grid grid-cols-2 text-xs">
                    <span className="text-slate-400 font-medium">Assessed Estate Value:</span>
                    <span className="text-slate-200 font-semibold text-right">
                      ₱{(result.assessedValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-2 text-xs">
                  <span className="text-slate-400 font-medium">Certified Amount:</span>
                  <span className="text-emerald-400 font-bold text-lg text-right font-mono">
                    ₱{(result.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="grid grid-cols-2 text-xs">
                  <span className="text-slate-400 font-medium">Official Date of Record:</span>
                  <span className="text-slate-200 font-semibold text-right font-mono">{result.issueDate}</span>
                </div>
                <div className="grid grid-cols-2 text-xs items-center">
                  <span className="text-slate-400 font-medium">Treasury Status:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] w-fit font-bold font-mono ml-auto uppercase ${
                    result.status === "fully paid" || result.status === "VALID & ISSUED"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}>
                    {result.status}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-emerald-950 border border-emerald-800 rounded-lg text-slate-300 font-sans text-xs">
                <p className="font-semibold text-slate-100 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Paete LGU Oracle Match
                </p>
                <p className="mt-1 text-slate-300 leading-normal font-mono text-[11px]">
                  {result.verificationResult}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 p-4 text-center">
        <p className="text-[11px] text-slate-500 leading-relaxed max-w-lg mx-auto font-sans">
          This system uses SHA-256 secure verification mappings and is audited yearly by the Commission on Audit (COA).
          For further inquiries, contact the Treasury Support Desk at Paete Town Hall, Laguna.
        </p>
      </footer>
    </div>
  );
}
