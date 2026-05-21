import React, { useState, useEffect } from "react";
import {
  GitFork,
  Plus,
  Search,
  FileText,
  ArrowRight,
  User,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Calendar,
  RefreshCw,
  Upload,
  Lock,
  ShieldCheck,
  Check,
  Trash2,
  Layers,
  Sparkles,
  ChevronRight,
  History,
  FileClock,
  HelpCircle
} from "lucide-react";
import {
  User as UserType,
  Taxpayer,
  Property,
  FaaSRecord,
  TaxDeclaration,
  SoaRecord,
  Attachment,
  PropertyMutation,
  PropertyMutationItem,
  PropertyOwnershipHistory,
  PropertyStatusHistory
} from "../types";

interface MutationPanelProps {
  currentUser: UserType | null;
  taxpayers: Taxpayer[];
  properties: Property[];
  faas: FaaSRecord[];
  declarations: TaxDeclaration[];
  soa: SoaRecord[];
  onRefresh: () => Promise<void>;
}

export default function MutationPanel({
  currentUser,
  taxpayers,
  properties,
  faas,
  declarations,
  soa,
  onRefresh
}: MutationPanelProps) {
  // Navigation states
  const [activeSubTab, setActiveSubTab] = useState<"transitions" | "ownership_chain" | "status_history">("transitions");
  
  // Master lists loaded from backend
  const [mutations, setMutations] = useState<PropertyMutation[]>([]);
  const [mutationItems, setMutationItems] = useState<PropertyMutationItem[]>([]);
  const [ownershipHistory, setOwnershipHistory] = useState<PropertyOwnershipHistory[]>([]);
  const [statusHistory, setStatusHistory] = useState<PropertyStatusHistory[]>([]);
  
  // Search / filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [selectedMutation, setSelectedMutation] = useState<PropertyMutation | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Create form states
  const [mutationType, setMutationType] = useState<"land_transfer" | "subdivision" | "consolidation" | "reclassification" | "assessment_revision" | "cancellation">("land_transfer");
  const [sourcePropId, setSourcePropId] = useState<string>("");
  const [newTaxpayerId, setNewTaxpayerId] = useState<string>("");
  const [effectivityYear, setEffectivityYear] = useState<number>(new Date().getFullYear());
  const [remarks, setRemarks] = useState("");
  
  // Metadata fields depending on type
  const [transferType, setTransferType] = useState("sale");
  const [deedReference, setDeedReference] = useState("");
  const [notaryDetails, setNotaryDetails] = useState("");
  const [newTdnValue, setNewTdnValue] = useState("");
  const [newPinValue, setNewPinValue] = useState("");
  
  // For Reclassification
  const [newClassification, setNewClassification] = useState("commercial");
  
  // For Assessment Revision
  const [revisedFmv, setRevisedFmv] = useState("500000");
  const [revisedAssessmentLevel, setRevisedAssessmentLevel] = useState("20");
  
  // For Cancellation
  const [cancelReason, setCancelReason] = useState("erroneous_entry");

  // For Subdivision
  const [childLots, setChildLots] = useState<Array<{
    lotNo: string;
    pin: string;
    tdn: string;
    area: string;
    ownerId: string;
    classification: string;
    fairMarketValue: string;
    assessmentLevel: string;
    assessedValue: string;
  }>>([
    { lotNo: "Lot 1-A", pin: "", tdn: "", area: "50", ownerId: "", classification: "residential", fairMarketValue: "150000", assessmentLevel: "20", assessedValue: "3000" }
  ]);
  const [overrideAreaCheck, setOverrideAreaCheck] = useState(false);

  // For Consolidation checkboxes
  const [selectedConsolidationSources, setSelectedConsolidationSources] = useState<number[]>([]);

  // Helpers
  const currentRole = currentUser?.role || "System Administrator";
  const canModify = ["System Administrator", "Municipal Assessor", "Assessor Staff"].includes(currentRole);

  useEffect(() => {
    loadMutationData();
  }, []);

  const loadMutationData = async () => {
    try {
      setIsLoading(true);
      const [mRes, miRes, ohRes, shRes] = await Promise.all([
        fetch("/api/mutations"),
        fetch("/api/mutations/items"),
        fetch("/api/mutations/ownership-history"),
        fetch("/api/mutations/status-history")
      ]);
      const [m, mi, oh, sh] = await Promise.all([
        mRes.json(),
        miRes.json(),
        ohRes.json(),
        shRes.json()
      ]);
      setMutations(m);
      setMutationItems(mi);
      setOwnershipHistory(oh);
      setStatusHistory(sh);
    } catch (err) {
      console.error("Failed to load mutation records", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMutation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    // Basic Validations
    if (mutationType !== "consolidation" && !sourcePropId) {
      setErrorMessage("Please select a valid reference source property.");
      return;
    }

    if (mutationType === "land_transfer" && !newTaxpayerId) {
      setErrorMessage("Please select the target new owner taxpayer registry.");
      return;
    }

    // Construct request metadata
    let metadataObj: any = {};
    let payloadItems: any[] = [];

    const sourceProp = properties.find(p => p.id === parseInt(sourcePropId));

    if (mutationType === "land_transfer") {
      metadataObj = {
        transferType,
        deedReference,
        notaryDetails,
        previousOwner: sourceProp?.ownerName || "Unknown"
      };
    } else if (mutationType === "subdivision") {
      // Validate subdivision lot sizes
      if (childLots.length < 1) {
        setErrorMessage("Please add at least one child lot configuration.");
        return;
      }
      const totalChildArea = childLots.reduce((sum, l) => sum + (parseFloat(l.area) || 0), 0);
      const motherArea = sourceProp?.area || 0;
      if (totalChildArea > motherArea && !overrideAreaCheck) {
        setErrorMessage(`Total child area (${totalChildArea} sqm) exceeds mother lot's area (${motherArea} sqm). Please reduce child areas or toggle 'Override Area Check'.`);
        return;
      }
      
      metadataObj = {
        childLots: childLots.map(l => ({
          ...l,
          assessedValue: (parseFloat(l.fairMarketValue || "0") * parseFloat(l.assessmentLevel || "0")) / 100
        })),
        overrideAreaCheck
      };
    } else if (mutationType === "consolidation") {
      if (selectedConsolidationSources.length < 2) {
        setErrorMessage("Please select at least two source properties to consolidate.");
        return;
      }
      metadataObj = {
        sourcePropertyIds: selectedConsolidationSources
      };
    } else if (mutationType === "reclassification") {
      metadataObj = {
        newClassification
      };
    } else if (mutationType === "assessment_revision") {
      metadataObj = {
        fairMarketValue: parseFloat(revisedFmv),
        assessmentLevel: parseFloat(revisedAssessmentLevel)
      };
    } else if (mutationType === "cancellation") {
      metadataObj = {
        cancelReason
      };
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/mutations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mutationType,
          sourcePropertyId: mutationType === "consolidation" ? null : parseInt(sourcePropId),
          taxpayerId: sourceProp?.ownerId || null,
          previousTaxpayerId: sourceProp?.ownerId || null,
          newTaxpayerId: newTaxpayerId ? parseInt(newTaxpayerId) : null,
          previousTdn: sourceProp?.tdn || "",
          newTdn: newTdnValue,
          previousPin: sourceProp?.pin || "",
          newPin: newPinValue,
          effectivityYear,
          remarks,
          metadata: metadataObj,
          items: payloadItems
        })
      });

      if (!res.ok) {
        const errVal = await res.json();
        throw new Error(errVal.message || "Failed to submit transaction draft.");
      }

      const created = await res.json();
      setSuccessMessage(`Mutation transaction Draft created successfully: ${created.mutationNumber}`);
      
      // Reload UI
      await loadMutationData();
      await onRefresh();
      
      // Close / reset
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err: any) {
      setErrorMessage(err.message || "Request failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSourcePropId("");
    setNewTaxpayerId("");
    setRemarks("");
    setNewTdnValue("");
    setNewPinValue("");
    setDeedReference("");
    setNotaryDetails("");
    setSelectedConsolidationSources([]);
    setChildLots([{ lotNo: "Lot 1-A", pin: "", tdn: "", area: "50", ownerId: "", classification: "residential", fairMarketValue: "150000", assessmentLevel: "20", assessedValue: "3000" }]);
  };

  const handleTransition = async (action: string) => {
    if (!selectedMutation) return;
    setErrorMessage("");
    setSuccessMessage("");
    try {
      setIsLoading(true);
      const res = await fetch(`/api/mutations/${selectedMutation.id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });

      if (!res.ok) {
        const errVal = await res.json();
        throw new Error(errVal.message || "Transition rejected.");
      }

      const updated = await res.json();
      setSuccessMessage(`Mutation transition executed: status advanced to '${updated.status}'`);
      setSelectedMutation(updated);
      
      await loadMutationData();
      await onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Subdivision Helpers
  const addSubdivisionLotRow = () => {
    const idx = childLots.length + 1;
    setChildLots([
      ...childLots,
      { lotNo: `Lot 1-${String.fromCharCode(64 + idx)}`, pin: "", tdn: "", area: "50", ownerId: "", classification: "residential", fairMarketValue: "150000", assessmentLevel: "20", assessedValue: "3000" }
    ]);
  };

  const removeSubdivisionLotRow = (index: number) => {
    if (childLots.length <= 1) return;
    setChildLots(childLots.filter((_, i) => i !== index));
  };

  const updateSubdivisionLotRow = (index: number, field: string, value: string) => {
    const updated = [...childLots];
    updated[index] = { ...updated[index], [field]: value };
    setChildLots(updated);
  };

  // Rendering filter applications
  const filteredMutations = mutations.filter(m => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = 
      m.mutationNumber.toLowerCase().includes(term) ||
      (m.remarks && m.remarks.toLowerCase().includes(term)) ||
      m.requestedBy.toLowerCase().includes(term);

    const matchesType = typeFilter === "all" || m.mutationType === typeFilter;
    const matchesStatus = statusFilter === "all" || m.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-4" id="rpt_assessor_mutations_dashboard">
      
      {/* Overview Block */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded text-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GitFork className="h-5 w-5 text-amber-500 shrink-0" />
            <h3 className="text-sm font-bold uppercase tracking-wider font-sans text-white">Property Transaction & Mutation Module</h3>
          </div>
          <p className="text-[10.5px] text-slate-400 mt-1 max-w-2xl font-sans">
            Authorized Assessor sandbox cockpit. Record and track land mutations, subdivisions, consolidations, reclassifications, assessment revisions, and official structural cancellations of active property declarations inside the Local Government Unit of Paete, Laguna.
          </p>
        </div>
        {canModify && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold flex items-center gap-1 transition cursor-pointer shrink-0"
            id="btn_launch_mutation_composer"
          >
            <Plus className="h-3.5 w-3.5" />
            New Transaction Draft
          </button>
        )}
      </div>

      {/* Success/Error Feedbacks */}
      {errorMessage && (
        <div className="p-2.5 bg-red-950/80 border border-red-900 rounded text-red-200 text-xs flex items-start gap-2 animate-fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
          <div>
            <strong className="font-bold">Transaction Guard Validation Risk:</strong> {errorMessage}
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-2.5 bg-emerald-950/80 border border-emerald-900 rounded text-emerald-200 text-xs flex items-start gap-2 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
          <div>
            <strong className="font-bold">Execution Perfected:</strong> {successMessage}
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs and History selectors */}
      <div className="border-b border-slate-800 flex justify-between items-center text-xs">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveSubTab("transitions")}
            className={`px-3 py-2 cursor-pointer font-bold border-b-2 transition-all ${
              activeSubTab === "transitions" 
                ? "border-amber-500 text-amber-500 bg-slate-900/40" 
                : "border-transparent text-slate-400 hover:text-slate-100"
            }`}
          >
            Workflow Transactions ({mutations.length})
          </button>
          <button
            onClick={() => setActiveSubTab("ownership_chain")}
            className={`px-3 py-2 cursor-pointer font-bold border-b-2 transition-all ${
              activeSubTab === "ownership_chain" 
                ? "border-amber-500 text-amber-500 bg-slate-900/40" 
                : "border-transparent text-slate-400 hover:text-slate-100"
            }`}
          >
            Property Ownership History Chain ({ownershipHistory.length})
          </button>
          <button
            onClick={() => setActiveSubTab("status_history")}
            className={`px-3 py-2 cursor-pointer font-bold border-b-2 transition-all ${
              activeSubTab === "status_history" 
                ? "border-amber-500 text-amber-500 bg-slate-900/40" 
                : "border-transparent text-slate-400 hover:text-slate-100"
            }`}
          >
            Property Status & Cancellation Logs ({statusHistory.length})
          </button>
        </div>
        <button
          onClick={loadMutationData}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition cursor-pointer flex items-center gap-1 font-sans text-[11px]"
          title="Reload history states from database service"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin text-amber-500" : ""}`} />
          Force Sync
        </button>
      </div>

      {/* VIEW PANEL: WORKFLOW TRANSACTIONS */}
      {activeSubTab === "transitions" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* LEFT: Transactions filterable list */}
          <div className="bg-white border border-slate-200 rounded p-3 text-slate-800 space-y-3 shadow-sm">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Mutation Catalog</h4>
              <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-400">
                <span>TOTAL FILLED:</span>
                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">{filteredMutations.length} items</span>
              </div>
            </div>

            {/* Quick Filter Bar */}
            <div className="grid grid-cols-3 gap-1.5">
              <div className="col-span-1">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded text-[10px] py-1 px-1 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Mutation Types</option>
                  <option value="land_transfer">Land Transfer</option>
                  <option value="ownership_transfer">Ownership Transfer</option>
                  <option value="subdivision">Subdivision</option>
                  <option value="consolidation">Consolidation</option>
                  <option value="reclassification">Reclassification</option>
                  <option value="assessment_revision">Assessment Revision</option>
                  <option value="cancellation">Cancellation</option>
                </select>
              </div>

              <div className="col-span-1">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded text-[10px] py-1 px-1 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft (Assessing)</option>
                  <option value="for review">For Review</option>
                  <option value="approved">Assessor Approved</option>
                  <option value="clearance checked">Clearance Checked</option>
                  <option value="final approved">Final Approved</option>
                  <option value="posted">Posted & Executed</option>
                </select>
              </div>

              <div className="col-span-1 relative">
                <input
                  type="text"
                  placeholder="ID search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded text-[10px] py-1 pl-5 focus:outline-none focus:border-amber-500"
                />
                <Search className="absolute left-1.5 top-1.5 h-3 w-3 text-slate-450" />
              </div>
            </div>

            {/* Transactions Rows */}
            <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
              {filteredMutations.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded border border-dashed border-slate-200">
                  <GitFork className="h-8 w-8 mx-auto text-slate-300" />
                  <p className="text-xs text-slate-500 mt-1 font-sans">No matching mutation transactions logged in system.</p>
                </div>
              ) : (
                filteredMutations.map(m => {
                  const isSelected = selectedMutation?.id === m.id;
                  
                  // Label formatting
                  let typeLabel = "Mutation";
                  let typeBadgeColor = "text-slate-600 bg-slate-100 border-slate-200";
                  if (m.mutationType === "land_transfer" || m.mutationType === "ownership_transfer") {
                    typeLabel = "Transfer";
                    typeBadgeColor = "text-emerald-700 bg-emerald-50 border-emerald-250";
                  } else if (m.mutationType === "subdivision") {
                    typeLabel = "Subdivision";
                    typeBadgeColor = "text-blue-700 bg-blue-50 border-blue-250";
                  } else if (m.mutationType === "consolidation") {
                    typeLabel = "Consolidation";
                    typeBadgeColor = "text-indigo-700 bg-indigo-50 border-indigo-250";
                  } else if (m.mutationType === "reclassification") {
                    typeLabel = "Reclassification";
                    typeBadgeColor = "text-purple-700 bg-purple-50 border-purple-250";
                  } else if (m.mutationType === "assessment_revision") {
                    typeLabel = "Revision";
                    typeBadgeColor = "text-amber-700 bg-amber-50 border-amber-250";
                  } else if (m.mutationType === "cancellation") {
                    typeLabel = "Cancellation";
                    typeBadgeColor = "text-red-700 bg-red-50 border-red-250";
                  }

                  let stateBadgeColor = "text-slate-500 bg-slate-50";
                  if (m.status === "posted") stateBadgeColor = "text-emerald-700 bg-emerald-100 border border-emerald-200";
                  else if (m.status === "final approved") stateBadgeColor = "text-amber-705 bg-amber-50 border border-amber-200 text-amber-700";
                  else if (m.status === "approved") stateBadgeColor = "text-teal-700 bg-teal-50 border border-teal-200";
                  else if (m.status === "clearance checked") stateBadgeColor = "text-sky-700 bg-sky-50 border border-sky-200";
                  else if (m.status === "for review") stateBadgeColor = "text-indigo-700 bg-indigo-50 border border-indigo-200";

                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMutation(m)}
                      className={`w-full text-left p-2.5 rounded border flex flex-col gap-2 transition cursor-pointer ${
                        isSelected 
                          ? "border-amber-500 bg-amber-50 shadow-sm" 
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-slate-900">{m.mutationNumber}</span>
                        <div className="flex gap-1">
                          <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-mono font-bold ${typeBadgeColor}`}>
                            {typeLabel}
                          </span>
                          <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-mono font-bold ${stateBadgeColor}`}>
                            {m.status}
                          </span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-600 line-clamp-1 font-sans">
                        {m.remarks || "No supplementary description provided."}
                      </div>

                      <div className="flex items-center justify-between text-[9px] text-slate-400 border-t border-slate-200/60 pt-1.5">
                        <span className="font-sans">Eff: <strong className="text-slate-700">{m.effectivityYear}</strong></span>
                        <span className="font-mono">{m.createdAt.split("T")[0]}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Transaction details and timeline state controller */}
          <div className="bg-slate-950 border border-slate-900 rounded p-4 text-slate-350 space-y-4 shadow">
            {selectedMutation ? (
              <div className="space-y-4">
                
                {/* Header detail */}
                <div className="border-b border-slate-800 pb-3 flex justify-between items-start">
                  <div>
                    <span className="text-[9px] uppercase tracking-widest text-amber-500 font-mono font-bold">ACTIVE TRANSACTION ENVELOPE</span>
                    <h4 className="text-sm font-bold font-sans text-white mt-0.5 flex items-center gap-1">
                      {selectedMutation.mutationNumber}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-sans block">Type:</span>
                    <span className="text-xs text-white font-bold uppercase font-sans tracking-wide">
                      {selectedMutation.mutationType.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Status Progress Bar */}
                <div className="bg-slate-900 p-2.5 rounded border border-slate-800 space-y-2">
                  <span className="text-[9px] uppercase tracking-widest text-slate-500 font-mono font-bold block">CLEARANCE CLEARING PIPELINE</span>
                  
                  <div className="relative flex items-center justify-between text-[9px] font-sans font-bold">
                    {/* Background Progress track line */}
                    <div className="absolute left-[5%] right-[5%] top-[12px] h-[3px] bg-slate-850 z-0">
                      <div 
                        className="h-full bg-amber-500 transition-all duration-300"
                        style={{
                          width: selectedMutation.status === "draft" ? "0%" :
                                 selectedMutation.status === "for review" ? "20%" :
                                 selectedMutation.status === "approved" ? "40%" :
                                 selectedMutation.status === "clearance checked" ? "60%" :
                                 selectedMutation.status === "final approved" ? "80%" : "100%"
                        }}
                      ></div>
                    </div>

                    {[
                      { state: "draft", icon: Sparkles, label: "Draft" },
                      { state: "for review", icon: HelpCircle, label: "Rev" },
                      { state: "approved", icon: CheckCircle2, label: "App" },
                      { state: "clearance checked", icon: ShieldCheck, label: "Clr" },
                      { state: "final approved", icon: FileText, label: "Fnl" },
                      { state: "posted", icon: Lock, label: "Post" }
                    ].map((step, sIdx) => {
                      const states = ["draft", "for review", "approved", "clearance checked", "final approved", "posted"];
                      const currentProgressIdx = states.indexOf(selectedMutation.status);
                      const stepIdx = states.indexOf(step.state);
                      const isDone = stepIdx <= currentProgressIdx;
                      const isCurrent = step.state === selectedMutation.status;

                      return (
                        <div key={step.state} className="flex flex-col items-center z-10 space-y-1 relative" style={{ width: "16%" }}>
                          <div 
                            className={`h-7 w-7 rounded-full flex items-center justify-center transition border ${
                              isCurrent ? "bg-amber-505 text-white bg-amber-600 border-amber-400" :
                              isDone ? "bg-slate-850 text-emerald-400 border-emerald-500" :
                              "bg-slate-950 text-slate-600 border-slate-800"
                            }`}
                          >
                            <step.icon className="h-3 w-3" />
                          </div>
                          <span className={`text-[8px] truncate max-w-full font-mono ${
                            isCurrent ? "text-amber-500 font-bold" :
                            isDone ? "text-emerald-400" : "text-slate-500"
                          }`}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* State Transition Actions based on roles */}
                <div className="bg-slate-900 border border-slate-850 rounded p-2.5 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-[10px] font-bold text-slate-300 font-sans">WORKFLOW GOVERNANCE GATEWAY</span>
                    <span className="text-[9px] font-mono font-bold text-amber-505 bg-amber-950 px-1 py-0.5 rounded text-amber-500 uppercase">
                      Current: {selectedMutation.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-end">
                    
                    {/* Transition 1: Draft to Review (By Assessor Staff or Admin) */}
                    {selectedMutation.status === "draft" && (
                      <button
                        onClick={() => handleTransition("review")}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                        id="btn_mutate_action_review"
                      >
                        Submit to Senior Reviewer
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    )}

                    {/* Transition 2: For Review to Approved (By Senior Assessor or Admin) */}
                    {selectedMutation.status === "for review" && (
                      <button
                        onClick={() => handleTransition("approve")}
                        className="px-2.5 py-1 bg-teal-600 hover:bg-teal-505 text-white rounded text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                        id="btn_mutate_action_approve"
                      >
                        <Check className="h-3 w-3" />
                        Approve Assessment Specifications
                      </button>
                    )}

                    {/* Transition 3: Approved to Clearance Checked (By Treasury or Admin) */}
                    {selectedMutation.status === "approved" && (
                      <button
                        onClick={() => handleTransition("clearance")}
                        className="px-2.5 py-1 bg-sky-600 hover:bg-sky-505 text-white rounded text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                        id="btn_mutate_action_clearance"
                      >
                        <ShieldCheck className="h-3 w-3" />
                        Perform Delinquency Clearance Verification
                      </button>
                    )}

                    {/* Transition 4: Clearance Checked to Final Approved (By Municipal Assessor) */}
                    {selectedMutation.status === "clearance checked" && (
                      <button
                        onClick={() => handleTransition("final_approve")}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                        id="btn_mutate_action_final_approve"
                      >
                        <FileText className="h-3 w-3" />
                        Municipal Assessor Final Sign-off
                      </button>
                    )}

                    {/* Transition 5: Final Approved to Posted & Executed (Assessor Boss - updates tables) */}
                    {selectedMutation.status === "final_approved" || selectedMutation.status === "final approved" ? (
                      <button
                        onClick={() => handleTransition("post")}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10.5px] font-extrabold cursor-pointer transition flex items-center gap-1.5 shadow"
                        id="btn_mutate_action_post"
                      >
                        <Lock className="h-3 w-3" />
                        POST & EXECUTE LAND TRANSITION
                      </button>
                    ) : null}

                    {/* If Posted, locked */}
                    {selectedMutation.status === "posted" && (
                      <span className="text-[11px] font-mono px-3 py-1 bg-slate-900 border border-emerald-900 border-dashed rounded text-emerald-400 font-bold flex items-center gap-1.5 w-full justify-center">
                        <Lock className="h-3.5 w-3.5" />
                        POSTED TRANSACTION: Locked in ledgers with immutable cryptographic status.
                      </span>
                    )}

                  </div>
                </div>

                {/* Detailed Information Metadata Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900 p-3 rounded border border-slate-850">
                  <div className="col-span-2 border-b border-slate-800 pb-1 flex justify-between text-[10px] font-bold uppercase text-slate-405 font-sans">
                    <span>SPECIFICATION DATASETS</span>
                    <span className="text-amber-550 font-mono text-amber-500 font-bold">
                      Year: {selectedMutation.effectivityYear}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-505 block font-sans">Assigned Source Property:</span>
                    <span className="text-white font-mono leading-relaxed select-all">
                      {selectedMutation.previousTdn || "No Source Listed"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-550 block font-sans">Spawned TDN Output:</span>
                    <span className="text-emerald-450 text-emerald-400 font-mono leading-relaxed select-all">
                      {selectedMutation.newTdn || "Generate on Posting"}
                    </span>
                  </div>

                  <div className="col-span-2 border-slate-900/60 pt-1">
                    <span className="text-[10px] text-slate-500 block font-sans">Audited Staff Roles:</span>
                    <div className="text-[9.5px] space-y-0.5 text-slate-400 font-mono">
                      <p>Draft Operator: <strong className="text-slate-200">{selectedMutation.requestedBy}</strong></p>
                      {selectedMutation.reviewedBy && <p>Reviewed: <strong className="text-slate-200">{selectedMutation.reviewedBy}</strong></p>}
                      {selectedMutation.approvedBy && <p>Assessor Sign: <strong className="text-slate-200">{selectedMutation.approvedBy}</strong></p>}
                      {selectedMutation.postedBy && <p>Treasury Poster: <strong className="text-slate-200">{selectedMutation.postedBy}</strong></p>}
                    </div>
                  </div>

                  {/* Metadata parser attributes depending on properties */}
                  <div className="col-span-2 border-t border-slate-800/80 pt-2 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 font-sans block">Structured Transaction Metadata Payload</span>
                    
                    {(() => {
                      try {
                        const dat = JSON.parse(selectedMutation.metadata || "{}");
                        return (
                          <div className="bg-slate-950 p-2 rounded text-[10px] font-mono text-slate-400 border border-slate-900 space-y-1">
                            {Object.entries(dat).map(([k, v]) => {
                              if (k === "childLots" && Array.isArray(v)) {
                                return (
                                  <div key={k} className="border-t border-slate-900/65 pt-1.5 mt-1">
                                    <strong className="text-emerald-400 font-mono text-[9px] uppercase">Spawned Offspring Lots ({v.length}):</strong>
                                    <div className="grid grid-cols-1 gap-1 mt-1 pr-1 max-h-[140px] overflow-y-auto">
                                      {v.map((lot: any, lotIdx: number) => (
                                        <div key={lotIdx} className="bg-slate-900 p-1.5 rounded text-[9.5px] space-y-0.5 border border-slate-850">
                                          <p className="text-white font-sans font-extrabold flex justify-between">
                                            <span>{lot.lotNo}</span>
                                            <span className="text-amber-500 text-[8.5px]">{lot.area} sqm</span>
                                          </p>
                                          <p>Assigned TDN: <span className="text-emerald-400">{lot.tdn || "Auto-assign"}</span></p>
                                          <p>Assess Val: ₱{lot.assessedValue?.toLocaleString() || lot.assessedValue || "0"}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              }
                              return (
                                <p key={k} className="flex justify-between">
                                  <span className="text-slate-500 uppercase font-bold text-[9px]">{k.replace(/([A-Z])/g, "_$1")}:</span>
                                  <strong className="text-slate-200 truncate max-w-56">{typeof v === "object" ? JSON.stringify(v) : String(v)}</strong>
                                </p>
                              );
                            })}
                          </div>
                        );
                      } catch (err) {
                        return <span className="text-red-400 font-mono">Invalid payload serialization.</span>;
                      }
                    })()}
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-24 select-none">
                <GitFork className="h-12 w-12 mx-auto text-slate-700 animate-pulse" />
                <h5 className="text-sm font-sans font-bold text-white mt-2">Active Spec Envelope Empty</h5>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto font-sans leading-relaxed">
                  Select any property mutation or transfer transaction on the ledger catalogue to begin clearance, assessor reviews, signature routines, or ledger execution.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* VIEW PANEL: PROPERTY OWNERSHIP HISTORY CHAIN */}
      {activeSubTab === "ownership_chain" && (
        <div className="bg-white border border-slate-200 rounded p-4 text-slate-850 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-bold text-slate-950 uppercase tracking-widest font-sans">Cadastral Ownership Ledgers</h4>
              <p className="text-[10px] text-slate-500 font-sans mt-0.5">Audit log of land asset mutations, transfer events, deed contracts, and acquisition types for Paete real properties.</p>
            </div>
            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-mono font-extrabold border border-slate-200">
              LEDGER COUNT: {ownershipHistory.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] font-sans">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-205 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-2 border border-slate-200">Owner Snapshot</th>
                  <th className="p-2 border border-slate-200">Land TDN Snapshot</th>
                  <th className="p-2 border border-slate-200">Acquisition Document</th>
                  <th className="p-2 border border-slate-200">Ownership span</th>
                  <th className="p-2 border border-slate-200">Log Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {ownershipHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400 font-sans">
                      No historical land ownership transfer entries registered in the registry catalog. Try posting a land transfer first.
                    </td>
                  </tr>
                ) : (
                  ownershipHistory.map(oh => (
                    <tr key={oh.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 border border-slate-200 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{oh.ownerNameSnapshot}</span>
                        </div>
                      </td>
                      <td className="p-2 border border-slate-200 font-mono font-bold text-slate-700">
                        <p>{oh.tdnSnapshot}</p>
                        <p className="text-[9.5px] text-slate-400 uppercase font-mono tracking-tight font-normal">{oh.pinSnapshot}</p>
                      </td>
                      <td className="p-2 border border-slate-200 text-slate-705">
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[9.5px] font-bold uppercase mr-1 border border-slate-200">
                          {oh.acquisitionType}
                        </span>
                        <span className="font-mono">{oh.documentReference}</span>
                      </td>
                      <td className="p-2 border border-slate-200 whitespace-nowrap text-slate-500 font-mono text-[10px]">
                        <p>Start: {oh.ownershipStartDate.split("T")[0]}</p>
                        <p>End: {oh.ownershipEndDate.split("T")[0]}</p>
                      </td>
                      <td className="p-2 border border-slate-200 italic text-slate-500 text-[10.5px]">
                        {oh.remarks || "No supplementary notation provided."}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW PANEL: STATUS & CANCELLATION LOGS */}
      {activeSubTab === "status_history" && (
        <div className="bg-white border border-slate-200 rounded p-4 text-slate-850 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-bold text-slate-950 uppercase tracking-widest font-sans">Registry Status & Property Log Auditing</h4>
              <p className="text-[10px] text-slate-500 font-sans mt-0.5">Immutable audit trails monitoring property status changes, consolidations, splits, and declaration updates.</p>
            </div>
            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-mono font-extrabold border border-slate-200">
              AUDITED CHANGER ROWS: {statusHistory.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] font-sans">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-205 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-2 border border-slate-200">Audited Property</th>
                  <th className="p-2 border border-slate-200">Status shift</th>
                  <th className="p-2 border border-slate-200">Audit Change Trigger Reason / Supporting Docs</th>
                  <th className="p-2 border border-slate-200">Assigned Operator / Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {statusHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-400 font-sans">
                      No property life-cycle status changes logged in audit trails.
                    </td>
                  </tr>
                ) : (
                  statusHistory.map(sh => {
                    const matchedProp = properties.find(p => p.id === sh.propertyId);
                    return (
                      <tr key={sh.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2 border border-slate-200 font-mono text-slate-700">
                          <strong>{matchedProp?.tdn || "Target ID: " + sh.propertyId}</strong>
                          <p className="text-[9px] font-mono font-normal tracking-tight text-slate-400 uppercase">{matchedProp?.pin}</p>
                        </td>
                        <td className="p-2 border border-slate-200">
                          <div className="flex items-center gap-1 font-mono text-[10px] font-bold">
                            <span className="text-red-500">{sh.previousStatus}</span>
                            <ArrowRight className="h-3 w-3 text-slate-500" />
                            <span className="text-emerald-500 uppercase">{sh.newStatus}</span>
                          </div>
                        </td>
                        <td className="p-2 border border-slate-200 font-bold text-slate-800 text-[10.5px]">
                          <p>{sh.reason}</p>
                          {sh.remarks && <p className="text-[9.5px] text-slate-400 italic font-normal">{sh.remarks}</p>}
                        </td>
                        <td className="p-2 border border-slate-200 whitespace-nowrap text-slate-500 font-mono text-[10px]">
                          <p>User: <strong className="text-slate-800">{sh.changedBy}</strong></p>
                          <p>{sh.changedAt.replace("T", " ").split(".")[0]}</p>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: COMPOSER TRANSITION CREATER */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-3 z-50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded max-w-4xl w-full text-slate-800 shadow-xl overflow-hidden animate-zoom-in">
            
            {/* Modal Header */}
            <div className="bg-slate-950 p-3 flex justify-between items-center text-white">
              <div className="flex items-center gap-1.5 font-sans font-bold">
                <GitFork className="h-4 w-4 text-amber-500" />
                <span>Assessor Mutation Ledger Composer</span>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-450 hover:text-white transition cursor-pointer text-sm font-bold font-mono px-2 py-0.5 rounded hover:bg-slate-900"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateMutation} className="p-4 space-y-4 max-h-[560px] overflow-y-auto">
              
              <div className="grid grid-cols-6 gap-4">
                
                {/* Field 1: Select Type */}
                <div className="col-span-3 space-y-1">
                  <label className="text-[10.5px] font-sans font-bold text-slate-650 uppercase block">Mutation Category Type</label>
                  <select
                    value={mutationType}
                    onChange={(e: any) => {
                      setMutationType(e.target.value);
                      resetForm();
                    }}
                    className="w-full bg-slate-50 border border-slate-250 rounded py-1 px-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  >
                    <option value="land_transfer">Land / Ownership Transfer</option>
                    <option value="subdivision">Property Subdivision (Splits)</option>
                    <option value="consolidation">Property Consolidation (Merges)</option>
                    <option value="reclassification">Class Reclassification (Agricultural/Commercial)</option>
                    <option value="assessment_revision">Assement Value Revision (Re-appraisal)</option>
                    <option value="cancellation">Official Structural Declaration Cancellation</option>
                  </select>
                </div>

                {/* Field 2: Selection of Source Mother (Hide if consolidation since consolidation merges many) */}
                {mutationType !== "consolidation" && (
                  <div className="col-span-3 space-y-1">
                    <label className="text-[10.5px] font-sans font-bold text-slate-650 uppercase block">Select Reference Target Property</label>
                    <select
                      value={sourcePropId}
                      onChange={(e) => setSourcePropId(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-250 rounded py-1 px-1.5 text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Choose active land property --</option>
                      {properties.filter(p => p.status === "active").map(p => (
                        <option key={p.id} value={p.id}>
                          {p.tdn} - [PIN: {p.pin}] - {p.ownerName} ({p.area} sqm, {p.classification})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* If Consolidation: Choose multiselections */}
                {mutationType === "consolidation" && (
                  <div className="col-span-6 space-y-1.5 bg-slate-50 p-2.5 rounded border border-slate-200">
                    <label className="text-[10.5px] font-sans font-bold text-slate-700 uppercase block">Mark adjacent property records to consolidate (Select 2+)</label>
                    <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto pr-1">
                      {properties.filter(p => p.status === "active").map(p => {
                        const isChecked = selectedConsolidationSources.includes(p.id);
                        return (
                          <label key={p.id} className="flex gap-2 items-start text-[10.5px] font-sans bg-white p-1.5 border border-slate-150 rounded cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedConsolidationSources(selectedConsolidationSources.filter(id => id !== p.id));
                                } else {
                                  setSelectedConsolidationSources([...selectedConsolidationSources, p.id]);
                                }
                              }}
                              className="mt-0.5"
                            />
                            <div>
                              <p className="font-bold font-mono text-slate-900">{p.tdn}</p>
                              <p className="text-slate-500">{p.ownerName} • {p.area} sqm</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 1. Details for Ownership Transfer */}
                {mutationType === "land_transfer" && (
                  <div className="col-span-6 grid grid-cols-6 gap-3 bg-emerald-50/50 p-3 rounded border border-emerald-100">
                    <div className="col-span-6 border-b border-emerald-150 pb-1 text-[10.5px] font-extrabold uppercase text-emerald-800">
                      Ownership Transfer specifications
                    </div>

                    <div className="col-span-3 space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 block">Select target New Taxpayer Owner</label>
                      <select
                        value={newTaxpayerId}
                        onChange={(e) => setNewTaxpayerId(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-250 rounded py-1 px-1.5 text-xs focus:outline-none focus:border-amber-500"
                      >
                        <option value="">-- Choose registered taxpayer --</option>
                        {taxpayers.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.lastName}, {t.firstName} {t.companyName ? `(${t.companyName})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-3 space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 block">Transfer Type</label>
                      <select
                        value={transferType}
                        onChange={(e) => setTransferType(e.target.value)}
                        className="w-full bg-white border border-slate-250 rounded py-1 px-1.5 text-xs focus:outline-none focus:border-amber-500"
                      >
                        <option value="sale">Deed of Absolute Sale</option>
                        <option value="donation">Deed of Donation</option>
                        <option value="inheritance">Inheritance / Estate Transfer</option>
                        <option value="court_order">Court Final Order</option>
                        <option value="extrajudicial">Extrajudicial Settlement</option>
                      </select>
                    </div>

                    <div className="col-span-3 space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 block">Deed Document Reference / Ins. No.</label>
                      <input
                        type="text"
                        placeholder="e.g. Doc. No. 12, Page 3, Book 5"
                        value={deedReference}
                        onChange={(e) => setDeedReference(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-250 rounded py-1 px-1.5 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="col-span-3 space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 block font-mono">Spawned TDN Output (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. TD-2026-PAETE-0081"
                        value={newTdnValue}
                        onChange={(e) => setNewTdnValue(e.target.value)}
                        className="w-full bg-white border border-slate-250 rounded py-1 px-1.5 text-xs focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* 2. Details for Subdivision */}
                {mutationType === "subdivision" && (
                  <div className="col-span-6 bg-blue-50/50 p-3 rounded border border-blue-150 space-y-3">
                    <div className="flex justify-between items-center border-b border-blue-200 pb-1.5">
                      <span className="text-[10.5px] font-extrabold uppercase text-blue-805 text-blue-800">Offspring Target Subdivision Lots Specs</span>
                      <button
                        type="button"
                        onClick={addSubdivisionLotRow}
                        className="p-1 px-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[9.5px] tracking-wide font-extrabold transition cursor-pointer"
                      >
                        + Add Lot Row
                      </button>
                    </div>

                    <div className="space-y-2 border border-slate-200/50 p-1.5 rounded bg-white">
                      {childLots.map((l, lIdx) => (
                        <div key={lIdx} className="grid grid-cols-12 gap-1.5 items-end pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                          
                          <div className="col-span-2">
                            <span className="text-[8.5px] font-bold text-slate-500 block uppercase font-sans">Lot Ref</span>
                            <input
                              type="text"
                              value={l.lotNo}
                              onChange={(e) => updateSubdivisionLotRow(lIdx, "lotNo", e.target.value)}
                              required
                              className="w-full bg-slate-50 border border-slate-200 py-0.5 px-1 rounded text-[10px]"
                            />
                          </div>

                          <div className="col-span-2">
                            <span className="text-[8.5px] font-bold text-slate-500 block uppercase">Area (sqm)</span>
                            <input
                              type="number"
                              value={l.area}
                              onChange={(e) => updateSubdivisionLotRow(lIdx, "area", e.target.value)}
                              required
                              className="w-full bg-slate-50 border border-slate-200 py-0.5 px-1 rounded text-[10px]"
                            />
                          </div>

                          <div className="col-span-3">
                            <span className="text-[8.5px] font-bold text-slate-500 block uppercase">Assigned Taxpayer Owner</span>
                            <select
                              value={l.ownerId}
                              onChange={(e) => updateSubdivisionLotRow(lIdx, "ownerId", e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 py-0.5 px-0.5 rounded text-[10px]"
                            >
                              <option value="">-- Same Mother Owner --</option>
                              {taxpayers.map(t => (
                                <option key={t.id} value={t.id}>{t.lastName}, {t.firstName}</option>
                              ))}
                            </select>
                          </div>

                          <div className="col-span-2">
                            <span className="text-[8.5px] font-bold text-slate-500 block uppercase font-mono">FMV (₱)</span>
                            <input
                              type="number"
                              value={l.fairMarketValue}
                              onChange={(e) => updateSubdivisionLotRow(lIdx, "fairMarketValue", e.target.value)}
                              required
                              className="w-full bg-slate-50 border border-slate-200 py-0.5 px-1 rounded text-[10px]"
                            />
                          </div>

                          <div className="col-span-2">
                            <span className="text-[8.5px] font-bold text-slate-500 block uppercase font-mono">Assess Level (%)</span>
                            <input
                              type="number"
                              value={l.assessmentLevel}
                              onChange={(e) => updateSubdivisionLotRow(lIdx, "assessmentLevel", e.target.value)}
                              required
                              className="w-full bg-slate-50 border border-slate-200 py-0.5 px-1 rounded text-[10px]"
                            />
                          </div>

                          <div className="col-span-1 text-center">
                            <button
                              type="button"
                              onClick={() => removeSubdivisionLotRow(lIdx)}
                              className="text-red-500 hover:text-red-750 transition p-1 hover:bg-slate-100 rounded"
                              title="Delete sub title line"
                            >
                              <Trash2 className="h-3 w-3 inline" />
                            </button>
                          </div>

                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center bg-slate-100 p-2 rounded text-[11px] text-slate-600 font-sans">
                      <p>Total Mapped Child Area: <strong className="text-slate-900">{childLots.reduce((sum, l) => sum + (parseFloat(l.area) || 0), 0)} sqm</strong></p>
                      
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={overrideAreaCheck}
                          onChange={(e) => setOverrideAreaCheck(e.target.checked)}
                          className="mt-0.5"
                        />
                        <span>Allow override total mother area checks</span>
                      </label>
                    </div>

                  </div>
                )}

                {/* 3. Details for Reclassification */}
                {mutationType === "reclassification" && (
                  <div className="col-span-6 grid grid-cols-2 gap-3 bg-purple-50/50 p-3 rounded border border-purple-100">
                    <div className="col-span-2 border-b border-purple-200 pb-1 text-[10.5px] font-extrabold uppercase text-purple-800">
                      Reclassification category changes
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-605 block">Target Classification category</label>
                      <select
                        value={newClassification}
                        onChange={(e) => setNewClassification(e.target.value)}
                        className="w-full bg-white border border-slate-250 py-1 px-1.5 text-xs rounded focus:outline-none focus:border-amber-500"
                      >
                        <option value="residential">Residential (20% Assess)</option>
                        <option value="commercial">Commercial (50% Assess)</option>
                        <option value="industrial">Industrial (50% Assess)</option>
                        <option value="agricultural">Agricultural (40% Assess)</option>
                        <option value="mineral">Mineral (50% Assess)</option>
                        <option value="timberland">Timberland (20% Assess)</option>
                        <option value="special">Special (10% Assess)</option>
                      </select>
                    </div>

                    <div className="space-y-1 text-slate-400 italic text-[10px] leading-relaxed flex items-center pt-3 select-none">
                      Reclassifying standard sectors updates their core multiplier assessments level according to local treasury laws in Paete, Laguna.
                    </div>
                  </div>
                )}

                {/* 4. Details for Assessment Revision */}
                {mutationType === "assessment_revision" && (
                  <div className="col-span-6 grid grid-cols-3 gap-3 bg-amber-50/50 p-3 rounded border border-amber-100">
                    <div className="col-span-3 border-b border-amber-200 pb-1 text-[10.5px] font-extrabold uppercase text-amber-800">
                      Evaluation & Fair Market Appraisals Revision
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 block">Revised Fair Market Value (₱)</label>
                      <input
                        type="number"
                        value={revisedFmv}
                        onChange={(e) => setRevisedFmv(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-250 rounded py-1 px-1.5 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 block col-span-1">Assessment level (%)</label>
                      <input
                        type="number"
                        value={revisedAssessmentLevel}
                        onChange={(e) => setRevisedAssessmentLevel(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-250 rounded py-1 px-1.5 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 block">Computed Assessed Value (₱)</label>
                      <input
                        type="text"
                        disabled
                        value={((parseFloat(revisedFmv) * parseFloat(revisedAssessmentLevel)) / 100).toLocaleString() || "0"}
                        className="w-full bg-slate-100 border border-slate-250 rounded py-1 px-1.5 text-xs font-mono font-bold text-slate-700"
                      />
                    </div>
                  </div>
                )}

                {/* 5. Details for Cancellation */}
                {mutationType === "cancellation" && (
                  <div className="col-span-6 grid grid-cols-2 gap-3 bg-red-50/50 p-3 rounded border border-red-100">
                    <div className="col-span-2 border-b border-red-200 pb-1 text-[10.5px] font-extrabold uppercase text-red-800">
                      CANCELLATION AND DISABILITY REGISTERS
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 block">Cancellation Core Reason</label>
                      <select
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="w-full bg-white border border-slate-250 rounded py-1 px-1.5 text-xs focus:outline-none focus:border-amber-500"
                      >
                        <option value="government_acquisition">LGU Public Domain / Eminent Domain Acquisition</option>
                        <option value="erroneous_entry">Erroneous Dual Duplicate Declaration Entry</option>
                        <option value="demolished_structure">Retirement or Demolition of Building Structure</option>
                        <option value="taxpayer_disability">Cancellation due to Legal Boundary Court Judgement</option>
                      </select>
                    </div>

                    <div className="space-y-1 text-slate-500 text-[10.5px] leading-snug pt-3 italic">
                      Warning: Structural cancellations permanently strip target property declarations from future municipal tax bill assessments. Prior billing delinquencies must remain cleared.
                    </div>
                  </div>
                )}

                {/* Field 3: Effectivity Year */}
                <div className="col-span-3 space-y-1 mt-2">
                  <label className="text-[10.5px] font-sans font-bold text-slate-650 uppercase block">Assessment Effectivity Year</label>
                  <input
                    type="number"
                    value={effectivityYear}
                    onChange={(e) => setEffectivityYear(parseInt(e.target.value))}
                    required
                    min={2020}
                    max={2030}
                    className="w-full bg-slate-50 border border-slate-250 rounded py-1 px-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Field 4: Description / Remarks */}
                <div className="col-span-3 space-y-1 mt-2">
                  <label className="text-[10.5px] font-sans font-bold text-slate-650 uppercase block">Supplementary Remarks & Annotations</label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. Approved and certified under Municipal Ordinance 25"
                    className="w-full bg-slate-50 border border-slate-250 rounded py-1 px-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-205 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-bold cursor-pointer transition"
                >
                  Close Composer
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-550 text-white rounded font-bold cursor-pointer transition flex items-center gap-1"
                  id="btn_confirm_submit_mutation"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {isLoading ? "Compiling..." : "Save Transaction Envelope"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
