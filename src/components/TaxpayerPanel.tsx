import React, { useState } from "react";
import { User, Taxpayer, Property, SoaRecord } from "../types";
import { Search, UserPlus, Info, CheckCircle, Smartphone, Mail, FileText, Landmark } from "lucide-react";

interface TaxpayerPanelProps {
  taxpayers: Taxpayer[];
  properties: Property[];
  soa: SoaRecord[];
  currentUser: User | null;
  onRefresh: () => void;
}

export default function TaxpayerPanel({ taxpayers, properties, soa, currentUser, onRefresh }: TaxpayerPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedTaxpayer, setSelectedTaxpayer] = useState<Taxpayer | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    companyName: "",
    type: "individual" as const,
    tin: "",
    contactNumber: "",
    email: "",
    address: "",
    barangay: "Bagumbayan",
    remarks: ""
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/taxpayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        setIsCreating(false);
        // Reset form
        setFormData({
          firstName: "",
          middleName: "",
          lastName: "",
          suffix: "",
          companyName: "",
          type: "individual",
          tin: "",
          contactNumber: "",
          email: "",
          address: "",
          barangay: "Bagumbayan",
          remarks: ""
        });
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = taxpayers.filter(t => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      t.code.toLowerCase().includes(term) ||
      `${t.firstName} ${t.lastName}`.toLowerCase().includes(term) ||
      t.companyName.toLowerCase().includes(term) ||
      t.tin.toLowerCase().includes(term);
    
    if (filterType === "all") return matchesSearch;
    return matchesSearch && t.type === filterType;
  });

  const getOwnedProperties = (taxpayerId: number) => {
    return properties.filter(p => p.ownerId === taxpayerId);
  };

  const getTaxpayerSoas = (taxpayerId: number) => {
    return soa.filter(s => s.taxpayerId === taxpayerId);
  };

  return (
    <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-sm space-y-3" id="taxpayer_panel_assembly">
      <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-sm border border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-850 font-sans">Taxpayers Master File</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Manage municipal taxpayers, business corporations, estate holdings, and contact registers.</p>
        </div>
        {currentUser?.role !== "Report Viewer" && currentUser?.role !== "Auditor / Read-only User" && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-sm text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            id="btn_add_taxpayer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add Taxpayer
          </button>
        )}
      </div>

      {isCreating ? (
        <form onSubmit={handleCreate} className="border border-slate-200 p-3 rounded-sm space-y-2.5" id="taxpayer_creation_form">
          <h4 className="font-bold text-slate-800 text-sm font-sans border-b border-slate-100 pb-2">Register New Taxpayer Profile</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Taxpayer Entity Type</label>
              <select
                value={formData.type}
                onChange={(e: any) => setFormData({ ...formData, type: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-sans"
                required
              >
                <option value="individual">Individual Practitioner</option>
                <option value="corporation">Corporation / Co.</option>
                <option value="estate">Estate Holder</option>
                <option value="government">Government Unit</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Company / Corporate Name</label>
              <input
                type="text"
                placeholder="Required for Coporation types"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700"
                required={formData.type === "individual"}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Middle Name</label>
              <input
                type="text"
                value={formData.middleName}
                onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700"
                required={formData.type === "individual"}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Suffix (Jr / Sr)</label>
              <input
                type="text"
                value={formData.suffix}
                onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">TIN (Tax Identification Number)</label>
              <input
                type="text"
                placeholder="000-000-000-000"
                value={formData.tin}
                onChange={(e) => setFormData({ ...formData, tin: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Mobile Contact</label>
              <input
                type="text"
                placeholder="09XX-XXX-XXXX"
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Email Address</label>
              <input
                type="email"
                placeholder="username@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Complete Street Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Barangay Location</label>
              <select
                value={formData.barangay}
                onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-sans"
                required
              >
                <option value="Bagumbayan">Bagumbayan</option>
                <option value="Ermita">Ermita</option>
                <option value="Maytoong">Maytoong</option>
                <option value="Quinale">Quinale</option>
                <option value="San Juan">San Juan</option>
                <option value="San Pedro">San Pedro</option>
                <option value="Ilaya Norte">Ilaya Norte</option>
                <option value="Ilaya Sur">Ilaya Sur</option>
                <option value="Poblacion">Poblacion</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Internal Remarks</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-sans h-16 resize-none"
            ></textarea>
          </div>

          <div className="flex justify-end gap-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition flex items-center gap-2 cursor-pointer"
            >
              Register Record
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* Filters Area */}
          <div className="flex flex-col sm:flex-row gap-2" id="taxpayer_filters_bar">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search taxpayers by name, code, or TIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-3 py-1 border border-slate-200 rounded-sm text-xs focus:outline-none focus:border-amber-505"
                id="search_taxpayers"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-sans tracking-wide">Type:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-sm py-1 px-2.5 text-xs text-slate-650 cursor-pointer"
                id="filter_taxpayer_type"
              >
                <option value="all">All Entities</option>
                <option value="individual">Individual</option>
                <option value="corporation">Corporation</option>
                <option value="estate">Estate</option>
                <option value="government">Government</option>
              </select>
            </div>
          </div>

          {/* Taxpayers Grid List */}
          <div className="border border-slate-200/60 rounded-sm overflow-hidden" id="taxpayer_list_frame">
            <table className="w-full text-left border-collapse font-sans">
              <thead>
                <tr className="bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                  <th className="py-1.5 px-3">Code</th>
                  <th className="py-1.5 px-3">Full Legal Name</th>
                  <th className="py-1.5 px-3">TIN No.</th>
                  <th className="py-1.5 px-3">Entity Type</th>
                  <th className="py-1.5 px-3">Billing Contact</th>
                  <th className="py-1.5 px-3">Status</th>
                  <th className="py-1.5 px-3 text-right">Ledger Profiles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-1.5 px-3 font-mono font-semibold text-slate-900">{t.code}</td>
                    <td className="py-1.5 px-3 font-semibold text-slate-800">
                      {t.type === "individual" ? `${t.lastName}, ${t.firstName} ${t.middleName}`.trim() : t.companyName}
                    </td>
                    <td className="py-1.5 px-3 font-mono text-slate-500">{t.tin}</td>
                    <td className="py-1.5 px-3">
                      <span className="px-1 py-0.5 rounded-sm text-[9px] font-semibold bg-slate-100 text-slate-600 border border-slate-150 uppercase tracking-wide">
                        {t.type}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 space-y-0.5 text-slate-500 text-[11px]">
                      <span className="flex items-center gap-1 font-mono"><Smartphone className="h-3 w-3 shrink-0 text-slate-400" />{t.contactNumber}</span>
                      <span className="flex items-center gap-1 font-mono"><Mail className="h-3 w-3 shrink-0 text-slate-400" />{t.email}</span>
                    </td>
                    <td className="py-1.5 px-3">
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-650">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                        Active
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedTaxpayer(t)}
                        className="py-0.5 px-2 rounded bg-slate-860 text-slate-300 hover:text-white hover:bg-slate-700 text-[10px] font-bold font-mono transition inline-flex items-center gap-1 cursor-pointer bg-slate-800 rounded-sm"
                        id={`btn_inspect_${t.code}`}
                      >
                        <Info className="h-3.5 w-3.5" />
                        Inspect Ledger
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      No matching registered taxpayers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Taxpayer Detail Modal */}
      {selectedTaxpayer && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="taxpayer_modal">
          <div className="bg-white rounded-sm w-full max-w-3xl max-h-[90vh] overflow-y-auto border shadow-2xl p-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-3">
              <div className="flex gap-2">
                <div className="p-1 px-1.5 bg-slate-100 text-slate-805 rounded-sm border border-slate-200">
                  <Landmark className="h-7 w-7" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-lg">
                    {selectedTaxpayer.type === "individual" 
                      ? `${selectedTaxpayer.firstName} ${selectedTaxpayer.lastName}`
                      : selectedTaxpayer.companyName}
                  </h4>
                  <p className="font-mono text-xs text-amber-600">{selectedTaxpayer.code} • {selectedTaxpayer.type.toUpperCase()}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTaxpayer(null)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs font-bold text-slate-500 transition cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans mb-6">
              <div className="space-y-2 border-r border-slate-150 pr-4">
                <p className="flex justify-between"><span className="text-slate-400 font-medium">Address:</span> <strong className="text-slate-800 text-right">{selectedTaxpayer.address}, {selectedTaxpayer.barangay}, Paete</strong></p>
                <p className="flex justify-between"><span className="text-slate-400 font-medium">Province/ZIP:</span> <strong className="text-slate-800">Laguna, 4016</strong></p>
                <p className="flex justify-between"><span className="text-slate-400 font-medium">TIN Number:</span> <strong className="text-slate-800 font-mono">{selectedTaxpayer.tin}</strong></p>
              </div>
              <div className="space-y-2 pl-4">
                <p className="flex justify-between"><span className="text-slate-400 font-medium">Contact Mobile:</span> <strong className="text-slate-800 font-mono">{selectedTaxpayer.contactNumber}</strong></p>
                <p className="flex justify-between"><span className="text-slate-400 font-medium">Email Address:</span> <strong className="text-slate-800 font-mono">{selectedTaxpayer.email}</strong></p>
                <p className="flex justify-between"><span className="text-slate-400 font-medium">Remarks:</span> <strong className="text-slate-800 italic">{selectedTaxpayer.remarks || "No supplementary notes."}</strong></p>
              </div>
            </div>

            {/* Owned Properties Sub-list */}
            <div className="space-y-3 mb-6">
              <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-sans border-b border-slate-100 pb-1.5 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                Linked Parcels & Properties ({getOwnedProperties(selectedTaxpayer.id).length})
              </h5>
              <div className="border border-slate-150 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                <table className="w-full text-left text-[11px] font-sans">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-500">
                      <th className="p-2.5">PIN</th>
                      <th className="p-2.5">TDN Reference</th>
                      <th className="p-2.5">Classification</th>
                      <th className="p-2.5">Barangay</th>
                      <th className="p-2.5">Area</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getOwnedProperties(selectedTaxpayer.id).map(p => (
                      <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="p-2.5 font-mono">{p.pin}</td>
                        <td className="p-2.5 font-mono font-semibold text-indigo-600">{p.tdn}</td>
                        <td className="p-2.5 uppercase text-slate-500">{p.classification}</td>
                        <td className="p-2.5">{p.barangayName}</td>
                        <td className="p-2.5 font-mono">{p.area} {p.unit}</td>
                      </tr>
                    ))}
                    {getOwnedProperties(selectedTaxpayer.id).length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-3 text-center text-slate-400 italic">No real tax entities mapped on record.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Consolidated Bills/SOA stack */}
            <div className="space-y-3">
              <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-sans border-b border-slate-100 pb-1.5 flex items-center gap-2">
                <Landmark className="h-4 w-4 text-emerald-500" />
                Tax Ledgers & Statements of Account ({getTaxpayerSoas(selectedTaxpayer.id).length})
              </h5>
              <div className="border border-slate-150 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead>
                    <tr className="bg-slate-50 font-sans font-bold text-slate-500">
                      <th className="p-2.5">SOA Ref</th>
                      <th className="p-2.5">Billing Year</th>
                      <th className="p-2.5">Basic + SEF</th>
                      <th className="p-2.5">Penalties</th>
                      <th className="p-2.5">Total Amount</th>
                      <th className="p-2.5">Settled/Bal</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getTaxpayerSoas(selectedTaxpayer.id).map(s => (
                      <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="p-2.5 font-bold font-mono text-slate-800">{s.soaNumber}</td>
                        <td className="p-2.5">{s.billingYear} ({s.billingPeriod})</td>
                        <td className="p-2.5">₱{(s.basicRptAmount + s.sefAmount).toLocaleString()}</td>
                        <td className="p-2.5 text-red-500">₱{(s.penaltyAmount).toLocaleString()}</td>
                        <td className="p-2.5 font-semibold">₱{(s.totalDue).toLocaleString()}</td>
                        <td className="p-2.5 text-emerald-600 font-bold">₱{s.amountPaid.toLocaleString()} / ₱{s.balance.toLocaleString()}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            s.status === "fully paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {s.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {getTaxpayerSoas(selectedTaxpayer.id).length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-3 text-center text-slate-400 font-sans italic">No Statements of Account recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
