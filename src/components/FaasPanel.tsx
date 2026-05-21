import React, { useState } from "react";
import { User, FaaSRecord, Property, Taxpayer, TaxDeclaration } from "../types";
import { Plus, Check, FileCheck, Landmark, Coins, AlertCircle, FileSpreadsheet, ListCheck, BadgeCheck } from "lucide-react";

interface FaasPanelProps {
  faas: FaaSRecord[];
  properties: Property[];
  taxpayers: Taxpayer[];
  declarations: TaxDeclaration[];
  currentUser: User | null;
  onRefresh: () => void;
}

export default function FaasPanel({
  faas,
  properties,
  taxpayers,
  declarations,
  currentUser,
  onRefresh
}: FaasPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<"faas" | "tds">("faas");
  const [isCreatingFaas, setIsCreatingFaas] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Form states 
  const [formData, setFormData] = useState({
    propertyId: "",
    taxpayerId: "",
    effectivityYear: "2026",
    revisionYear: "2024",
    fairMarketValue: "",
    assessmentLevel: "20" // e.g. 20%
  });

  const handleCreateFaas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.propertyId || !formData.taxpayerId || !formData.fairMarketValue) return;

    try {
      const response = await fetch("/api/faas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        setIsCreatingFaas(false);
        setFormData({
          propertyId: "",
          taxpayerId: "",
          effectivityYear: "2026",
          revisionYear: "2024",
          fairMarketValue: "",
          assessmentLevel: "20"
        });
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveFaas = async (faasId: number) => {
    try {
      const response = await fetch(`/api/faas/${faasId}/approve`, {
        method: "POST"
      });
      if (response.ok) {
        onRefresh();
      } else {
        const data = await response.json();
        alert(data.message || "Failed to approve assessment sheet");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const calculateAssessed = () => {
    const fmv = parseFloat(formData.fairMarketValue) || 0;
    const rate = parseFloat(formData.assessmentLevel) || 0;
    return (fmv * (rate / 100)).toFixed(2);
  };

  // Filters
  const filteredFaas = faas.filter(f => {
    const term = searchTerm.toLowerCase();
    return f.faasNumber.toLowerCase().includes(term);
  });

  const filteredTd = declarations.filter(t => {
    const term = searchTerm.toLowerCase();
    return t.tdn.toLowerCase().includes(term) || t.ownerName.toLowerCase().includes(term);
  });

  return (
    <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-sm space-y-3" id="faas_panel_root">
      
      {/* Banner descriptor */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-50 p-2.5 rounded-sm border border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-900 font-sans">Appraisals & Tax Declarations Office</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Define Fair Market Values, appraisal levels, and approve municipal Tax Declaration (TDN) records.</p>
        </div>
        <div className="grid grid-cols-2 p-0.5 bg-slate-200 rounded-sm text-xs font-semibold">
          <button
            onClick={() => { setActiveSubTab("faas"); setSearchTerm(""); }}
            className={`py-1 px-2.5 rounded-sm transition text-[11px] ${activeSubTab === "faas" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
          >
            FAAS Appraisals
          </button>
          <button
            onClick={() => { setActiveSubTab("tds"); setSearchTerm(""); }}
            className={`py-1 px-2.5 rounded-sm transition text-[11px] ${activeSubTab === "tds" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
          >
            Tax Declarations
          </button>
        </div>
      </div>

      {activeSubTab === "faas" ? (
        <>
          {/* FAAS Appraisals Section */}
          <div className="flex justify-between items-center bg-slate-55 border-b pb-2 mb-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 font-sans flex items-center gap-1.5">
              <FileSpreadsheet className="h-4 w-4 text-blue-500" />
              Field Appraisal Sheets
            </h4>
            {currentUser?.role !== "Report Viewer" && currentUser?.role !== "Auditor / Read-only User" && currentUser?.role !== "Treasury Cashier" && (
              <button
                onClick={() => setIsCreatingFaas(true)}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-sm text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                id="btn_new_faas"
              >
                <Plus className="h-4 w-4" />
                Draft Appraisal
              </button>
            )}
          </div>

          {isCreatingFaas ? (
            <form onSubmit={handleCreateFaas} className="border border-slate-200 p-5 rounded-xl space-y-4" id="faas_creation_form">
              <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">Draft Field Appraisals Sheet (FAAS)</h5>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Target Property (Cadastral Reference)</label>
                  <select
                    value={formData.propertyId}
                    onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-sans"
                    required
                  >
                    <option value="">-- Choose Parcel Target --</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>
                        PIN {p.pin} • owner: {p.ownerName} ({p.classification})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Consolidated Taxpayer</label>
                  <select
                    value={formData.taxpayerId}
                    onChange={(e) => setFormData({ ...formData, taxpayerId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-sans"
                    required
                  >
                    <option value="">-- Choose Target Taxpayer --</option>
                    {taxpayers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.type === "individual" ? `${t.lastName}, ${t.firstName} (${t.code})` : `${t.companyName} (${t.code})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Revision Year</label>
                  <input
                    type="number"
                    value={formData.revisionYear}
                    onChange={(e) => setFormData({ ...formData, revisionYear: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Effectivity Year</label>
                  <input
                    type="number"
                    value={formData.effectivityYear}
                    onChange={(e) => setFormData({ ...formData, effectivityYear: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Fair Market Value (₱)</label>
                  <input
                    type="number"
                    placeholder="e.g. 500000"
                    value={formData.fairMarketValue}
                    onChange={(e) => setFormData({ ...formData, fairMarketValue: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Assessment Level (%)</label>
                  <select
                    value={formData.assessmentLevel}
                    onChange={(e) => setFormData({ ...formData, assessmentLevel: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-sans"
                    required
                  >
                    <option value="20">Residential Land (20%)</option>
                    <option value="30">Commercial Land (30%)</option>
                    <option value="40">Agricultural structures (40%)</option>
                    <option value="50">industrial facilities (50%)</option>
                    <option value="10">Special classification (10%)</option>
                  </select>
                </div>
              </div>

              {/* LIVE CALCULATION COMPONENT */}
              <div className="p-4 rounded-xl bg-orange-50 border border-orange-200/55 text-xs text-orange-900 grid grid-cols-2 gap-2" id="assessment_preview">
                <div>
                  <span className="block text-orange-600 font-sans font-semibold text-[10px] uppercase">Fair Market Base Rate:</span>
                  <strong className="font-mono text-sm">₱{(parseFloat(formData.fairMarketValue) || 0).toLocaleString()}</strong>
                </div>
                <div>
                  <span className="block text-orange-600 font-sans font-semibold text-[10px] uppercase">Computed Assessed Estate (Taxable Margin):</span>
                  <strong className="font-mono text-sm text-green-700">₱{parseFloat(calculateAssessed()).toLocaleString()}</strong>
                </div>
              </div>

              <div className="flex justify-end gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setIsCreatingFaas(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition flex items-center gap-1 cursor-pointer"
                >
                  Save Drafting
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* FAAS Appraisals Lists */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search FAAS records by assessment sheet number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-7 pr-3 py-1 border border-slate-200 rounded-sm text-xs focus:outline-none focus:border-amber-505 font-mono"
                  id="search_faas"
                />
                <Plus className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 rotate-45" />
              </div>

              <div className="border border-slate-200/60 rounded-sm overflow-hidden" id="faas_grid_assembly">
                <table className="w-full text-left border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                      <th className="py-1.5 px-3">FAAS No. (Index)</th>
                      <th className="py-1.5 px-3">Revision Year</th>
                      <th className="py-1.5 px-3">Fair Market Value</th>
                      <th className="py-1.5 px-3">Level</th>
                      <th className="py-1.5 px-3">Assessed Value</th>
                      <th className="py-1.5 px-3">Staff Appraiser</th>
                      <th className="py-1.5 px-3">Status</th>
                      <th className="py-1.5 px-3 text-right flex justify-end mr-1">Assessor Commands</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredFaas.map(f => (
                      <tr key={f.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-1.5 px-3 font-mono font-bold text-slate-900">{f.faasNumber}</td>
                        <td className="py-1.5 px-3 font-mono text-[11px]">
                          {f.revisionYear} <span className="text-[9px] text-slate-400 font-sans">({f.effectivityYear} eff)</span>
                        </td>
                        <td className="py-1.5 px-3 font-mono">₱{f.fairMarketValue.toLocaleString()}</td>
                        <td className="py-1.5 px-3 font-mono font-semibold text-slate-500">{f.assessmentLevel}%</td>
                        <td className="py-1.5 px-3 font-mono font-extrabold text-slate-800">₱{f.assessedValue.toLocaleString()}</td>
                        <td className="py-1.5 px-3 font-medium text-slate-500">{f.appraisedBy}</td>
                        <td className="py-1.5 px-3">
                          <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold font-mono tracking-wide ${
                            f.status === "approved" 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50" 
                              : "bg-slate-100 text-slate-600 border border-slate-200 animate-pulse"
                          }`}>
                            {f.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          {f.status === "draft" && (currentUser?.role === "System Administrator" || currentUser?.role === "Municipal Assessor") ? (
                            <button
                              onClick={() => handleApproveFaas(f.id)}
                              className="py-0.5 px-2 rounded-sm bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold font-sans transition inline-flex items-center gap-1 cursor-pointer"
                              id={`btn_approve_faas_${f.id}`}
                            >
                              <Check className="h-3.5 w-3.5" />
                              Approve & Issue TD
                            </button>
                          ) : f.status === "approved" ? (
                            <span className="text-[10px] text-emerald-600 font-bold font-sans inline-flex items-center gap-1">
                              <BadgeCheck className="h-3.5 w-3.5" />
                              Active Estate
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold">Under Appraisal</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredFaas.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                          No matching FAAS appraisal records registered.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {/* Tax Declarations Section */}
          <div className="flex justify-between items-center bg-slate-55 border-b pb-4 mb-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 font-sans flex items-center gap-1.5">
              <ListCheck className="h-4.5 w-4.5 text-emerald-500" />
              Tax Declaration Registry
            </h4>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search Tax Declarations by TDN or owner name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
              id="search_tds"
            />
            <FileCheck className="absolute left-3 top-2.5 h-4 w-4 text-emerald-500" />
          </div>

          {/* Tax Declarations Table Grid */}
          <div className="border border-slate-200/50 rounded-xl overflow-hidden" id="td_table_container">
            <table className="w-full text-left border-collapse font-sans">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-150">
                  <th className="py-3 px-4">TDN Record Number</th>
                  <th className="py-3 px-4">Previous TDN</th>
                  <th className="py-3 px-4">Owner (Estate Holder)</th>
                  <th className="py-3 px-4">Effective Assessment</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Assessed Value (Tax Base)</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTd.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">{t.tdn}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{t.previousTdn || "ORIGINAL"}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{t.ownerName}</td>
                    <td className="py-3 px-4 font-mono font-semibold">{t.effectivityYear}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-200/40">
                        {t.classification}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-extrabold text-slate-800">₱{t.assessedValue.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{t.dateIssued}</td>
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-1 font-semibold text-emerald-600">
                        <Check className="h-4 w-4 bg-emerald-100 p-0.5 rounded text-emerald-600" />
                        Active TDN
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredTd.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                      No approved Tax Declarations available on record. Use approved FAAS records to auto-generate.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

    </div>
  );
}
