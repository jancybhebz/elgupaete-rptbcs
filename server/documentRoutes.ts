import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import {
  loadDatabase,
  writeDatabase,
  logAction,
  DocumentTemplate,
  DocumentTemplateVersion,
  GeneratedDocument,
  SoaRecord,
  Property,
  Taxpayer,
  Payment,
  OfficialReceipt
} from "./dbService";
import { TemplateRenderer } from "./TemplateRenderer";
import { PdfGenerator } from "./PdfGenerator";
import { DocumentNumberGenerator } from "./DocumentNumberGenerator";

const router = Router();

// Helper to find a default user role/name for operations when no session exists
const getOperatorData = (req: Request) => {
  return {
    name: "System Administrator",
    userId: 1,
    username: "admin"
  };
};

/**
 * 1. GET /api/document-templates
 * List all active/inactive document templates (not soft deleted).
 */
router.get("/api/document-templates", (req, res) => {
  try {
    const db = loadDatabase();
    const templates = (db.documentTemplates || []).filter(t => !t.deletedAt);
    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to load templates" });
  }
});

/**
 * 2. GET /api/document-templates/:id
 * Retrieve a specific template by ID.
 */
router.get("/api/document-templates/:id", (req: Request, res: Response) => {
  try {
    const db = loadDatabase();
    const id = parseInt(req.params.id, 10);
    const template = (db.documentTemplates || []).find(t => t.id === id && !t.deletedAt);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    res.json(template);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to load template" });
  }
});

/**
 * 3. POST /api/document-templates
 * Create a new document template.
 */
router.post("/api/document-templates", (req: Request, res: Response) => {
  try {
    const db = loadDatabase();
    const op = getOperatorData(req);
    
    const {
      templateCode,
      templateName,
      templateCategory,
      documentType,
      description,
      paperSize,
      orientation,
      marginTop,
      marginRight,
      marginBottom,
      marginLeft,
      headerHtml,
      bodyHtml,
      footerHtml,
      cssStyles,
      availableVariables
    } = req.body;

    if (!templateCode || !templateName || !documentType) {
      return res.status(400).json({ message: "Code, Name, and Document Type are required fields." });
    }

    // Assign new unique ID
    const templates = db.documentTemplates || [];
    const newId = templates.length > 0 ? Math.max(...templates.map(t => t.id)) + 1 : 1;

    const newTemplate: DocumentTemplate = {
      id: newId,
      templateCode: templateCode.toUpperCase().replace(/\s+/g, "_"),
      templateName,
      templateCategory: templateCategory || "general",
      documentType,
      description: description || "",
      paperSize: paperSize || "Letter",
      orientation: orientation || "portrait",
      marginTop: Number(marginTop !== undefined ? marginTop : 10),
      marginRight: Number(marginRight !== undefined ? marginRight : 10),
      marginBottom: Number(marginBottom !== undefined ? marginBottom : 10),
      marginLeft: Number(marginLeft !== undefined ? marginLeft : 10),
      headerHtml: headerHtml || "",
      bodyHtml: bodyHtml || "",
      footerHtml: footerHtml || "",
      cssStyles: cssStyles || "",
      availableVariables: availableVariables || JSON.stringify([]),
      isDefault: false,
      isActive: true,
      status: "draft",
      createdBy: op.name,
      reviewedBy: null,
      approvedBy: null,
      approvedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null
    };

    // Save
    db.documentTemplates = [...templates, newTemplate];

    // Push into version log
    const versions = db.documentTemplateVersions || [];
    const newVerId = versions.length > 0 ? Math.max(...versions.map(v => v.id)) + 1 : 1;
    const initialVersion: DocumentTemplateVersion = {
      id: newVerId,
      templateId: newId,
      versionNumber: 1,
      headerHtml: newTemplate.headerHtml,
      bodyHtml: newTemplate.bodyHtml,
      footerHtml: newTemplate.footerHtml,
      cssStyles: newTemplate.cssStyles,
      changeSummary: "Initial template draft creation.",
      createdBy: op.name,
      createdAt: new Date().toISOString()
    };
    db.documentTemplateVersions = [...versions, initialVersion];

    writeDatabase(db);
    logAction(op.userId, op.username, "CREATE_TEMPLATE", "Document Templates", "document_templates", newId, null, newTemplate);

    res.status(201).json(newTemplate);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to create template" });
  }
});

/**
 * 4. PUT /api/document-templates/:id
 * Edit and update an existing template. Increments version and stores in version history.
 */
router.put("/api/document-templates/:id", (req: Request, res: Response) => {
  try {
    const db = loadDatabase();
    const op = getOperatorData(req);
    const id = parseInt(req.params.id, 10);
    const index = (db.documentTemplates || []).findIndex(t => t.id === id && !t.deletedAt);

    if (index === -1) {
      return res.status(404).json({ message: "Template not found" });
    }

    const currentTemplate = db.documentTemplates[index];
    const oldCopy = { ...currentTemplate };
    const {
      templateName,
      templateCategory,
      documentType,
      description,
      paperSize,
      orientation,
      marginTop,
      marginRight,
      marginBottom,
      marginLeft,
      headerHtml,
      bodyHtml,
      footerHtml,
      cssStyles,
      availableVariables,
      isDefault,
      isActive,
      changeSummary
    } = req.body;

    // Detect if content changed to compile a new version
    const contentChanged = 
      currentTemplate.headerHtml !== headerHtml ||
      currentTemplate.bodyHtml !== bodyHtml ||
      currentTemplate.footerHtml !== footerHtml ||
      currentTemplate.cssStyles !== cssStyles;

    // Update active fields
    currentTemplate.templateName = templateName || currentTemplate.templateName;
    currentTemplate.templateCategory = templateCategory || currentTemplate.templateCategory;
    currentTemplate.documentType = documentType || currentTemplate.documentType;
    currentTemplate.description = description !== undefined ? description : currentTemplate.description;
    currentTemplate.paperSize = paperSize || currentTemplate.paperSize;
    currentTemplate.orientation = orientation || currentTemplate.orientation;
    currentTemplate.marginTop = marginTop !== undefined ? Number(marginTop) : currentTemplate.marginTop;
    currentTemplate.marginRight = marginRight !== undefined ? Number(marginRight) : currentTemplate.marginRight;
    currentTemplate.marginBottom = marginBottom !== undefined ? Number(marginBottom) : currentTemplate.marginBottom;
    currentTemplate.marginLeft = marginLeft !== undefined ? Number(marginLeft) : currentTemplate.marginLeft;
    currentTemplate.headerHtml = headerHtml !== undefined ? headerHtml : currentTemplate.headerHtml;
    currentTemplate.bodyHtml = bodyHtml !== undefined ? bodyHtml : currentTemplate.bodyHtml;
    currentTemplate.footerHtml = footerHtml !== undefined ? footerHtml : currentTemplate.footerHtml;
    currentTemplate.cssStyles = cssStyles !== undefined ? cssStyles : currentTemplate.cssStyles;
    currentTemplate.availableVariables = availableVariables || currentTemplate.availableVariables;
    currentTemplate.isActive = isActive !== undefined ? Boolean(isActive) : currentTemplate.isActive;
    currentTemplate.updatedAt = new Date().toISOString();

    // If marked default, set all other templates of same documentType to non-default
    if (isDefault) {
      db.documentTemplates.forEach(t => {
        if (t.documentType === currentTemplate.documentType && t.id !== currentTemplate.id) {
          t.isDefault = false;
        }
      });
      currentTemplate.isDefault = true;
    } else if (isDefault === false) {
      currentTemplate.isDefault = false;
    }

    // Force category to revert status to 'draft' if layout changed radically
    if (contentChanged && currentTemplate.status === "approved") {
      currentTemplate.status = "draft";
      currentTemplate.approvedBy = null;
      currentTemplate.approvedAt = null;
    }

    // Create a new version if layouts changed
    if (contentChanged) {
      const sameTemplateVersions = (db.documentTemplateVersions || []).filter(v => v.templateId === id);
      const nextVersionNum = sameTemplateVersions.length > 0 ? Math.max(...sameTemplateVersions.map(v => v.versionNumber)) + 1 : 1;
      
      const versions = db.documentTemplateVersions || [];
      const newVerId = versions.length > 0 ? Math.max(...versions.map(v => v.id)) + 1 : 1;
      const newVersion: DocumentTemplateVersion = {
        id: newVerId,
        templateId: id,
        versionNumber: nextVersionNum,
        headerHtml: currentTemplate.headerHtml,
        bodyHtml: currentTemplate.bodyHtml,
        footerHtml: currentTemplate.footerHtml,
        cssStyles: currentTemplate.cssStyles,
        changeSummary: changeSummary || `Updated template layout (Version ${nextVersionNum}).`,
        createdBy: op.name,
        createdAt: new Date().toISOString()
      };
      db.documentTemplateVersions = [...versions, newVersion];
    }

    writeDatabase(db);
    logAction(op.userId, op.username, "UPDATE_TEMPLATE", "Document Templates", "document_templates", id, oldCopy, currentTemplate);

    res.json(currentTemplate);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to update template" });
  }
});

/**
 * 5. POST /api/document-templates/:id/duplicate
 * Duplicate an existing template to jumpstart another composition.
 */
router.post("/api/document-templates/:id/duplicate", (req: Request, res: Response) => {
  try {
    const db = loadDatabase();
    const op = getOperatorData(req);
    const id = parseInt(req.params.id, 10);
    const original = (db.documentTemplates || []).find(t => t.id === id && !t.deletedAt);

    if (!original) {
      return res.status(404).json({ message: "Original template not found" });
    }

    const templates = db.documentTemplates || [];
    const newId = templates.length > 0 ? Math.max(...templates.map(t => t.id)) + 1 : 1;

    const duplicate: DocumentTemplate = {
      ...original,
      id: newId,
      templateCode: `${original.templateCode}_COPY_${newId}`,
      templateName: `${original.templateName} (Copy)`,
      isDefault: false,
      status: "draft",
      createdBy: op.name,
      reviewedBy: null,
      approvedBy: null,
      approvedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null
    };

    db.documentTemplates = [...templates, duplicate];

    // Seed duplicate first version
    const versions = db.documentTemplateVersions || [];
    const newVerId = versions.length > 0 ? Math.max(...versions.map(v => v.id)) + 1 : 1;
    const initialVer: DocumentTemplateVersion = {
      id: newVerId,
      templateId: newId,
      versionNumber: 1,
      headerHtml: duplicate.headerHtml,
      bodyHtml: duplicate.bodyHtml,
      footerHtml: duplicate.footerHtml,
      cssStyles: duplicate.cssStyles,
      changeSummary: `Duplicated from template "${original.templateName}" (ID: ${id})`,
      createdBy: op.name,
      createdAt: new Date().toISOString()
    };
    db.documentTemplateVersions = [...versions, initialVer];

    writeDatabase(db);
    logAction(op.userId, op.username, "DUPLICATE_TEMPLATE", "Document Templates", "document_templates", newId, null, duplicate);

    res.status(201).json(duplicate);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to duplicate template" });
  }
});

/**
 * 6. POST /api/document-templates/:id/approve
 * Approval workflow transitions: draft -> approved.
 */
router.post("/api/document-templates/:id/approve", (req: Request, res: Response) => {
  try {
    const db = loadDatabase();
    const op = getOperatorData(req);
    const id = parseInt(req.params.id, 10);
    const index = (db.documentTemplates || []).findIndex(t => t.id === id && !t.deletedAt);

    if (index === -1) {
      return res.status(404).json({ message: "Template not found" });
    }

    const template = db.documentTemplates[index];
    const oldCopy = { ...template };

    template.status = "approved";
    template.reviewedBy = op.name; // Acting reviewer
    template.approvedBy = op.name; // Sign-off
    template.approvedAt = new Date().toISOString();
    template.updatedAt = new Date().toISOString();

    writeDatabase(db);
    logAction(op.userId, op.username, "APPROVE_TEMPLATE", "Document Templates", "document_templates", id, oldCopy, template);

    res.json(template);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to approve template" });
  }
});

/**
 * 7. GET /api/document-templates/:id/versions
 * List historical versions for a template.
 */
router.get("/api/document-templates/:id/versions", (req: Request, res: Response) => {
  try {
    const db = loadDatabase();
    const id = parseInt(req.params.id, 10);
    const list = (db.documentTemplateVersions || []).filter(v => v.templateId === id);
    res.json(list.sort((a, b) => b.versionNumber - a.versionNumber));
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to load version history" });
  }
});

/**
 * 8. POST /api/document-templates/:id/restore-version
 * Restore content from an older version record.
 */
router.post("/api/document-templates/:id/restore-version", (req: Request, res: Response) => {
  try {
    const db = loadDatabase();
    const op = getOperatorData(req);
    const id = parseInt(req.params.id, 10);
    const { versionId } = req.body;

    const templateIndex = (db.documentTemplates || []).findIndex(t => t.id === id && !t.deletedAt);
    if (templateIndex === -1) {
      return res.status(404).json({ message: "Template not found" });
    }

    const versionRecord = (db.documentTemplateVersions || []).find(v => v.id === parseInt(versionId, 10) && v.templateId === id);
    if (!versionRecord) {
      return res.status(404).json({ message: "Version record not found" });
    }

    const template = db.documentTemplates[templateIndex];
    const oldCopy = { ...template };

    // Restore design components
    template.headerHtml = versionRecord.headerHtml;
    template.bodyHtml = versionRecord.bodyHtml;
    template.footerHtml = versionRecord.footerHtml;
    template.cssStyles = versionRecord.cssStyles;
    template.status = "draft"; // Status resets to draft on restore for revision
    template.updatedAt = new Date().toISOString();

    // Create descriptive new version entry
    const versions = db.documentTemplateVersions || [];
    const sameTemplateVersions = versions.filter(v => v.templateId === id);
    const nextVersionNum = sameTemplateVersions.length > 0 ? Math.max(...sameTemplateVersions.map(v => v.versionNumber)) + 1 : 1;
    const newVerId = versions.length > 0 ? Math.max(...versions.map(v => v.id)) + 1 : 1;

    const restoreLogVersion: DocumentTemplateVersion = {
      id: newVerId,
      templateId: id,
      versionNumber: nextVersionNum,
      headerHtml: template.headerHtml,
      bodyHtml: template.bodyHtml,
      footerHtml: template.footerHtml,
      cssStyles: template.cssStyles,
      changeSummary: `Restored back to Version ${versionRecord.versionNumber} layout.`,
      createdBy: op.name,
      createdAt: new Date().toISOString()
    };
    db.documentTemplateVersions = [...versions, restoreLogVersion];

    writeDatabase(db);
    logAction(op.userId, op.username, "RESTORE_TEMPLATE_VERSION", "Document Templates", "document_templates", id, oldCopy, template);

    res.json(template);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to restore template version" });
  }
});

/**
 * 9. POST /api/document-templates/preview-html
 * Instant WYSIWYG render testing. Accepts arbitrary layout structures inside body and output full assembled HTML.
 */
router.post("/api/document-templates/preview-html", (req: Request, res: Response) => {
  try {
    const {
      headerHtml,
      bodyHtml,
      footerHtml,
      cssStyles,
      paperSize,
      orientation,
      marginTop,
      marginRight,
      marginBottom,
      marginLeft,
      status // draft, final, voided, cancelled
    } = req.body;

    // Build mock dynamic template
    const mockTemplate: DocumentTemplate = {
      id: 9999,
      templateCode: "PREVIEW",
      templateName: "Live Layout Preview",
      templateCategory: "preview",
      documentType: "Preview",
      description: "",
      paperSize: paperSize || "Letter",
      orientation: orientation || "portrait",
      marginTop: Number(marginTop !== undefined ? marginTop : 10),
      marginRight: Number(marginRight !== undefined ? marginRight : 10),
      marginBottom: Number(marginBottom !== undefined ? marginBottom : 10),
      marginLeft: Number(marginLeft !== undefined ? marginLeft : 10),
      headerHtml: headerHtml || "",
      bodyHtml: bodyHtml || "",
      footerHtml: footerHtml || "",
      cssStyles: cssStyles || "",
      availableVariables: JSON.stringify([]),
      isDefault: false,
      isActive: true,
      status: "draft",
      createdBy: "Tester",
      reviewedBy: null,
      approvedBy: null,
      approvedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null
    };

    // Construct full rich sample mockup variables for variables panel
    const sampleVars: Record<string, any> = {
      lgu_name: "Local Government Unit of Paete",
      province: "Laguna",
      municipality: "Paete",
      office_name: "OFFICE OF THE MUNICIPAL ASSESSOR / TREASURER",
      document_title: "REAL PROPERTY TAX ASSESSMENT NOTICE",
      document_number: "SOA-2026-00345",
      soa_number: "SOA-2026-00345",
      or_number: "OR-2026-98124",
      taxpayer_name: "Juan de la Cruz Sr.",
      taxpayer_address: "123 Quesada Street, Barangay Quesada, Paete, Laguna 4016",
      property_pin: "04-12-005-04-0012",
      property_tdn: "TDN-2024-05-1029",
      property_location: "Lot 5-B Roadside, Barangay Bagumbayan, Paete",
      barangay: "Bagumbayan",
      classification: "residential",
      fair_market_value: "850,000",
      assessment_level: "20",
      assessed_value: "170,000",
      basic_rpt_rate: "1.0",
      sef_rate: "1.0",
      basic_rpt_amount: "1,700",
      sef_amount: "1,700",
      penalty_amount: "340",
      discount_amount: "170",
      total_due: "3,570",
      amount_paid: "3,570",
      balance: "0",
      billing_year: "2026",
      payment_date: "2026-05-21",
      cashier_name: "Maria Theresa Alarcon",
      prepared_by: "John Assessor Staff",
      approved_by: "Renato D Valdecantos",
      max_penalty: "72",
      verification_code: "PAETE-VAL-CF9A91D0",
      verification_url: "https://paete.gov.ph/verify/CF9A91D0",
      generated_at: new Date().toLocaleString(),
      billing_items: [
        { year: "2024", basic_rpt: "1,700", sef: "1,700", penalty: "340", discount: "0", total: "3,740" },
        { year: "2025", basic_rpt: "1,700", sef: "1,700", penalty: "170", discount: "0", total: "3,570" },
        { year: "2026", basic_rpt: "1,700", sef: "1,700", penalty: "0", discount: "170", total: "3,230" }
      ],
      payment_items: [
        { or_number: "OR-2026-90214", payment_date: "2026-01-20", payment_channel: "GCash", amount_paid: "3,230" }
      ]
    };

    const renderedHtml = TemplateRenderer.render(mockTemplate, sampleVars, status || "draft");
    res.setHeader("Content-Type", "text/html");
    res.send(renderedHtml);
  } catch (err: any) {
    res.status(500).send(`<h3>Error generating layout preview:</h3><p>${err.message}</p>`);
  }
});

/**
 * Helper to fetch real records database objects and map them to Template double curly placeholders.
 */
function resolveTemplateVariables(
  documentType: string,
  sourceModule: string,
  sourceRecordId: number,
  db: any
): { variables: Record<string, any>; documentNumber: string } {
  // Safe Fallback Numbers
  const docNum = DocumentNumberGenerator.generate(documentType);
  const sysDate = new Date().toISOString().split("T")[0];

  const map: Record<string, any> = {
    lgu_name: db.settings?.lguName || "Local Government Unit of Paete",
    province: db.settings?.province || "Laguna",
    municipality: db.settings?.municipality || "Paete",
    office_name: db.settings?.officeName || "Office of the Municipal Treasurer / Assessor",
    document_title: documentType.toUpperCase(),
    document_number: docNum,
    max_penalty: db.settings?.maxPenaltyPercent || "72",
    prepared_by: "Officer on Duty",
    approved_by: "Municipal Authorized Signatory",
    verification_code: docNum,
    verification_url: `https://paete.gov.ph/verify/${docNum}`,
    generated_at: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString(),
    billing_items: [],
    payment_items: []
  };

  // 1. Resolve based on Statement of Account records
  if (sourceModule === "soaRecords" || sourceModule === "soa") {
    const soa: SoaRecord | undefined = db.soaRecords?.find((s: any) => s.id === sourceRecordId);
    if (soa) {
      map.soa_number = soa.soaNumber;
      map.document_number = soa.soaNumber; // Use existing SOA number as serial reference
      map.billing_year = String(soa.billingYear);
      map.assessed_value = soa.assessedValue.toLocaleString();
      map.basic_rpt_amount = soa.basicRptAmount.toLocaleString();
      map.sef_amount = soa.sefAmount.toLocaleString();
      map.penalty_amount = soa.penaltyAmount.toLocaleString();
      map.discount_amount = soa.discountAmount.toLocaleString();
      map.total_due = soa.totalDue.toLocaleString();
      map.amount_paid = soa.amountPaid.toLocaleString();
      map.balance = soa.balance.toLocaleString();
      map.prepared_by = soa.preparedBy || "Assessor Staff";
      map.approved_by = soa.approvedBy || "Municipal Treasurer";

      // Property Details
      const prop: Property | undefined = db.properties?.find((p: any) => p.id === soa.propertyId);
      if (prop) {
        map.property_pin = prop.pin;
        map.property_tdn = prop.tdn;
        map.property_location = prop.street || `Barangay ${prop.barangayName}, Paete`;
        map.barangay = prop.barangayName;
        map.classification = prop.classification;
        map.fair_market_value = (prop.area * 5000).toLocaleString(); // Estimated
        map.assessment_level = String(db.settings?.assessmentStartYear ? 20 : 20); // standard residential
        map.basic_rpt_rate = String(db.settings?.basicRptRate || "1.0");
        map.sef_rate = String(db.settings?.sefRate || "1.0");

        // Owner Details
        const owner: Taxpayer | undefined = db.taxpayers?.find((t: any) => t.id === prop.ownerId);
        if (owner) {
          map.taxpayer_name = `${owner.firstName} ${owner.lastName}`;
          map.taxpayer_address = owner.address;
        }
      }

      // Populate billing breakdown loop
      map.billing_items = [
        {
          year: String(soa.billingYear),
          basic_rpt: soa.basicRptAmount.toLocaleString(),
          sef: soa.sefAmount.toLocaleString(),
          penalty: soa.penaltyAmount.toLocaleString(),
          discount: soa.discountAmount.toLocaleString(),
          total: soa.totalDue.toLocaleString()
        }
      ];
    }
  }

  // 2. Resolve based on Official Receipt / Payment records
  if (sourceModule === "officialReceipts" || sourceModule === "payments" || sourceModule === "receipt") {
    const pm: Payment | undefined = db.payments?.find((p: any) => p.id === sourceRecordId) || db.payments?.[0];
    if (pm) {
      map.or_number = pm.orNumber;
      map.document_number = pm.orNumber || docNum;
      map.payment_date = pm.paymentDate;
      map.taxpayer_name = pm.taxpayerName;
      map.amount_paid = pm.amountPaid.toLocaleString();
      map.basic_rpt_amount = pm.basicPortion.toLocaleString();
      map.sef_amount = pm.sefPortion.toLocaleString();
      map.penalty_amount = pm.penaltyPortion.toLocaleString();
      map.discount_amount = pm.discountApplied.toLocaleString();
      map.cashier_name = pm.cashierName || "Maria Cashier";
      map.prepared_by = pm.cashierName || "Maria Cashier";

      // Property Details
      const prop: Property | undefined = db.properties?.find((p: any) => p.id === pm.propertyId);
      if (prop) {
        map.property_pin = prop.pin;
        map.property_tdn = prop.tdn;
        map.property_location = prop.street || `Barangay ${prop.barangayName}, Paete`;
        map.barangay = prop.barangayName;
        map.classification = prop.classification;
      }

      map.payment_items = [
        {
          or_number: pm.orNumber,
          payment_date: pm.paymentDate,
          payment_channel: pm.paymentChannel,
          amount_paid: pm.amountPaid.toLocaleString()
        }
      ];
    }
  }

  return {
    variables: map,
    documentNumber: map.document_number || docNum
  };
}

/**
 * 10. POST /api/document-templates/generate
 * Final document compiler. Saves generated HTML/PDF, signs with verification hashing, logs and archives record.
 */
router.post("/api/document-templates/generate", (req: Request, res: Response) => {
  try {
    const db = loadDatabase();
    const op = getOperatorData(req);
    const { templateId, sourceModule, sourceRecordId, status } = req.body;

    if (!templateId) {
      return res.status(400).json({ message: "Requested Template ID is required." });
    }

    const template = (db.documentTemplates || []).find(t => t.id === parseInt(templateId, 10));
    if (!template) {
      return res.status(404).json({ message: "Template layout definition not found." });
    }

    // A template must be approved to generate final official papers!
    const targetStatus = status || "final";
    if (targetStatus === "final" && template.status !== "approved") {
      return res.status(403).json({
        message: "Governance lock error: Template must be verified 'approved' before publishing final official document runs."
      });
    }

    // Resolve structural variables
    const { variables, documentNumber } = resolveTemplateVariables(
      template.documentType,
      sourceModule || "soa",
      parseInt(sourceRecordId || 1, 10),
      db
    );

    // Apply template renderer assembly
    const assembledHtml = TemplateRenderer.render(template, variables, targetStatus);

    // Persist finalized document file
    const { filePath, fileHash, fileSize } = PdfGenerator.generateFile(assembledHtml, documentNumber);

    // Store in generated_documents list database ledger
    const docs = db.generatedDocuments || [];
    const newDocId = docs.length > 0 ? Math.max(...docs.map(d => d.id)) + 1 : 1;

    const newGenDoc: GeneratedDocument = {
      id: newDocId,
      templateId: template.id,
      documentType: template.documentType,
      sourceModule: sourceModule || "general",
      sourceRecordId: parseInt(sourceRecordId || 1, 10),
      documentNumber,
      filePath,
      fileHash,
      verificationCode: documentNumber,
      verificationUrl: `https://paete.gov.ph/verify/${documentNumber}`,
      status: targetStatus,
      generatedBy: op.name,
      generatedAt: new Date().toISOString(),
      metadata: JSON.stringify({
        fileSize,
        variablesResolved: Object.keys(variables)
      }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.generatedDocuments = [...docs, newGenDoc];
    writeDatabase(db);

    // Audit trace logging
    logAction(
      op.userId,
      op.username,
      "GENERATE_DOCUMENT",
      "Document Templates",
      "generated_documents",
      newDocId,
      null,
      {
        documentNumber,
        type: template.documentType,
        hashSig: fileHash
      }
    );

    res.status(201).json(newGenDoc);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to compile printable document" });
  }
});

/**
 * 11. GET /api/generated-documents
 * Search lists of all generated/archived document assets.
 */
router.get("/api/generated-documents", (req, res) => {
  try {
    const db = loadDatabase();
    res.json(db.generatedDocuments || []);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to load document logs" });
  }
});

/**
 * 12. GET /api/generated-documents/:id
 * Retrieve detail records of specific generated document.
 */
router.get("/api/generated-documents/:id", (req, res) => {
  try {
    const db = loadDatabase();
    const id = parseInt(req.params.id, 10);
    const doc = (db.generatedDocuments || []).find(d => d.id === id);
    if (!doc) {
      return res.status(404).json({ message: "Generated document not found" });
    }
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to retrieve doc details" });
  }
});

/**
 * 13. GET /api/generated-documents/view/:docNumber
 * Fetch and stream real compiled/rendered printable layout document file.
 */
router.get("/api/generated-documents/view/:docNumber", (req, res) => {
  try {
    const db = loadDatabase();
    const docNum = req.params.docNumber;
    const doc = (db.generatedDocuments || []).find(d => d.documentNumber === docNum);
    
    if (!doc) {
      return res.status(404).send("<h2>Document reference has expired or does not exist.</h2>");
    }

    const fullPath = path.join(process.cwd(), doc.filePath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).send("<h2>Physical file payload has been unlinked from disk archive.</h2>");
    }

    const rawHtml = fs.readFileSync(fullPath, "utf-8");
    res.setHeader("Content-Type", "text/html");
    res.send(rawHtml);
  } catch (err: any) {
    res.status(500).send(`<h2>Error retrieving page view:</h2><p>${err.message}</p>`);
  }
});

export default router;
