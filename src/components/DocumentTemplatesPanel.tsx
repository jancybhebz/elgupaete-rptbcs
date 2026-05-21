import React, { useState, useEffect, useRef } from "react";
import {
  FileSpreadsheet,
  Plus,
  Search,
  FileCode,
  Save,
  CheckCircle,
  Copy,
  Printer,
  History,
  FileText,
  Clock,
  Eye,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Layout,
  Sliders,
  Sparkles,
  Layers,
  ArrowBigLeft,
  AlertTriangle,
  Flame,
  User,
  Info,
  Download
} from "lucide-react";
import { DocumentTemplate, DocumentTemplateVersion, GeneratedDocument, User as SystemUser } from "../types";

interface DocumentTemplatesPanelProps {
  currentUser: SystemUser | null;
  onRefresh?: () => void;
}

export default function DocumentTemplatesPanel({
  currentUser,
  onRefresh
}: DocumentTemplatesPanelProps) {
  // Navigation Tabs: "editor" (Manage/Create/Edit Layouts), "archive" (See printed ledger)
  const [activeSubTab, setActiveSubTab] = useState<"editor" | "archive">("editor");

  // Core Data Lists
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [versions, setVersions] = useState<DocumentTemplateVersion[]>([]);
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocument[]>([]);

  // Search and Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [archiveQuery, setArchiveQuery] = useState("");

  // Editor states
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [selectedEditorTab, setSelectedEditorTab] = useState<"header" | "body" | "footer" | "css">("body");
  const [changeRemark, setChangeRemark] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Form states for Create/Edit
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formCategory, setFormCategory] = useState("billing");
  const [formType, setFormType] = useState("Statement of Account");
  const [formDesc, setFormDesc] = useState("");
  const [formPaperSize, setFormPaperSize] = useState<"A4" | "Letter" | "Legal" | "Custom">("Letter");
  const [formOrientation, setFormOrientation] = useState<"portrait" | "landscape">("portrait");
  const [formMarginTop, setFormMarginTop] = useState(10);
  const [formMarginRight, setFormMarginRight] = useState(10);
  const [formMarginBottom, setFormMarginBottom] = useState(10);
  const [formMarginLeft, setFormMarginLeft] = useState(10);
  const [formHeader, setFormHeader] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formFooter, setFormFooter] = useState("");
  const [formCss, setFormCss] = useState("");
  const [formVariables, setFormVariables] = useState<string[]>([]);
  const [formIsDefault, setFormIsDefault] = useState(false);

  // Preview Sandbox state
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<"draft" | "final" | "voided" | "cancelled">("draft");

  // Print Iframe Modal states
  const [viewingDoc, setViewingDoc] = useState<GeneratedDocument | null>(null);
  const [docModalHtml, setDocModalHtml] = useState("");
  const [docModalLoading, setDocModalLoading] = useState(false);

  // Load All Templates and Generated Archive Logs
  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/document-templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
        if (data.length > 0 && !selectedTemplate && !isCreatingNew) {
          // Select default or first
          const def = data.find((t: DocumentTemplate) => t.isDefault) || data[0];
          selectTemplateHandler(def);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVersions = async (templateId: number) => {
    try {
      const res = await fetch(`/api/document-templates/${templateId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchGeneratedDocs = async () => {
    try {
      const res = await fetch("/api/generated-documents");
      if (res.ok) {
        const data = await res.json();
        setGeneratedDocs(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchGeneratedDocs();
  }, []);

  const selectTemplateHandler = (tpl: DocumentTemplate) => {
    setSelectedTemplate(tpl);
    setIsCreatingNew(false);
    setChangeRemark("");

    // Map fields
    setFormCode(tpl.templateCode);
    setFormName(tpl.templateName);
    setFormCategory(tpl.templateCategory);
    setFormType(tpl.documentType);
    setFormDesc(tpl.description);
    setFormPaperSize(tpl.paperSize);
    setFormOrientation(tpl.orientation);
    setFormMarginTop(tpl.marginTop);
    setFormMarginRight(tpl.marginRight);
    setFormMarginBottom(tpl.marginBottom);
    setFormMarginLeft(tpl.marginLeft);
    setFormHeader(tpl.headerHtml);
    setFormBody(tpl.bodyHtml);
    setFormFooter(tpl.footerHtml);
    setFormCss(tpl.cssStyles);
    setFormIsDefault(tpl.isDefault);
    try {
      setFormVariables(JSON.parse(tpl.availableVariables || "[]"));
    } catch (err) {
      setFormVariables([]);
    }

    fetchVersions(tpl.id);
  };

  // Trigger dynamic preview from the backend preview renderer
  const refreshPreviewOutput = async (statusOverride?: "draft" | "final" | "voided" | "cancelled") => {
    setPreviewLoading(true);
    try {
      const payload = {
        headerHtml: formHeader,
        bodyHtml: formBody,
        footerHtml: formFooter,
        cssStyles: formCss,
        paperSize: formPaperSize,
        orientation: formOrientation,
        marginTop: formMarginTop,
        marginRight: formMarginRight,
        marginBottom: formMarginBottom,
        marginLeft: formMarginLeft,
        status: statusOverride || previewStatus
      };

      const res = await fetch("/api/document-templates/preview-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const h = await res.text();
        setPreviewHtml(h);
      } else {
        setPreviewHtml("<h3>Error generating layout preview. Check syntax or server logs.</h3>");
      }
    } catch (err) {
      console.error(err);
      setPreviewHtml("<h3>Error making API preview request. Keep server alive.</h3>");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Automatically refresh preview output on template component switches
  useEffect(() => {
    if (formBody || formHeader || formFooter || formCss) {
      const delayDebounceFn = setTimeout(() => {
        refreshPreviewOutput();
      }, 350);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [
    formHeader,
    formBody,
    formFooter,
    formCss,
    formPaperSize,
    formOrientation,
    formMarginTop,
    formMarginRight,
    formMarginBottom,
    formMarginLeft,
    previewStatus
  ]);

  const handleStartCreateNew = () => {
    setIsCreatingNew(true);
    setSelectedTemplate(null);
    setVersions([]);
    
    // Clear forms with an elegant template base layout
    setFormCode("NEW_TEMPLATE");
    setFormName("Unassigned Printable Template");
    setFormCategory("billing");
    setFormType("Statement of Account");
    setFormDesc("General printable layout manager.");
    setFormPaperSize("Letter");
    setFormOrientation("portrait");
    setFormMarginTop(12);
    setFormMarginRight(12);
    setFormMarginBottom(12);
    setFormMarginLeft(12);
    setFormHeader(`<div style="text-align: center; font-family: sans-serif; border-bottom: 2px solid #0f172a; padding-bottom: 8px;">\n  <h2 style="margin: 0; color: #0f172a; font-size: 18px;">{{lgu_name}}</h2>\n  <h4 style="margin: 2px 0; color: #64748b; font-size: 11px; font-weight: normal;">Province of {{province}}, Municipality of {{municipality}}</h4>\n  <p style="margin: 2px 0 0 0; font-size: 10px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; color: #475569;">{{office_name}}</p>\n</div>`);
    setFormBody(`<div style="font-family: sans-serif; padding-top: 15px;">\n  <div style="text-align: center; margin-bottom: 15px;">\n    <h3 style="margin: 0; text-transform: uppercase; font-size: 15px; letter-spacing: 1px; color: #0f172a;">{{document_title}}</h3>\n    <p style="margin: 3px 0; font-size: 11px;">Document No: <span style="font-family: monospace; font-weight: bold; color: #dc2626;">{{document_number}}</span></p>\n  </div>\n\n  <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 15px;">\n    <tr>\n      <td style="padding: 4px; font-weight: bold; width: 22%; color: #475569;">Taxpayer Name:</td>\n      <td style="padding: 4px; border-bottom: 1px solid #e2e8f0; width: 78%; font-weight: 500;">{{taxpayer_name}}</td>\n    </tr>\n    <tr>\n      <td style="padding: 4px; font-weight: bold; color: #475569;">Property PIN Reference:</td>\n      <td style="padding: 4px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">{{property_pin}}</td>\n    </tr>\n  </table>\n\n  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px; margin-bottom: 15px;">\n    <p style="margin: 0; font-size: 11px; font-weight: bold;">Standard Template Variable Resolution Demonstration:</p>\n    <p style="margin: 5px 0 0 0; font-size: 11px; line-height: 1.4;">The total outstanding dues parsed for billing year {{billing_year}} aggregates to <strong>Php {{total_due}}</strong>.</p>\n  </div>\n</div>`);
    setFormFooter(`<div style="border-top: 1px solid #e2e8f0; padding-top: 6px; font-family: sans-serif; font-size: 9px; text-align: center; color: #94a3b8; width: 100%;">\n  <span>Generated On: <strong>{{generated_at}}</strong> | Signed By Order of Treasury</span>\n</div>`);
    setFormCss(`body { font-family: sans-serif; }`);
    setFormVariables(["lgu_name", "province", "municipality", "office_name", "document_title", "document_number", "taxpayer_name", "property_pin", "total_due", "billing_year", "generated_at"]);
    setFormIsDefault(false);
  };

  const handleSaveCreate = async () => {
    setIsSaving(true);
    try {
      const payload = {
        templateCode: formCode,
        templateName: formName,
        templateCategory: formCategory,
        documentType: formType,
        description: formDesc,
        paperSize: formPaperSize,
        orientation: formOrientation,
        marginTop: formMarginTop,
        marginRight: formMarginRight,
        marginBottom: formMarginBottom,
        marginLeft: formMarginLeft,
        headerHtml: formHeader,
        bodyHtml: formBody,
        footerHtml: formFooter,
        cssStyles: formCss,
        availableVariables: JSON.stringify(formVariables),
        isDefault: formIsDefault
      };

      const endpoint = isCreatingNew ? "/api/document-templates" : `/api/document-templates/${selectedTemplate?.id}`;
      const method = isCreatingNew ? "POST" : "PUT";

      const finalPayload = isCreatingNew ? payload : { ...payload, changeSummary: changeRemark || "Updated template layouts." };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload)
      });

      if (res.ok) {
        const saved = await res.json();
        alert(isCreatingNew ? "Successfully created new document template!" : "Template revisions saved successfully!");
        setChangeRemark("");
        
        // Refresh
        await fetchTemplates();
        selectTemplateHandler(saved);
        if (onRefresh) onRefresh();
      } else {
        const err = await res.json();
        alert(`Error saving template structure: ${err.message || "Unknown server fault"}`);
      }
    } catch (e) {
      console.error(e);
      alert("Network failure saving dynamic template attributes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!selectedTemplate) return;
    setIsDuplicating(true);
    try {
      const res = await fetch(`/api/document-templates/${selectedTemplate.id}/duplicate`, {
        method: "POST"
      });
      if (res.ok) {
        const dup = await res.json();
        alert(`Duplicated layout created successfully as: ${dup.templateName}`);
        await fetchTemplates();
        selectTemplateHandler(dup);
      } else {
        alert("Failed to duplicate existing template layout.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedTemplate) return;
    if (!confirm("Are you sure you want to verify and authorize this document layout template? This moves it from 'DRAFT' status to 'APPROVED' status so final official documents can be printed without draft watermarks.")) return;

    setIsApproving(true);
    try {
      const res = await fetch(`/api/document-templates/${selectedTemplate.id}/approve`, {
        method: "POST"
      });
      if (res.ok) {
        const approved = await res.json();
        alert(`Authorized released layout template: ${approved.templateName}`);
        await fetchTemplates();
        selectTemplateHandler(approved);
      } else {
        alert("Authorization process returned error. Contact engineering.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsApproving(false);
    }
  };

  const handleRestoreVersion = async (verId: number, verNum: number) => {
    if (!selectedTemplate) return;
    if (!confirm(`Are you absolutely sure you want to rollback this template layout to Version ${verNum}? This creates a new version containing this rolled design.`)) return;

    try {
      const res = await fetch(`/api/document-templates/${selectedTemplate.id}/restore-version`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: verId })
      });
      if (res.ok) {
        const restored = await res.json();
        alert(`Rollback completed successfully. Workspace set to restored layout.`);
        await fetchTemplates();
        selectTemplateHandler(restored);
      } else {
        alert("Failed to execute layout rollback.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Generated document printing modal view trigger
  const handleOpenPrintPreview = async (doc: GeneratedDocument) => {
    setViewingDoc(doc);
    setDocModalLoading(true);
    try {
      const res = await fetch(`/api/generated-documents/view/${doc.documentNumber}`);
      if (res.ok) {
        const html = await res.text();
        setDocModalHtml(html);
      } else {
        setDocModalHtml("<h3>Unable to fetch generated layout voucher on the filesystem.</h3>");
      }
    } catch (e) {
      setDocModalHtml("<h3>Physical retrieval path failed on sandbox proxy server.</h3>");
    } finally {
      setDocModalLoading(false);
    }
  };

  // Filter templates list based on search and filters
  const filteredTemplates = templates.filter(t => {
    const codeMatch = t.templateCode.toLowerCase().includes(searchQuery.toLowerCase());
    const nameMatch = t.templateName.toLowerCase().includes(searchQuery.toLowerCase());
    const typeMatch = t.documentType.toLowerCase().includes(searchQuery.toLowerCase());
    const queryMatches = searchQuery === "" || codeMatch || nameMatch || typeMatch;

    const categoryMatches = filterCategory === "all" || t.templateCategory === filterCategory;

    return queryMatches && categoryMatches;
  });

  // Filter generated archive log
  const filteredArchive = generatedDocs.filter(d => {
    const docNumMatch = d.documentNumber.toLowerCase().includes(archiveQuery.toLowerCase());
    const typeMatch = d.documentType.toLowerCase().includes(archiveQuery.toLowerCase());
    const genByMatch = d.generatedBy.toLowerCase().includes(archiveQuery.toLowerCase());
    const hashMatch = d.fileHash.toLowerCase().includes(archiveQuery.toLowerCase());
    return archiveQuery === "" || docNumMatch || typeMatch || genByMatch || hashMatch;
  });

  // Dynamic Variable Insertion Trigger Helper
  const insertVariableAtCursor = (variable: string) => {
    const formatted = `{{${variable}}}`;
    
    // Simple manual append in active editing context
    if (selectedEditorTab === "header") {
      setFormHeader(prev => prev + " " + formatted);
    } else if (selectedEditorTab === "body") {
      setFormBody(prev => prev + " " + formatted);
    } else if (selectedEditorTab === "footer") {
      setFormFooter(prev => prev + " " + formatted);
    }
    
    // Add variable to local track
    if (!formVariables.includes(variable)) {
      setFormVariables(prev => [...prev, variable]);
    }
  };

  const variablesGlossary = [
    { category: "LGU settings", keys: ["lgu_name", "province", "municipality", "office_name"] },
    { category: "Metadata & Serials", keys: ["document_title", "document_number", "prepared_by", "approved_by", "generated_at"] },
    { category: "Taxpayers", keys: ["taxpayer_name", "taxpayer_address"] },
    { category: "RPT Valuations", keys: ["property_pin", "property_tdn", "property_location", "barangay", "classification", "fair_market_value", "assessment_level", "assessed_value"] },
    { category: "Billing Details", keys: ["basic_rpt_rate", "sef_rate", "total_due", "billing_year", "amount_paid", "balance"] },
    { category: "Official Receipt & payments", keys: ["or_number", "payment_date", "cashier_name", "verified_code", "verification_url"] }
  ];

  return (
    <div className="space-y-6 container mx-auto px-1 max-w-7xl font-sans text-xs" id="templates_manager_ledger">
      
      {/* Header and Toggle Rails */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 border border-slate-800 shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" id="template_banner_header">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-500 text-slate-900 rounded-full font-bold uppercase tracking-wider text-[9px]">LGU Governance Desk</span>
            <span className="text-[10px] text-slate-400 font-mono">AUTHORIZED ONLY</span>
          </div>
          <h3 className="text-xl font-extrabold text-white mt-1.5 font-sans tracking-tight flex items-center gap-2"><FileSpreadsheet className="h-5.5 w-5.5 text-amber-500" /> Document Templates & Layouts Engine</h3>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">Customize WYSIWYG printing stylesheets, tax declaration headers, official receipts layouts, and billing Statement of Accounts securely.</p>
        </div>

        {/* View Mode Switcher */}
        <div className="bg-slate-950/60 p-1 rounded-xl border border-slate-800 flex gap-1">
          <button
            type="button"
            onClick={() => setActiveSubTab("editor")}
            className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer text-xs ${
              activeSubTab === "editor"
                ? "bg-amber-600 text-white shadow-md shadow-amber-605/10"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileCode className="h-4.5 w-4.5" />
            Template Editor Config
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSubTab("archive");
              fetchGeneratedDocs();
            }}
            className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer text-xs ${
              activeSubTab === "archive"
                ? "bg-amber-600 text-white shadow-md shadow-amber-650/10"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Printer className="h-4.5 w-4.5" />
            Generated Prints Log
          </button>
        </div>
      </div>

      {activeSubTab === "editor" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="template_editor_dock">
          
          {/* LEFT: Templates Catalog Selection Drawer */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4 max-h-[820px] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Templates Catalog</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Select a layout stylesheet to edit</p>
              </div>
              <button
                type="button"
                onClick={handleStartCreateNew}
                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer transition text-[9px] uppercase tracking-wider"
              >
                <Plus className="h-3.5 w-3.5" /> New Layout
              </button>
            </div>

            {/* Catalog search/Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-450 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search code/name..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs font-sans outline-none focus:border-slate-400 focus:bg-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Tag Categories filter */}
              <div className="flex flex-wrap gap-1">
                {["all", "billing", "receipt", "certification", "faas"].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFilterCategory(cat)}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition hover:opacity-100 cursor-pointer ${
                      filterCategory === cat
                        ? "bg-slate-800 text-white"
                        : "bg-slate-105 bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Template lists ledger */}
            <div className="space-y-2">
              {filteredTemplates.length > 0 ? (
                filteredTemplates.map(tpl => {
                  const isSelected = selectedTemplate?.id === tpl.id && !isCreatingNew;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => selectTemplateHandler(tpl)}
                      className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer text-left space-y-1.5 relative ${
                        isSelected
                          ? "bg-slate-50 border-amber-500 shadow-sm ring-1 ring-amber-500/10"
                          : "hover:bg-slate-50 border-slate-100"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-mono font-extrabold text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{tpl.templateCode}</span>
                        <div className="flex items-center gap-1.5">
                          {tpl.isDefault && (
                            <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded text-[8px] uppercase">Default</span>
                          )}
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${
                            tpl.status === "approved"
                              ? "bg-emerald-55 bg-emerald-50 text-emerald-600 border-emerald-100"
                              : "bg-amber-50 text-amber-600 border-amber-100"
                          }`}>
                            {tpl.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-bold text-slate-800 text-xs font-sans line-clamp-1">{tpl.templateName}</h5>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{tpl.description || "No layout description listed."}</p>
                      </div>

                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono border-t pt-1.5">
                        <span className="uppercase text-slate-500 font-bold">{tpl.templateCategory}</span>
                        <span>Size: {tpl.paperSize} ({tpl.orientation})</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-400 border border-dashed rounded-xl space-y-2">
                  <FileText className="h-8 w-8 mx-auto text-slate-300" />
                  <p className="text-xs">No matching templates found in database.</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Document Template Layout Composer and Sandbox Visualizer */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Template attributes editor card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              
              {/* Card header with context */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-slate-850 text-slate-800 text-sm font-sans flex items-center gap-1.5">
                      <Layout className="h-4.5 w-4.5 text-amber-600" />
                      {isCreatingNew ? "Creating New Document Template Definition" : `Template Composer: ${formName}`}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">
                    {isCreatingNew ? "Design custom HTML coordinates from scratch" : `Layout Code: ${formCode} • Managed by ${selectedTemplate?.createdBy || "Author"}`}
                  </p>
                </div>

                {/* Status Indicator Pill */}
                {!isCreatingNew && selectedTemplate && (
                  <div className="flex items-center gap-2 bg-slate-50 border p-2 rounded-xl text-left">
                    <ShieldCheck className={`h-4.5 w-4.5 ${selectedTemplate.status === "approved" ? "text-emerald-500" : "text-amber-500"}`} />
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold">Template Governance</span>
                      <strong className="text-[10px] text-slate-700 capitalize font-sans">{selectedTemplate.status.replace("_", " ")}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Form grid metadata fields */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="sm:col-span-1">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Template Code</label>
                  <input
                    type="text"
                    disabled={!isCreatingNew}
                    className={`w-full bg-white border rounded p-2 font-mono font-bold uppercase ${!isCreatingNew ? "text-slate-400 bg-slate-105" : "text-slate-800 border-slate-200"}`}
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Friendly Template Name</label>
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-200 rounded p-2 text-slate-800 font-semibold"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Document Category</label>
                  <select
                    className="w-full bg-white border border-slate-200 rounded p-2 cursor-pointer text-slate-700 font-bold"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    <option value="billing">billing (SOA/Notices)</option>
                    <option value="receipt">receipt (OR Printouts)</option>
                    <option value="certification">certification</option>
                    <option value="faas">faas summaries</option>
                    <option value="general">general layout</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Target Document Type Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Statement of Account, Tax Clearance"
                    className="w-full bg-white border border-slate-200 rounded p-2 text-slate-850"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Description / Internal Rules</label>
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-200 rounded p-2 text-slate-500"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                  />
                </div>

                {/* Page Setup Attributes */}
                <div className="sm:col-span-1">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Paper Dimensions</label>
                  <select
                    className="w-full bg-white border border-slate-200 rounded p-2 cursor-pointer font-bold"
                    value={formPaperSize}
                    onChange={(e) => setFormPaperSize(e.target.value as any)}
                  >
                    <option value="Letter">Letter (US Commercial)</option>
                    <option value="A4">A4 (Standard ISO)</option>
                    <option value="Legal">Legal (US Government)</option>
                    <option value="Custom">Custom Envelopes</option>
                  </select>
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Orientation</label>
                  <div className="flex gap-2 pt-1">
                    <label className="flex items-center gap-1 cursor-pointer font-bold">
                      <input
                        type="radio"
                        name="layout_orientation"
                        value="portrait"
                        checked={formOrientation === "portrait"}
                        onChange={() => setFormOrientation("portrait")}
                        className="cursor-pointer"
                      />
                      Portrait
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer font-bold">
                      <input
                        type="radio"
                        name="layout_orientation"
                        value="landscape"
                        checked={formOrientation === "landscape"}
                        onChange={() => setFormOrientation("landscape")}
                        className="cursor-pointer"
                      />
                      Landscape
                    </label>
                  </div>
                </div>

                {/* Margins */}
                <div className="sm:col-span-2 font-mono grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[8px] uppercase tracking-tight font-extrabold text-slate-400 mb-0.5">Top Margin(mm)</label>
                    <input
                      type="number"
                      className="w-full bg-white border rounded p-1 text-center"
                      value={formMarginTop}
                      onChange={(e) => setFormMarginTop(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] uppercase tracking-tight font-extrabold text-slate-400 mb-0.5">Right(mm)</label>
                    <input
                      type="number"
                      className="w-full bg-white border rounded p-1 text-center"
                      value={formMarginRight}
                      onChange={(e) => setFormMarginRight(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] uppercase tracking-tight font-extrabold text-slate-400 mb-0.5">Bottom(mm)</label>
                    <input
                      type="number"
                      className="w-full bg-white border rounded p-1 text-center"
                      value={formMarginBottom}
                      onChange={(e) => setFormMarginBottom(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] uppercase tracking-tight font-extrabold text-slate-400 mb-0.5">Left(mm)</label>
                    <input
                      type="number"
                      className="w-full bg-white border rounded p-1 text-center"
                      value={formMarginLeft}
                      onChange={(e) => setFormMarginLeft(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              {/* Layout Editor Workspace Tabs and Action Panel */}
              <div className="space-y-4">
                
                {/* HTML layout block tab triggers */}
                <div className="flex border-b pb-0.5 justify-between items-center">
                  <div className="flex gap-1">
                    {[
                      { id: "header", label: "Header HTML block", color: "text-blue-600 bg-blue-50 border-blue-200" },
                      { id: "body", label: "Body HTML Payload", color: "text-amber-600 bg-amber-50 border-amber-200" },
                      { id: "footer", label: "Footer HTML block", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
                      { id: "css", label: "Core CSS Sheet Rules", color: "text-slate-600 bg-slate-50 border-slate-200" }
                    ].map(tb => (
                      <button
                        key={tb.id}
                        type="button"
                        onClick={() => setSelectedEditorTab(tb.id as any)}
                        className={`px-3 py-1.5 rounded-t-lg font-bold border-t border-x transition cursor-pointer text-xs ${
                          selectedEditorTab === tb.id
                            ? `${tb.color} border-slate-200 -mb-0.5 pb-2 bg-gradient-to-t]`
                            : "bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100"
                        }`}
                      >
                        {tb.label}
                      </button>
                    ))}
                  </div>

                  {/* Settings toggles */}
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-600">
                    <input
                      type="checkbox"
                      checked={formIsDefault}
                      onChange={(e) => setFormIsDefault(e.target.checked)}
                      className="cursor-pointer"
                    />
                    Mark as Default Layout
                  </label>
                </div>

                {/* Split design layouts Workspace */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  
                  {/* HTML editing block area */}
                  <div className="md:col-span-8 space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded-t-lg">
                      <span className="uppercase text-amber-500 font-bold tracking-tight">Active Workspace Editor • Raw Codes</span>
                      <span>Variables resolved via double-braces keys</span>
                    </div>
                    {selectedEditorTab === "header" && (
                      <textarea
                        className="w-full bg-slate-950 text-emerald-400 p-4 rounded-b-lg font-mono text-xs focus:ring-0 focus:outline-none min-h-[300px] border border-slate-900 leading-normal"
                        value={formHeader}
                        onChange={(e) => setFormHeader(e.target.value)}
                      />
                    )}
                    {selectedEditorTab === "body" && (
                      <textarea
                        className="w-full bg-slate-950 text-emerald-400 p-4 rounded-b-lg font-mono text-xs focus:ring-0 focus:outline-none min-h-[300px] border border-slate-900 leading-normal"
                        value={formBody}
                        onChange={(e) => setFormBody(e.target.value)}
                      />
                    )}
                    {selectedEditorTab === "footer" && (
                      <textarea
                        className="w-full bg-slate-950 text-emerald-400 p-4 rounded-b-lg font-mono text-xs focus:ring-0 focus:outline-none min-h-[300px] border border-slate-900 leading-normal"
                        value={formFooter}
                        onChange={(e) => setFormFooter(e.target.value)}
                      />
                    )}
                    {selectedEditorTab === "css" && (
                      <textarea
                        className="w-full bg-slate-950 text-indigo-300 p-4 rounded-b-lg font-mono text-xs focus:ring-0 focus:outline-none min-h-[300px] border border-slate-900 leading-normal"
                        value={formCss}
                        onChange={(e) => setFormCss(e.target.value)}
                      />
                    )}
                  </div>

                  {/* Token glossary lists side bar */}
                  <div className="md:col-span-4 bg-slate-50 border border-slate-150 p-3 rounded-xl space-y-3 max-h-[350px] overflow-y-auto">
                    <div className="flex items-center gap-1 text-slate-700 font-bold border-b pb-1.5 uppercase text-[9px] tracking-wide">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Dynamic Variables Catalog
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">Double-click on any variable handle block to instantly append it into your cursor layout position.</p>
                    
                    <div className="space-y-3 font-sans">
                      {variablesGlossary.map((grp, gidx) => (
                        <div key={gidx} className="space-y-1 bg-white p-2 rounded-lg border border-slate-200/60">
                          <span className="block text-[8px] font-extrabold uppercase text-slate-400 tracking-wider font-mono">{grp.category}</span>
                          <div className="flex flex-wrap gap-1">
                            {grp.keys.map(k => (
                              <button
                                key={k}
                                type="button"
                                onDoubleClick={() => insertVariableAtCursor(k)}
                                title="Double-click to insert inside layout"
                                className="px-1.5 py-0.5 bg-slate-100/80 hover:bg-slate-200 border text-slate-705 text-slate-600 rounded text-[9px] font-mono cursor-pointer truncate max-w-full hover:border-slate-350 transition active:scale-95 select-all"
                              >
                                {k}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Version History & Change Note logs */}
              {!isCreatingNew && selectedTemplate && (
                <div className="border border-slate-100 rounded-xl p-4 bg-slate-50 space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h5 className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <History className="h-4 w-4 text-indigo-500" />
                      Template Version History & Rollback Logs
                    </h5>
                    <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">Active Version: #{versions.length}</span>
                  </div>

                  {/* Versions Table */}
                  <div className="border bg-white rounded-lg overflow-hidden">
                    <table className="w-full text-left font-sans text-[10.5px]">
                      <thead>
                        <tr className="bg-slate-50 border-b font-extrabold text-slate-450 uppercase tracking-widest text-[8px]">
                          <th className="p-2 text-center">Ver</th>
                          <th className="p-2">Change Description Notes</th>
                          <th className="p-2">Editor Author</th>
                          <th className="p-2">Revision Time</th>
                          <th className="p-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {versions.length > 0 ? (
                          versions.map((ver, idx) => (
                            <tr key={ver.id} className="border-b last:border-none hover:bg-slate-50">
                              <td className="p-2 text-center font-bold text-slate-800 font-mono">#{ver.versionNumber}</td>
                              <td className="p-2 text-slate-600 font-medium">{ver.changeSummary}</td>
                              <td className="p-2 text-slate-500 font-semibold">{ver.createdBy}</td>
                              <td className="p-2 font-mono text-slate-400">{new Date(ver.createdAt).toLocaleString()}</td>
                              <td className="p-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRestoreVersion(ver.id, ver.versionNumber)}
                                  className="px-2 py-1 bg-indigo-55 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 border border-indigo-100 rounded text-[9px] font-bold cursor-pointer transition"
                                >
                                  Reinstate Layout
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-3 text-center text-slate-450">No catalog version lists. Added on save.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Commit note input */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Layout Revision Commit Notes</label>
                    <input
                      type="text"
                      placeholder="Brief summary of spacing, branding headers, or variable adjustments..."
                      className="w-full bg-white border border-slate-200 rounded p-2 text-slate-800"
                      value={changeRemark}
                      onChange={(e) => setChangeRemark(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* SAVE / CONTROL ACTIONS BAR */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 border-t pt-4">
                
                <div className="flex gap-2">
                  {/* Duplicity action */}
                  {!isCreatingNew && selectedTemplate && (
                    <button
                      type="button"
                      disabled={isDuplicating}
                      onClick={handleDuplicate}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-250 hover:bg-slate-200 border text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      <Copy className="h-4 w-4 text-slate-500" />
                      Duplicate Layout
                    </button>
                  )}
                  
                  {/* Governance approval flow */}
                  {!isCreatingNew && selectedTemplate && selectedTemplate.status === "draft" && (
                    <button
                      type="button"
                      disabled={isApproving}
                      onClick={handleApprove}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Verify & Release
                    </button>
                  )}
                </div>

                <div className="flex gap-2 justify-end">
                  {isCreatingNew && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingNew(false);
                        if (templates.length > 0) selectTemplateHandler(templates[0]);
                      }}
                      className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border text-slate-500 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      Cancel Create
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveCreate}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/10 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {isCreatingNew ? "Save & Catalog Draft Template Layout" : "Publish Revision Layout Changes"}
                  </button>
                </div>

              </div>

            </div>

            {/* LIVE RENDER TESTING CONTAINER */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" /> Live Client-Side Render Sandbox Visualizer
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Assembles layout and injects mockup variables inside A4/Letter margin frames.</p>
                </div>

                {/* State selector indicator */}
                <div className="flex gap-1 items-center bg-slate-50 border p-1 rounded-lg">
                  <span className="text-[9px] font-bold text-slate-400 px-1 font-mono uppercase">Watermark:</span>
                  {["draft", "final", "voided", "cancelled"].map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setPreviewStatus(st as any)}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition cursor-pointer ${
                        previewStatus === st
                          ? "bg-slate-800 text-amber-500"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sandboxed viewport */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-700 min-h-[460px] relative flex justify-center p-6">
                
                {previewLoading && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-20 text-white font-bold font-sans">
                    <div className="text-center space-y-3">
                      <RefreshCw className="h-8 w-8 text-amber-500 animate-spin mx-auto" />
                      <p className="text-xs">Re-compiling sandbox variable mappers...</p>
                    </div>
                  </div>
                )}

                {previewHtml ? (
                  <iframe
                    title="Live layout browser preview"
                    sandbox="allow-same-origin allow-scripts"
                    srcDoc={previewHtml}
                    className="shadow-2xl border-none outline-none scale-90 sm:scale-100 transition-transform origin-top max-w-full aspect-[8.5/11]"
                    style={{
                      width: formOrientation === "landscape" ? "279.4mm" : "215.9mm",
                      height: formOrientation === "landscape" ? "215.9mm" : "279.4mm",
                    }}
                  />
                ) : (
                  <div className="text-center text-slate-400 font-sans my-auto py-20">
                    <Sliders className="h-10 w-10 text-slate-550 text-slate-500 mx-auto opacity-75 animate-bounce" />
                    <p className="text-xs font-semibold mt-3">Ready to compile layouts dynamically on change.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* ARCHIVE PRINTING LOG LEDGER VIEW */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4" id="document_archives_dock">
          
          <div className="border-b pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Generated Official Documents Archives Vault</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Secure historic catalog containing verified real property receipts, certifications, and SOAs generated in the workspace and cryptographically tracked.</p>
            </div>

            <div className="relative font-sans text-xs w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search serial / type / author..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 outline-none focus:border-slate-400 focus:bg-white"
                value={archiveQuery}
                onChange={(e) => setArchiveQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Table list */}
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-left font-sans text-xs">
              <thead>
                <tr className="bg-slate-50 border-b font-extrabold text-slate-500 uppercase tracking-widest text-[8.5px]">
                  <th className="p-3">Doc Serial Number</th>
                  <th className="p-3">Category Code / Document Type</th>
                  <th className="p-3">Compiled Timestamp</th>
                  <th className="p-3">Sandbox Operator</th>
                  <th className="p-3">Verification Sig Hash</th>
                  <th className="p-3">File Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredArchive.length > 0 ? (
                  filteredArchive.map(doc => {
                    let meta: any = {};
                    try {
                      meta = JSON.parse(doc.metadata || "{}");
                    } catch (e) {}

                    return (
                      <tr key={doc.id} className="border-b last:border-none hover:bg-slate-50 transition-colors duration-75">
                        <td className="p-3 font-mono font-extrabold text-indigo-650 text-indigo-600">{doc.documentNumber}</td>
                        <td className="p-3">
                          <strong className="text-slate-800 font-bold block">{doc.documentType}</strong>
                          <span className="text-[9px] font-mono text-slate-400 uppercase">Module: {doc.sourceModule} (ID: {doc.sourceRecordId})</span>
                        </td>
                        <td className="p-3 font-mono text-slate-500">{new Date(doc.createdAt).toLocaleString()}</td>
                        <td className="p-3 font-semibold text-slate-600">{doc.generatedBy}</td>
                        <td className="p-3 font-mono text-slate-400" title={doc.fileHash}>
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[9.5px] tracking-tight text-slate-500 select-all font-mono">
                            {doc.fileHash.substring(0, 12)}...
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                            doc.status === "final"
                              ? "bg-emerald-58 bg-emerald-50 text-emerald-600 border-green-200"
                              : doc.status === "draft"
                              ? "bg-amber-50 text-amber-600 border-amber-200"
                              : "bg-red-50 text-red-600 border-red-200"
                          }`}>{doc.status}</span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenPrintPreview(doc)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 shadow-sm shadow-indigo-600/5 text-white rounded-lg font-semibold cursor-pointer text-[10px] inline-flex items-center gap-1.5"
                          >
                            <Printer className="h-3.5 w-3.5" /> Direct Print layout
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 space-y-2">
                      <Printer className="h-8 w-8 mx-auto text-slate-350 opacity-60" />
                      <p className="text-xs font-semibold">No generated archives located on the server filesystem.</p>
                      <p className="text-[10px] text-slate-400/80">Generate a billing assessment Statement of Account (SOA) or post a payment receipt to log printing ledgers.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-blue-50 border border-blue-150 p-4 rounded-xl text-blue-800 space-y-1 rounded-xl">
            <h5 className="font-bold flex items-center gap-1 text-xs"><Info className="h-4.5 w-4.5 text-blue-500" /> Architectural Design Verification</h5>
            <p className="text-[10.5px] leading-relaxed">Generated PDF templates compile under standard sandbox layouts. Each printout logs its unique serial code and a SHA-256 digital verification hash corresponding to files protected inside the server storage system.</p>
          </div>

        </div>
      )}

      {/* MODAL PRINT PREVIEW VIEWPORT WITH STANDARD DIALOGUE IFRAME */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 z-50 font-sans text-xs">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center border-b border-slate-800">
              <div className="text-left">
                <span className="text-[9px] font-bold text-amber-500 bg-slate-950 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">Secured Archive view</span>
                <h4 className="font-extrabold text-sm text-white mt-1">Official Voucher Reference: {viewingDoc.documentNumber}</h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewingDoc(null);
                  setDocModalHtml("");
                }}
                className="text-slate-400 hover:text-white font-extrabold text-sm bg-slate-800 p-1.5 rounded-lg cursor-pointer hover:bg-slate-700 transition"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Body with Scroll and Printable view */}
            <div className="p-6 bg-slate-100 flex-grow overflow-y-auto flex justify-center relative">
              {docModalLoading && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-10 font-bold text-slate-700">
                  <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mr-2" /> Loading archive logs payload...
                </div>
              )}

              {docModalHtml ? (
                <iframe
                  id="print_preview_iframe_window"
                  title="Official document archive printer preview layout"
                  srcDoc={docModalHtml}
                  className="shadow-lg border bg-white max-w-full aspect-[8.5/11]"
                  style={{ width: "215.9mm", height: "279.4mm" }}
                />
              ) : (
                <div className="my-auto text-slate-400 p-10 text-center font-bold">
                  File content unlinked or expired on the local container.
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <form onSubmit={(e) => e.preventDefault()} className="p-4 border-t bg-slate-50 flex flex-col sm:flex-row gap-3 justify-between items-center border-slate-100">
              
              <div className="flex gap-2 items-center text-slate-500 text-[10.5px]">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <span className="text-left font-semibold">
                  Hash signature: <code className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[9.5px] select-all">{viewingDoc.fileHash}</code>
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const iframe = document.getElementById("print_preview_iframe_window") as HTMLIFrameElement | null;
                    if (iframe && iframe.contentWindow) {
                      iframe.contentWindow.print();
                    } else {
                      window.print();
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 shadow-sm shadow-emerald-600/10 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Printer className="h-4 w-4" /> Trigger Operating Print / save to PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([docModalHtml], { type: "text/html" });
                    const link = document.createElement("a");
                    link.href = URL.createObjectURL(blob);
                    link.download = `Print_${viewingDoc.documentNumber}.html`;
                    link.click();
                  }}
                  className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition border border-slate-300/30"
                >
                  <Download className="h-4 w-4 text-slate-500" /> Download HTML print
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
