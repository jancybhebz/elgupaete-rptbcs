import React, { useState } from "react";
import { User, Property, Taxpayer, Attachment } from "../types";
import { Search, Plus, MapPin, Eye, ExternalLink, Paperclip, UploadCloud, FileText, CheckCircle2 } from "lucide-react";

interface PropertyPanelProps {
  properties: Property[];
  taxpayers: Taxpayer[];
  attachments: Attachment[];
  currentUser: User | null;
  onRefresh: () => void;
}

export default function PropertyPanel({ properties, taxpayers, attachments, currentUser, onRefresh }: PropertyPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBarangay, setFilterBarangay] = useState("all");
  const [selectedProp, setSelectedProp] = useState<Property | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<"detail" | "gis" | "attachments">("detail");

  // Form states
  const [formData, setFormData] = useState({
    ownerId: "",
    administrator: "",
    kind: "land" as const,
    classification: "residential" as const,
    barangayId: "1",
    street: "",
    lotNo: "",
    blockNo: "",
    surveyNo: "",
    titleNo: "",
    area: "",
    unit: "sqm" as const,
    boundaries: "",
    latitude: "14.364444",
    longitude: "121.527222",
    remarks: ""
  });

  // Simple Attachment states
  const [uploadCategory, setUploadCategory] = useState<"Land Title" | "Deed of Sale" | "Sketch Plan" | "Other">("Land Title");
  const [uploadName, setUploadName] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ownerId) return;

    try {
      const response = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        setIsCreating(false);
        setFormData({
          ownerId: "",
          administrator: "Self",
          kind: "land",
          classification: "residential",
          barangayId: "1",
          street: "",
          lotNo: "",
          blockNo: "",
          surveyNo: "",
          titleNo: "",
          area: "",
          unit: "sqm",
          boundaries: "",
          latitude: "14.364444",
          longitude: "121.527222",
          remarks: ""
        });
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProp || !uploadName.trim()) return;

    try {
      const response = await fetch("/api/attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: selectedProp.id,
          fileName: uploadName,
          category: uploadCategory
        })
      });
      if (response.ok) {
        setUploadName("");
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = properties.filter(p => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      p.pin.toLowerCase().includes(term) ||
      p.tdn.toLowerCase().includes(term) ||
      p.ownerName.toLowerCase().includes(term);

    if (filterBarangay === "all") return matchesSearch;
    return matchesSearch && String(p.barangayId) === filterBarangay;
  });

  const getPropAttachments = (propId: number) => {
    return attachments.filter(a => a.propertyId === propId);
  };

  return (
    <div className="bg-white p-4 rounded-sm border border-slate-205 shadow-sm space-y-3" id="property_panel_root">
      <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-sm border border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-900 font-sans">Cadastral & Appraisal Directory</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Maintain geographic coordinates, land boundaries, classifications, and title attachments.</p>
        </div>
        {currentUser?.role !== "Report Viewer" && currentUser?.role !== "Auditor / Read-only User" && currentUser?.role !== "Treasury Cashier" && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-sm text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            id="btn_add_property"
          >
            <Plus className="h-3.5 w-3.5" />
            Register Property
          </button>
        )}
      </div>

      {isCreating ? (
        <form onSubmit={handleCreate} className="border border-slate-200 p-3 rounded-sm space-y-2.5" id="property_form">
          <h4 className="font-bold text-slate-800 text-sm font-sans border-b border-slate-100 pb-1.5">Register Real Property Parcel</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Select Owner (Registered Taxpayer)</label>
              <select
                value={formData.ownerId}
                onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-sans"
                required
              >
                <option value="">-- Choose Registered Taxpayer --</option>
                {taxpayers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.type === "individual" ? `${t.lastName}, ${t.firstName} (${t.code})` : `${t.companyName} (${t.code})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Beneficial User / Administrator</label>
              <input
                type="text"
                placeholder="Defaults to Self"
                value={formData.administrator}
                onChange={(e) => setFormData({ ...formData, administrator: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Property Kind</label>
              <select
                value={formData.kind}
                onChange={(e: any) => setFormData({ ...formData, kind: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-sans"
                required
              >
                <option value="land">Land</option>
                <option value="building">Building / Estate</option>
                <option value="machinery">Machinery / Assets</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Classification</label>
              <select
                value={formData.classification}
                onChange={(e: any) => setFormData({ ...formData, classification: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-sans"
                required
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="industrial">Industrial</option>
                <option value="agricultural">Agricultural</option>
                <option value="mineral">Mineral</option>
                <option value="special">Special</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Registered Barangay</label>
              <select
                value={formData.barangayId}
                onChange={(e) => setFormData({ ...formData, barangayId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-sans"
                required
              >
                <option value="1">Bagumbayan</option>
                <option value="2">Ermita</option>
                <option value="3">Maytoong</option>
                <option value="4">Quinale</option>
                <option value="5">San Juan</option>
                <option value="6">San Pedro</option>
                <option value="7">Ilaya Norte</option>
                <option value="8">Ilaya Sur</option>
                <option value="9">Poblacion</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Street / Location</label>
              <input
                type="text"
                placeholder="Rizal St."
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Lot Number</label>
              <input
                type="text"
                placeholder="Lot 412"
                value={formData.lotNo}
                onChange={(e) => setFormData({ ...formData, lotNo: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Block Number</label>
              <input
                type="text"
                placeholder="Blk 12"
                value={formData.blockNo}
                onChange={(e) => setFormData({ ...formData, blockNo: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Survey Number</label>
              <input
                type="text"
                placeholder="Cad 412"
                value={formData.surveyNo}
                onChange={(e) => setFormData({ ...formData, surveyNo: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Title / TCT Number</label>
              <input
                type="text"
                placeholder="TCT-9912"
                value={formData.titleNo}
                onChange={(e) => setFormData({ ...formData, titleNo: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Area Dimensions</label>
              <input
                type="number"
                placeholder="e.g. 250"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Measurement Unit</label>
              <select
                value={formData.unit}
                onChange={(e: any) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-sans"
              >
                <option value="sqm">Square Meters (sqm)</option>
                <option value="hectare">Hectares (ha)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">GIS Lat Coordinates</label>
              <input
                type="text"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">GIS Long Coordinates</label>
              <input
                type="text"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Parcel Cadastral Boundaries</label>
            <textarea
              placeholder="e.g. N: Rizal St, E: Lot 12, S: Creek, W: Lot 14"
              value={formData.boundaries}
              onChange={(e) => setFormData({ ...formData, boundaries: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 font-sans h-16 resize-none"
              required
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
              Save Cadastral File
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2" id="property_filters">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search real estates by PIN, owner name, or TDN tag..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-3 py-1 border border-slate-200 rounded-sm text-xs focus:outline-none focus:border-amber-505"
                id="search_properties"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-sans tracking-wide">Barangay:</span>
              <select
                value={filterBarangay}
                onChange={(e) => setFilterBarangay(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-sm py-1 px-2.5 text-xs text-slate-650 cursor-pointer"
                id="filter_barangay_select"
              >
                <option value="all">All Barangays</option>
                <option value="1">Bagumbayan</option>
                <option value="2">Ermita</option>
                <option value="3">Maytoong</option>
                <option value="4">Quinale</option>
                <option value="5">San Juan</option>
                <option value="6">San Pedro</option>
                <option value="7">Ilaya Norte</option>
                <option value="8">Ilaya Sur</option>
                <option value="9">Poblacion</option>
              </select>
            </div>
          </div>

          {/* Properties Grid Table */}
          <div className="border border-slate-200/60 rounded-sm overflow-hidden" id="properties_table_container">
            <table className="w-full text-left border-collapse font-sans">
              <thead>
                <tr className="bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                  <th className="py-1.5 px-3">PIN Indexed Ref</th>
                  <th className="py-1.5 px-3">TDN Target</th>
                  <th className="py-1.5 px-3">Owner Taxpayer</th>
                  <th className="py-1.5 px-3">Classification</th>
                  <th className="py-1.5 px-3">Registered Location</th>
                  <th className="py-1.5 px-3">Total Area</th>
                  <th className="py-1.5 px-3 text-right">Cadastral Options</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-1.5 px-3 font-mono font-bold text-slate-900">{p.pin}</td>
                    <td className="py-1.5 px-3 font-mono text-indigo-650 font-semibold text-indigo-700">{p.tdn || "No TD Link"}</td>
                    <td className="py-1.5 px-3 font-semibold text-slate-800">{p.ownerName}</td>
                    <td className="py-1.5 px-3">
                      <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-extrabold uppercase border tracking-wider ${
                        p.classification === "commercial" ? "bg-amber-50 text-amber-600 border-amber-200/50" : "bg-emerald-50 text-emerald-600 border-emerald-200/50"
                      }`}>
                        {p.classification}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-slate-500 font-medium">
                      {p.street}, <strong className="text-slate-705 text-slate-700">{p.barangayName}</strong>
                    </td>
                    <td className="py-1.5 px-3 font-mono font-bold text-slate-800">{p.area} {p.unit}</td>
                    <td className="py-1.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedProp(p)}
                        className="py-0.5 px-2 rounded-sm bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-[10px] font-bold font-mono transition inline-flex items-center gap-1 cursor-pointer"
                        id={`btn_view_property_${p.id}`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      No matching registered property parcels found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Property Details Modal */}
      {selectedProp && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="property_details_modal">
          <div className="bg-white rounded-sm w-full max-w-3xl max-h-[90vh] overflow-y-auto border shadow-2xl p-4">
            
            <div className="flex justify-between items-start border-b border-slate-100 pb-2 mb-3">
              <div className="flex gap-2">
                <div className="p-1 px-1.5 bg-slate-50 text-slate-800 border rounded-sm flex items-center justify-center">
                  <MapPin className="h-7 w-7 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base">PIN: {selectedProp.pin}</h4>
                  <p className="font-sans text-xs text-slate-500">Owner: <strong className="text-indigo-600">{selectedProp.ownerName}</strong></p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedProp(null); setActiveTab("detail"); }}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs font-bold text-slate-500 transition cursor-pointer"
              >
                Close View
              </button>
            </div>

            {/* Tabs Selector within Details */}
            <div className="grid grid-cols-3 gap-1 bg-slate-50 border border-slate-100 p-1 rounded-xl mb-4 text-xs font-semibold text-slate-600">
              <button
                onClick={() => setActiveTab("detail")}
                className={`py-1.5 rounded-lg transition ${activeTab === "detail" ? "bg-white text-slate-800 shadow" : ""}`}
              >
                Parcel Profile
              </button>
              <button
                onClick={() => setActiveTab("gis")}
                className={`py-1.5 rounded-lg transition ${activeTab === "gis" ? "bg-white text-slate-800 shadow" : ""}`}
              >
                GIS Coordinates Mapping
              </button>
              <button
                onClick={() => setActiveTab("attachments")}
                className={`py-1.5 rounded-lg transition ${activeTab === "attachments" ? "bg-white text-slate-800 shadow" : ""}`}
              >
                Security Attachments ({getPropAttachments(selectedProp.id).length})
              </button>
            </div>

            {activeTab === "detail" && (
              <div className="space-y-4 text-xs font-sans">
                <div className="grid grid-cols-2 gap-4 border border-slate-150 p-4 rounded-xl bg-slate-50/50">
                  <div className="space-y-2">
                    <p className="flex justify-between"><span className="text-slate-400 font-medium">TDN Linked:</span> <strong className="text-slate-800 font-mono">{selectedProp.tdn || "MIGRATING"}</strong></p>
                    <p className="flex justify-between"><span className="text-slate-400 font-medium">Previous TDN:</span> <strong className="text-slate-800 font-mono">{selectedProp.previousTdn || "N/A"}</strong></p>
                    <p className="flex justify-between"><span className="text-slate-400 font-medium font-sans">Class / Kind:</span> <strong className="text-slate-800 uppercase font-mono">{selectedProp.classification} / {selectedProp.kind}</strong></p>
                    <p className="flex justify-between"><span className="text-slate-400 font-medium">Lot / block No:</span> <strong className="text-slate-800">{selectedProp.lotNo || "None"} / {selectedProp.blockNo || "None"}</strong></p>
                  </div>
                  <div className="space-y-2">
                    <p className="flex justify-between"><span className="text-slate-400 font-medium">Cadastral Survey:</span> <strong className="text-slate-800">{selectedProp.surveyNo}</strong></p>
                    <p className="flex justify-between"><span className="text-slate-400 font-medium">TCT Title Number:</span> <strong className="text-slate-800 font-mono">{selectedProp.titleNo || "Pending Approval"}</strong></p>
                    <p className="flex justify-between"><span className="text-slate-400 font-medium">Street Location:</span> <strong className="text-slate-800">{selectedProp.street}</strong></p>
                    <p className="flex justify-between"><span className="text-slate-400 font-medium">Area Metric:</span> <strong className="text-slate-800 font-mono">{selectedProp.area} {selectedProp.unit}</strong></p>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Cadastral Boundaries</span>
                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg text-slate-700 font-mono text-[11px] h-12 flex items-center">
                    {selectedProp.boundaries}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Administrative Remarks</span>
                  <p className="p-3 bg-slate-50/70 border border-slate-100 rounded-lg text-slate-500 italic">
                    {selectedProp.remarks || "No supplementary remarks recorded."}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "gis" && (
              <div className="space-y-4" id="gis_map_tab">
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border text-xs">
                  <div>
                    <span className="block text-slate-400">GIS Coordinates Reference Tag</span>
                    <strong className="font-mono text-slate-800 text-sm">Lat {selectedProp.latitude} • Long {selectedProp.longitude}</strong>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${selectedProp.latitude},${selectedProp.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 hover:text-white rounded text-[11px] font-bold inline-flex items-center gap-1.5 transition text-slate-300"
                  >
                    Google Map Link
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {/* Simulated Geolocation Land Frame */}
                <div className="h-60 bg-emerald-50 border border-emerald-100 rounded-xl relative overflow-hidden flex items-center justify-center p-4">
                  <div className="absolute inset-0 opacity-15" style={{ backgroundImage: "radial-gradient(circle, #059669 1.5px, transparent 1.5px)", backgroundSize: "16px 16px" }}></div>
                  
                  {/* Visual plot representing the property block */}
                  <div className="border-4 border-amber-600 bg-amber-500/20 rounded h-36 w-52 absolute flex items-center justify-center shadow-lg transition-all animate-pulse">
                    <span className="font-mono font-bold text-[10px] text-amber-800 uppercase tracking-wider text-center px-1">
                      PLOT:{selectedProp.parcelReference} <br/> ({selectedProp.area} sqm)
                    </span>
                  </div>

                  <div className="absolute bottom-2 left-2 bg-slate-900/60 p-2 text-white font-mono rounded text-[9px] backdrop-blur sticky">
                    Target: LGU CADASTRAL MAP (PAETE)
                  </div>
                </div>
              </div>
            )}

            {activeTab === "attachments" && (
              <div className="space-y-4 text-xs font-sans" id="prop_attachments_tab">
                {currentUser?.role !== "Report Viewer" && currentUser?.role !== "Auditor / Read-only User" && currentUser?.role !== "Treasury Cashier" && (
                  <form onSubmit={handleUpload} className="grid grid-cols-1 sm:grid-cols-3 gap-2 border border-slate-150 p-3 rounded-xl bg-slate-50/50">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Doc Category</label>
                      <select
                        value={uploadCategory}
                        onChange={(e: any) => setUploadCategory(e.target.value)}
                        className="w-full bg-white border rounded py-1 px-2"
                      >
                        <option value="Land Title">Land Title</option>
                        <option value="Deed of Sale">Deed of Sale</option>
                        <option value="Sketch Plan">Sketch Plan</option>
                        <option value="FAAS">FAAS</option>
                        <option value="Other">Other Supp. Doc</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">Document / File Label Name</label>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="e.g. notarized_deed_2026.pdf"
                          value={uploadName}
                          onChange={(e) => setUploadName(e.target.value)}
                          className="flex-grow bg-white border rounded py-1 px-2"
                          required
                        />
                        <button
                          type="submit"
                          className="px-3 bg-amber-600 hover:bg-amber-550 text-white rounded font-bold cursor-pointer transition flex items-center gap-1 shrink-0"
                        >
                          <UploadCloud className="h-4 w-4" />
                          Upload
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Uploaded lists */}
                <div className="border rounded-xl divide-y">
                  {getPropAttachments(selectedProp.id).map(a => (
                    <div key={a.id} className="p-3 bg-white flex justify-between items-center hover:bg-slate-50">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="block font-semibold text-slate-700">{a.fileName}</span>
                          <span className="text-[10px] font-mono text-slate-400">{a.category} • {(a.fileSize/1024).toFixed(2)} MB • Uploaded by {a.uploadedBy}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-green-50 text-emerald-600 border border-green-200">
                        Secure Vault Mapped
                      </span>
                    </div>
                  ))}
                  {getPropAttachments(selectedProp.id).length === 0 && (
                    <p className="py-6 text-center text-slate-400 italic">No supplementary real estate documents attached yet.</p>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
