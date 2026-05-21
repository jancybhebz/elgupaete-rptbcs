import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import {
  loadDatabase,
  writeDatabase,
  logAction,
  User,
  Taxpayer,
  Property,
  FaaSRecord,
  TaxDeclaration,
  SoaRecord,
  Payment,
  OfficialReceipt,
  Attachment
} from "./server/dbService.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Midlleware
  app.use(express.json());

  // Static login session state
  let currentSession: User | null = null;

  // API Roots
  
  // 1. Auth Endpoint
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const db = loadDatabase();
    
    // Find User
    const user = db.users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    
    // Quick password check (hash placeholder verification)
    if (user.passwordHash !== password) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    if (user.status !== "active") {
      return res.status(403).json({ message: `Account is ${user.status}. Contact administrator.` });
    }

    currentSession = user;
    
    // Audit log
    logAction(
      user.id,
      user.username,
      "USER_LOGIN",
      "Authentication",
      "users",
      user.id,
      null,
      { username: user.username, role: user.role, time: new Date() }
    );

    res.json({ user });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!currentSession) {
      // By default assume administrator is logged in to save user double-tapping, 
      // but let them context-switch
      const db = loadDatabase();
      currentSession = db.users[0]; // Admin by default
    }
    res.json({ user: currentSession });
  });

  app.post("/api/auth/switch", (req, res) => {
    const { username } = req.body;
    const db = loadDatabase();
    const user = db.users.find(u => u.username === username);
    if (user) {
      currentSession = user;
      logAction(user.id, user.username, "SWITCH_USER", "Authentication", "users", user.id, null, { switched_to: username });
      return res.json({ user });
    }
    res.status(404).json({ message: "User not found" });
  });

  app.post("/api/auth/logout", (req, res) => {
    if (currentSession) {
      logAction(
        currentSession.id,
        currentSession.username,
        "USER_LOGOUT",
        "Authentication",
        "users",
        currentSession.id,
        null,
        null
      );
    }
    currentSession = null;
    res.json({ message: "Logged out successfully" });
  });

  // 2. Taxpayer CRUD
  app.get("/api/taxpayers", (req, res) => {
    const db = loadDatabase();
    res.json(db.taxpayers);
  });

  app.post("/api/taxpayers", (req, res) => {
    const db = loadDatabase();
    const count = db.taxpayers.length;
    const nextId = count > 0 ? Math.max(...db.taxpayers.map(t => t.id)) + 1 : 1;
    const year = new Date().getFullYear();
    const code = `TP-${year}-${String(nextId).padStart(6, "0")}`;

    const newTp: Taxpayer = {
      id: nextId,
      code,
      firstName: req.body.firstName || "",
      middleName: req.body.middleName || "",
      lastName: req.body.lastName || "",
      suffix: req.body.suffix || "",
      companyName: req.body.companyName || "",
      type: req.body.type || "individual",
      tin: req.body.tin || "",
      contactNumber: req.body.contactNumber || "",
      email: req.body.email || "",
      address: req.body.address || "",
      barangay: req.body.barangay || "",
      municipality: "Paete",
      province: "Laguna",
      zipCode: "4016",
      status: "active",
      remarks: req.body.remarks || "",
      createdAt: new Date().toISOString()
    };

    db.taxpayers.push(newTp);
    writeDatabase(db);
    
    logAction(
      currentSession?.id || 1,
      currentSession?.username || "admin",
      "CREATE_TAXPAYER",
      "Taxpayer Management",
      "taxpayers",
      newTp.id,
      null,
      newTp
    );

    res.status(201).json(newTp);
  });

  app.put("/api/taxpayers/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const db = loadDatabase();
    const idx = db.taxpayers.findIndex(t => t.id === id);
    if (idx === -1) return res.status(404).json({ message: "Taxpayer not found" });

    const oldVal = { ...db.taxpayers[idx] };
    db.taxpayers[idx] = {
      ...db.taxpayers[idx],
      ...req.body,
      id // preserve id
    };
    writeDatabase(db);

    logAction(
      currentSession?.id || 1,
      currentSession?.username || "admin",
      "UPDATE_TAXPAYER",
      "Taxpayer Management",
      "taxpayers",
      id,
      oldVal,
      db.taxpayers[idx]
    );

    res.json(db.taxpayers[idx]);
  });

  // 3. Property CRUD 
  app.get("/api/properties", (req, res) => {
    const db = loadDatabase();
    res.json(db.properties);
  });

  app.post("/api/properties", (req, res) => {
    const db = loadDatabase();
    const nextId = db.properties.length > 0 ? Math.max(...db.properties.map(p => p.id)) + 1 : 1;
    
    // Find Owner Name
    const owner = db.taxpayers.find(t => t.id === parseInt(req.body.ownerId));
    const ownerName = owner ? `${owner.firstName} ${owner.lastName} ${owner.companyName}`.trim() : "Unknown";

    // Find Barangay Name
    const brgy = db.barangays.find(b => b.id === parseInt(req.body.barangayId));
    const barangayName = brgy ? brgy.name : "Bagumbayan";

    const newProp: Property = {
      id: nextId,
      pin: req.body.pin || `162-12-001-01-${String(nextId).padStart(3, "0")}`,
      tdn: req.body.tdn || `TD-2026-${String(nextId).padStart(6, "0")}`,
      previousTdn: req.body.previousTdn || "",
      ownerId: parseInt(req.body.ownerId) || 1,
      ownerName,
      administrator: req.body.administrator || "Self",
      kind: req.body.kind || "land",
      classification: req.body.classification || "residential",
      barangayId: parseInt(req.body.barangayId) || 1,
      barangayName,
      street: req.body.street || "",
      lotNo: req.body.lotNo || "",
      blockNo: req.body.blockNo || "",
      surveyNo: req.body.surveyNo || "",
      titleNo: req.body.titleNo || "",
      area: parseFloat(req.body.area) || 100,
      unit: req.body.unit || "sqm",
      boundaries: req.body.boundaries || "",
      latitude: parseFloat(req.body.latitude) || 14.364444,
      longitude: parseFloat(req.body.longitude) || 121.527222,
      parcelReference: req.body.parcelReference || `PAR-PAETE-${String(nextId).padStart(5, "0")}`,
      status: req.body.status || "active",
      remarks: req.body.remarks || "",
      createdAt: new Date().toISOString()
    };

    db.properties.push(newProp);
    writeDatabase(db);

    logAction(
      currentSession?.id || 1,
      currentSession?.username || "admin",
      "CREATE_PROPERTY",
      "Property Management",
      "properties",
      newProp.id,
      null,
      newProp
    );

    res.status(201).json(newProp);
  });

  app.put("/api/properties/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const db = loadDatabase();
    const idx = db.properties.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ message: "Property not found" });

    const oldVal = { ...db.properties[idx] };
    db.properties[idx] = {
      ...db.properties[idx],
      ...req.body,
      id // preserve
    };
    writeDatabase(db);

    logAction(
      currentSession?.id || 1,
      currentSession?.username || "admin",
      "UPDATE_PROPERTY",
      "Property Management",
      "properties",
      id,
      oldVal,
      db.properties[idx]
    );

    res.json(db.properties[idx]);
  });

  // 4. FAAS Records Assessment
  app.get("/api/faas", (req, res) => {
    const db = loadDatabase();
    res.json(db.faasRecords);
  });

  app.post("/api/faas", (req, res) => {
    const db = loadDatabase();
    const nextId = db.faasRecords.length > 0 ? Math.max(...db.faasRecords.map(f => f.id)) + 1 : 1;
    
    const fmv = parseFloat(req.body.fairMarketValue) || 100000;
    const level = parseFloat(req.body.assessmentLevel) || 20; // 20%
    const assessed = fmv * (level / 100);

    const newFaas: FaaSRecord = {
      id: nextId,
      faasNumber: `FAAS-2026-${String(nextId).padStart(6, "0")}`,
      propertyId: parseInt(req.body.propertyId),
      taxpayerId: parseInt(req.body.taxpayerId),
      effectivityYear: parseInt(req.body.effectivityYear) || 2026,
      revisionYear: parseInt(req.body.revisionYear) || 2024,
      fairMarketValue: fmv,
      assessmentLevel: level,
      assessedValue: assessed,
      appraisedBy: req.body.appraisedBy || currentSession?.name || "Staff Appraisal",
      dateAppraised: req.body.dateAppraised || new Date().toISOString().split('T')[0],
      recommendedBy: req.body.recommendedBy || "Staff Recommended",
      approvedBy: "",
      dateApproved: "",
      status: "draft",
      createdAt: new Date().toISOString()
    };

    db.faasRecords.push(newFaas);
    writeDatabase(db);

    logAction(
      currentSession?.id || 1,
      currentSession?.username || "admin",
      "CREATE_FAAS",
      "FAAS Assessment",
      "faasRecords",
      newFaas.id,
      null,
      newFaas
    );

    res.status(201).json(newFaas);
  });

  // FAAS approval & Auto TD generator
  app.post("/api/faas/:id/approve", (req, res) => {
    const id = parseInt(req.params.id);
    const db = loadDatabase();
    const fIdx = db.faasRecords.findIndex(f => f.id === id);
    if (fIdx === -1) return res.status(404).json({ message: "FAAS record not found" });

    const faas = db.faasRecords[fIdx];
    if (faas.status === "approved") {
      return res.status(400).json({ message: "This FAAS record is already approved." });
    }

    const oldFaas = { ...faas };
    faas.status = "approved";
    faas.approvedBy = currentSession?.name || "Municipal Assessor";
    faas.dateApproved = new Date().toISOString().split('T')[0];

    // Find property to generate or connect Tax Declaration
    const property = db.properties.find(p => p.id === faas.propertyId);
    let newTd: TaxDeclaration | null = null;
    if (property) {
      const nextTdId = db.taxDeclarations.length > 0 ? Math.max(...db.taxDeclarations.map(t => t.id)) + 1 : 1;
      const tdn = `TD-2026-${String(nextTdId).padStart(6, "0")}`;

      newTd = {
        id: nextTdId,
        tdn,
        propertyId: property.id,
        faasId: faas.id,
        ownerId: faas.taxpayerId,
        ownerName: property.ownerName,
        effectivityYear: faas.effectivityYear,
        classification: property.classification,
        assessedValue: faas.assessedValue,
        previousTdn: property.tdn,
        status: "active",
        dateIssued: new Date().toISOString().split('T')[0],
        issuedBy: currentSession?.name || "Municipal Assessor",
        remarks: `Auto-generated on approval of ${faas.faasNumber}`
      };

      db.taxDeclarations.push(newTd);

      // Update property with new TDN
      property.tdn = tdn;
      property.previousTdn = newTd.previousTdn;
    }

    writeDatabase(db);

    logAction(
      currentSession?.id || 1,
      currentSession?.username || "admin",
      "APPROVE_FAAS",
      "FAAS Assessment",
      "faasRecords",
      id,
      oldFaas,
      faas
    );

    if (newTd) {
      logAction(
        currentSession?.id || 1,
        currentSession?.username || "admin",
        "AUTO_GENERATE_TD",
        "Tax Declaration",
        "taxDeclarations",
        newTd.id,
        null,
        newTd
      );
    }

    res.json({ faas, taxDeclaration: newTd });
  });

  // 5. Tax Declarations API
  app.get("/api/declarations", (req, res) => {
    const db = loadDatabase();
    res.json(db.taxDeclarations);
  });

  // 6. Billing and Statement of Account (SOA) Logic
  app.get("/api/soa", (req, res) => {
    const db = loadDatabase();
    res.json(db.soaRecords);
  });

  app.get("/api/payments", (req, res) => {
    const db = loadDatabase();
    res.json(db.payments);
  });

  app.get("/api/receipts", (req, res) => {
    const db = loadDatabase();
    res.json(db.officialReceipts);
  });

  // Compute live taxes & discounts & penalties before filing SOA
  app.post("/api/soa/calculate", (req, res) => {
    const { propertyId, year, billingPeriod } = req.body;
    const db = loadDatabase();
    const prop = db.properties.find(p => p.id === parseInt(propertyId));
    if (!prop) return res.status(404).json({ message: "Property not found" });

    // Retrieve active FAAS record
    const faas = db.faasRecords.find(f => f.propertyId === prop.id && f.status === "approved");
    if (!faas) {
      return res.status(400).json({ message: "No approved FAAS assessment exists for this property to bill." });
    }

    // Rates config
    const basicRate = db.settings.basicRptRate / 100; // e.g. 1% -> 0.01
    const sefRate = db.settings.sefRate / 100;     // e.g. 1% -> 0.01

    // Computes basic & SEF
    const assessedValue = faas.assessedValue;
    const basicAmount = assessedValue * basicRate;
    const sefAmount = assessedValue * sefRate;
    const annualTotal = basicAmount + sefAmount;

    // Period multiplier
    let multiplier = 1;
    if (billingPeriod && billingPeriod !== "annual") {
      multiplier = 0.25; // individual quarter
    }

    let calculatedBasic = basicAmount * multiplier;
    let calculatedSef = sefAmount * multiplier;

    // Penalty logic (2% per month since deadline, say march 31, 2026)
    // For calculation presentation, let's look at today's month vs March (Month index 2)
    // If current local date is May 21 2026, then April (1m), May (2m) -> 4% interest
    const today = new Date();
    const currentYear = today.getFullYear();
    let penaltyPercent = 0;
    
    if (year < currentYear) {
      // Past years get compounding interest (e.g. 24% per year max 72%)
      const missedMonths = (currentYear - year) * 12 + today.getMonth();
      penaltyPercent = Math.min(db.settings.maxPenaltyPercent, missedMonths * db.settings.penaltyRatePercent);
    } else if (today.getTime() > new Date(db.settings.discountDeadline).getTime()) {
      // Past March deadline
      const delayMonths = today.getMonth() - new Date(db.settings.discountDeadline).getMonth();
      if (delayMonths > 0) {
        penaltyPercent = Math.min(db.settings.maxPenaltyPercent, delayMonths * db.settings.penaltyRatePercent);
      }
    }

    const calculatedPenalty = (calculatedBasic + calculatedSef) * (penaltyPercent / 100);

    // Discount logical conditions
    let calculatedDiscount = 0;
    if (year === currentYear && today.getTime() <= new Date(db.settings.discountDeadline).getTime() && billingPeriod === "annual") {
      calculatedDiscount = (calculatedBasic + calculatedSef) * (db.settings.discountPercent / 100);
    }

    const totalDue = (calculatedBasic + calculatedSef + calculatedPenalty) - calculatedDiscount;

    res.json({
      propertyId: prop.id,
      assessedValue,
      billingYear: year || currentYear,
      billingPeriod: billingPeriod || "annual",
      basicRptAmount: calculatedBasic,
      sefAmount: calculatedSef,
      penaltyAmount: calculatedPenalty,
      discountAmount: calculatedDiscount,
      totalDue,
      dueDate: db.settings.discountDeadline
    });
  });

  // Post & Issure absolute SOA
  app.post("/api/soa/generate", (req, res) => {
    const db = loadDatabase();
    const nextId = db.soaRecords.length > 0 ? Math.max(...db.soaRecords.map(s => s.id)) + 1 : 1;
    const randomHex = Math.random().toString(16).substr(2, 6).toUpperCase();
    const verificationCode = `VF-SOA-${randomHex}`;

    const newSoa: SoaRecord = {
      id: nextId,
      soaNumber: `SOA-2026-${String(nextId).padStart(6, "0")}`,
      taxpayerId: parseInt(req.body.taxpayerId),
      propertyId: parseInt(req.body.propertyId),
      billingYear: parseInt(req.body.billingYear),
      billingPeriod: req.body.billingPeriod || "annual",
      assessedValue: parseFloat(req.body.assessedValue),
      basicRptAmount: parseFloat(req.body.basicRptAmount),
      sefAmount: parseFloat(req.body.sefAmount),
      penaltyAmount: parseFloat(req.body.penaltyAmount) || 0,
      discountAmount: parseFloat(req.body.discountAmount) || 0,
      totalDue: parseFloat(req.body.totalDue),
      amountPaid: 0.00,
      balance: parseFloat(req.body.totalDue),
      dueDate: req.body.dueDate || db.settings.discountDeadline,
      status: "issued",
      preparedBy: currentSession?.username || "cashier",
      approvedBy: "treasurer",
      createdAt: new Date().toISOString(),
      verificationCode
    };

    db.soaRecords.push(newSoa);
    writeDatabase(db);

    logAction(
      currentSession?.id || 1,
      currentSession?.username || "admin",
      "GENERATE_SOA",
      "Billing & SOA Management",
      "soaRecords",
      newSoa.id,
      null,
      newSoa
    );

    res.status(201).json(newSoa);
  });

  // 7. Cashier payment posting with atomic locks
  app.post("/api/treasury/pay", (req, res) => {
    const { soaId, orNumber, paymentChannel, amountPaid } = req.body;
    const db = loadDatabase();

    const sIdx = db.soaRecords.findIndex(s => s.id === parseInt(soaId));
    if (sIdx === -1) return res.status(404).json({ message: "SOA billing record not found" });

    const soa = db.soaRecords[sIdx];
    if (soa.status === "fully paid") {
      return res.status(400).json({ message: "This SOA is already fully paid." });
    }

    const payAmount = parseFloat(amountPaid);
    if (payAmount <= 0) {
      return res.status(400).json({ message: "Payment amount must be greater than zero." });
    }

    // Check duplicate OR
    const duplicateOr = db.payments.find(p => p.orNumber === orNumber && p.status === "posted");
    if (duplicateOr) {
      return res.status(400).json({ message: `Duplicate entry! Official Receipt (OR) Number '${orNumber}' has already been recorded.` });
    }

    // Transaction Simulation Start
    const oldSoa = { ...soa };
    soa.amountPaid = (soa.amountPaid || 0) + payAmount;
    soa.balance = Math.max(0, soa.totalDue - soa.amountPaid);
    
    if (soa.balance === 0) {
      soa.status = "fully paid";
    } else {
      soa.status = "partially paid";
    }

    // Register receipt of cash
    const payId = db.payments.length > 0 ? Math.max(...db.payments.map(p => p.id)) + 1 : 1;
    const paymentRef = `PAY-20260521-${String(payId).padStart(6, "0")}`;
    
    const taxpayerId = soa.taxpayerId;
    const tp = db.taxpayers.find(t => t.id === taxpayerId);
    const taxpayerName = tp ? `${tp.firstName} ${tp.lastName} ${tp.companyName}`.trim() : "Walk-in Taxpayer";

    // Apportion payment proportional to due
    const basicRatio = soa.basicRptAmount / (soa.basicRptAmount + soa.sefAmount + (soa.penaltyAmount || 0.0001));
    const sefRatio = soa.sefAmount / (soa.basicRptAmount + soa.sefAmount + (soa.penaltyAmount || 0.0001));
    const penaltyRatio = soa.penaltyAmount / (soa.basicRptAmount + res.req?.body?.sefAmount || 1);

    const basicPortion = payAmount * basicRatio;
    const sefPortion = payAmount * sefRatio;
    const penaltyPortion = payAmount * (1 - basicRatio - sefRatio);

    const newPayment: Payment = {
      id: payId,
      paymentRef,
      soaNumber: soa.soaNumber,
      taxpayerId,
      taxpayerName,
      propertyId: soa.propertyId,
      orNumber: orNumber || `OR-AUTO-${String(payId).padStart(5, "0")}`,
      paymentDate: new Date().toISOString(),
      paymentChannel: paymentChannel || "Cash",
      amountPaid: payAmount,
      basicPortion: parseFloat(basicPortion.toFixed(2)),
      sefPortion: parseFloat(sefPortion.toFixed(2)),
      penaltyPortion: parseFloat(penaltyPortion.toFixed(2)),
      discountApplied: soa.discountAmount,
      cashierName: currentSession?.name || "Maria Theresa Alarcon",
      status: "posted"
    };

    db.payments.push(newPayment);

    // Register official OR record
    const orId = db.officialReceipts.length > 0 ? Math.max(...db.officialReceipts.map(o => o.id)) + 1 : 1;
    const newOr: OfficialReceipt = {
      id: orId,
      orNumber: newPayment.orNumber,
      paymentId: payId,
      taxpayerName,
      amount: payAmount,
      paymentDate: newPayment.paymentDate,
      cashierName: newPayment.cashierName,
      remarks: `Paid via ${paymentChannel}. Billing coverage: ${soa.billingYear} (${soa.billingPeriod})`,
      status: "active"
    };

    db.officialReceipts.push(newOr);

    writeDatabase(db);

    logAction(
      currentSession?.id || 1,
      currentSession?.username || "admin",
      "POST_PAYMENT",
      "Treasury Collection",
      "payments",
      payId,
      null,
      newPayment
    );

    logAction(
      currentSession?.id || 1,
      currentSession?.username || "admin",
      "ISSUE_OR",
      "Official Receipt",
      "officialReceipts",
      orId,
      null,
      newOr
    );

    res.status(201).json({ payment: newPayment, or: newOr, soa });
  });

  // Void Receipt Endpoint
  app.post("/api/treasury/void-receipt", (req, res) => {
    const { orNumber, voidReason } = req.body;
    const db = loadDatabase();

    const payIdx = db.payments.findIndex(p => p.orNumber === orNumber);
    if (payIdx === -1) return res.status(404).json({ message: "Payment entry with this OR not found" });

    // Permissions check - only Treasury Supervisor or Admin
    if (currentSession && currentSession.role !== "Treasury Supervisor" && currentSession.role !== "System Administrator") {
      return res.status(403).json({ message: "Access Denied: Voiding official receipts requires Treasury Supervisor authorization." });
    }

    const payment = db.payments[payIdx];
    if (payment.status === "voided") {
      return res.status(400).json({ message: "This OR receipt is already voided." });
    }

    // Capture old states
    const oldPayment = { ...payment };

    // Void elements
    payment.status = "voided";
    payment.voidReason = voidReason || "Mistake in cashier posting";
    payment.voidedBy = currentSession?.name || "Carlos T. Supervisor";

    // Find linked OR and mark voided
    const orIdx = db.officialReceipts.findIndex(o => o.orNumber === orNumber);
    let oldOr = null;
    if (orIdx !== -1) {
      oldOr = { ...db.officialReceipts[orIdx] };
      db.officialReceipts[orIdx].status = "voided";
      db.officialReceipts[orIdx].voidReason = voidReason;
    }

    // Reverse SOA billing state
    const soaIdx = db.soaRecords.findIndex(s => s.soaNumber === payment.soaNumber);
    if (soaIdx !== -1) {
      const soa = db.soaRecords[soaIdx];
      soa.amountPaid = Math.max(0, soa.amountPaid - payment.amountPaid);
      soa.balance = soa.totalDue - soa.amountPaid;
      if (soa.amountPaid === 0) {
        soa.status = "issued";
      } else {
        soa.status = "partially paid";
      }
    }

    writeDatabase(db);

    logAction(
      currentSession?.id || 1,
      currentSession?.username || "admin",
      "VOID_PAYMENT",
      "Treasury Collection",
      "payments",
      payment.id,
      oldPayment,
      payment
    );

    res.json({ success: true, payment });
  });

  // 8. Online Gateways settings
  app.get("/api/gateways", (req, res) => {
    const db = loadDatabase();
    res.json(db.settings);
  });

  app.put("/api/settings", (req, res) => {
    const db = loadDatabase();
    const oldSettings = { ...db.settings };
    db.settings = {
      ...db.settings,
      ...req.body
    };
    writeDatabase(db);

    logAction(
      currentSession?.id || 1,
      currentSession?.username || "admin",
      "UPDATE_SETTINGS",
      "System Settings",
      "system_settings",
      "global",
      oldSettings,
      db.settings
    );

    res.json(db.settings);
  });

  app.get("/api/logs/audit", (req, res) => {
    const db = loadDatabase();
    res.json(db.auditLogs);
  });

  // 9. Document Attachments
  app.post("/api/attachments", (req, res) => {
    const { propertyId, fileName, category } = req.body;
    const db = loadDatabase();
    const nextId = db.attachments.length > 0 ? Math.max(...db.attachments.map(a => a.id)) + 1 : 1;

    const newAttach: Attachment = {
      id: nextId,
      propertyId: parseInt(propertyId),
      fileName: fileName || "Untitled Document",
      fileType: "application/pdf",
      fileSize: Math.floor(Math.random() * 2000) + 150,
      category: category || "Other",
      uploadedBy: currentSession?.name || "Staff",
      uploadedAt: new Date().toISOString(),
      securePath: `/writable/uploads/properties/${propertyId}/${fileName}`
    };

    db.attachments.push(newAttach);
    writeDatabase(db);

    logAction(
      currentSession?.id || 1,
      currentSession?.username || "admin",
      "UPLOAD_ATTACHMENT",
      "Document Manager",
      "attachments",
      newAttach.id,
      null,
      newAttach
    );

    res.status(201).json(newAttach);
  });

  app.get("/api/attachments", (req, res) => {
    const db = loadDatabase();
    res.json(db.attachments);
  });

  // 10. Public verification paths
  app.get("/api/public/verify/soa/:code", (req, res) => {
    const { code } = req.params;
    const db = loadDatabase();
    const soa = db.soaRecords.find(s => s.verificationCode === code || s.soaNumber === code);
    if (!soa) {
      return res.status(404).json({ verified: false, message: "Valid assessment statement not found under this verification tag." });
    }

    const tp = db.taxpayers.find(t => t.id === soa.taxpayerId);
    
    // Mask name for privacy as mandated
    const maskString = (str: string) => {
      if (str.length <= 4) return "****";
      return str.substring(0, 3) + "****" + str.charAt(str.length - 1);
    };
    const maskedName = tp ? `${maskString(tp.firstName || "Company")} ${maskString(tp.lastName || "Owners")}` : "M**** M****";

    res.json({
      verified: true,
      documentType: "Real Property Tax Statement of Account (SOA)",
      referenceNumber: soa.soaNumber,
      taxpayerMaskedName: maskedName,
      assessedValue: soa.assessedValue,
      totalAmount: soa.totalDue,
      issueDate: soa.createdAt.split('T')[0],
      status: soa.status,
      verificationResult: "OFFICIAL: Document is genuine and matching municipal records of Paete, Laguna."
    });
  });

  app.get("/api/public/verify/or/:code", (req, res) => {
    const { code } = req.params;
    const db = loadDatabase();
    const or = db.officialReceipts.find(o => o.orNumber === code);
    if (!or) {
      return res.status(404).json({ verified: false, message: "Official receipt verification tag matches no registered LGU transaction." });
    }

    // Mask name
    const maskedName = or.taxpayerName.split(" ").map(w => w.length > 2 ? w.substr(0, 2) + "***" : "*").join(" ");

    res.json({
      verified: true,
      documentType: "Official Treasury Receipt (OR)",
      referenceNumber: or.orNumber,
      taxpayerMaskedName: maskedName,
      totalAmount: or.amount,
      issueDate: or.paymentDate.split('T')[0],
      status: or.status === "voided" ? "VOID COMPROMISED" : "VALID & ISSUED",
      verificationResult: or.status === "voided" 
        ? "VOID REVERSED: This official receipt has been officially voided by a Treasury Supervisor with an audit trace."
        : "OFFICIAL: Receipt is verified, fully cleared, and settled within the Paete General Treasury."
    });
  });

  // 11. Property Mutation and Transactions Module Endpoints
  app.get("/api/mutations", (req, res) => {
    const db = loadDatabase();
    res.json(db.propertyMutations || []);
  });

  app.get("/api/mutations/items", (req, res) => {
    const db = loadDatabase();
    res.json(db.propertyMutationItems || []);
  });

  app.get("/api/mutations/ownership-history", (req, res) => {
    const db = loadDatabase();
    res.json(db.propertyOwnershipHistory || []);
  });

  app.get("/api/mutations/status-history", (req, res) => {
    const db = loadDatabase();
    res.json(db.propertyStatusHistory || []);
  });

  app.post("/api/mutations", (req, res) => {
    const db = loadDatabase();
    const {
      mutationType,
      sourcePropertyId,
      targetPropertyId,
      taxpayerId,
      previousTaxpayerId,
      newTaxpayerId,
      previousTdn,
      newTdn,
      previousPin,
      newPin,
      effectivityDate,
      effectivityYear,
      remarks,
      metadata,
      items
    } = req.body;

    const nextId = db.propertyMutations.length > 0 ? Math.max(...db.propertyMutations.map(m => m.id)) + 1 : 1;
    
    // Generate configurable number
    const yearStr = effectivityYear || new Date().getFullYear();
    let prefix = "MUT";
    if (mutationType === "land_transfer" || mutationType === "ownership_transfer") prefix = "TRN";
    else if (mutationType === "subdivision") prefix = "SUB";
    else if (mutationType === "consolidation") prefix = "CON";
    else if (mutationType === "assessment_revision") prefix = "REV";
    else if (mutationType === "cancellation") prefix = "CAN";

    // Filter by year and prefix
    const typedMutations = db.propertyMutations.filter(m => m.mutationNumber.startsWith(`${prefix}-${yearStr}`));
    const seq = typedMutations.length + 1;
    const mutationNumber = `${prefix}-${yearStr}-${String(seq).padStart(6, "0")}`;

    const newMutation = {
      id: nextId,
      mutationNumber,
      mutationType,
      sourcePropertyId: sourcePropertyId ? parseInt(sourcePropertyId) : null,
      targetPropertyId: targetPropertyId ? parseInt(targetPropertyId) : null,
      taxpayerId: taxpayerId ? parseInt(taxpayerId) : null,
      previousTaxpayerId: previousTaxpayerId ? parseInt(previousTaxpayerId) : null,
      newTaxpayerId: newTaxpayerId ? parseInt(newTaxpayerId) : null,
      previousTdn: previousTdn || "",
      newTdn: newTdn || "",
      previousPin: previousPin || "",
      newPin: newPin || "",
      effectivityDate: effectivityDate || new Date().toISOString().split('T')[0],
      effectivityYear: parseInt(effectivityYear) || new Date().getFullYear(),
      status: "draft" as const,
      requestedBy: currentSession?.name || "Renato Valdecantos",
      reviewedBy: "",
      approvedBy: "",
      postedBy: "",
      postedAt: null,
      remarks: remarks || "",
      metadata: typeof metadata === "string" ? metadata : JSON.stringify(metadata || {}),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.propertyMutations.push(newMutation);

    // Save items if any
    if (Array.isArray(items)) {
      items.forEach(itm => {
        const itemNextId = db.propertyMutationItems.length > 0 ? Math.max(...db.propertyMutationItems.map(i => i.id)) + 1 : 1;
        db.propertyMutationItems.push({
          id: itemNextId,
          mutationId: nextId,
          sourcePropertyId: itm.sourcePropertyId ? parseInt(itm.sourcePropertyId) : null,
          targetPropertyId: itm.targetPropertyId ? parseInt(itm.targetPropertyId) : null,
          itemType: itm.itemType || "lot",
          area: parseFloat(itm.area) || 0,
          fairMarketValue: parseFloat(itm.fairMarketValue) || 0,
          assessmentLevel: parseFloat(itm.assessmentLevel) || 0,
          assessedValue: parseFloat(itm.assessedValue) || 0,
          oldValue: typeof itm.oldValue === "string" ? itm.oldValue : JSON.stringify(itm.oldValue || {}),
          newValue: typeof itm.newValue === "string" ? itm.newValue : JSON.stringify(itm.newValue || {}),
          remarks: itm.remarks || "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
    }

    writeDatabase(db);
    
    logAction(
      currentSession?.id || 1,
      currentSession?.username || "admin",
      "CREATE_MUTATION",
      "Assessor Mutation Portal",
      "property_mutations",
      newMutation.id,
      null,
      newMutation
    );

    res.status(201).json(newMutation);
  });

  app.put("/api/mutations/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const db = loadDatabase();
    const idx = db.propertyMutations.findIndex(m => m.id === id);
    if (idx === -1) return res.status(404).json({ message: "Mutation transaction not found." });

    const m = db.propertyMutations[idx];
    if (m.status === "posted") {
      return res.status(400).json({ message: "Posted mutation transactions are locked and cannot be edited." });
    }

    // Prepare fields to update safely (avoid overwriting timestamps and ids unless specified)
    const updated = {
      ...m,
      ...req.body,
      id,
      updatedAt: new Date().toISOString()
    };

    db.propertyMutations[idx] = updated;
    writeDatabase(db);
    res.json(updated);
  });

  app.post("/api/mutations/:id/transition", (req, res) => {
    const id = parseInt(req.params.id);
    const { action, reason, remarks: transRemarks } = req.body;
    const db = loadDatabase();
    const idx = db.propertyMutations.findIndex(m => m.id === id);
    if (idx === -1) return res.status(404).json({ message: "Mutation transaction not found." });

    const m = db.propertyMutations[idx];
    if (m.status === "posted") {
      return res.status(400).json({ message: "This transaction is already posted and locked." });
    }

    let nextStatus: "draft" | "for review" | "approved" | "clearance checked" | "final approved" | "posted" = m.status;
    let reviewer = m.reviewedBy;
    let approver = m.approvedBy;
    let poster = m.postedBy;
    let postedTime = m.postedAt;

    if (action === "review") {
      nextStatus = "for review";
    } else if (action === "approve") {
      nextStatus = "approved";
      reviewer = currentSession?.name || "Senior Assessor Reviewer";
    } else if (action === "clearance") {
      nextStatus = "clearance checked";
    } else if (action === "final_approve") {
      nextStatus = "final approved";
      approver = currentSession?.name || "Municipal Assessor";
    } else if (action === "post") {
      
      const parsedMetadata = m.metadata ? JSON.parse(m.metadata) : {};

      // A. LAND TRANSFER / OWNERSHIP TRANSFER Check outstanding bills
      if (m.mutationType === "land_transfer" || m.mutationType === "ownership_transfer") {
        if (!m.sourcePropertyId) {
          return res.status(400).json({ message: "Missing reference property ID for transfer." });
        }
        // Verify no unpaid tax statements on this property
        const unpaidSoas = db.soaRecords.filter(s => s.propertyId === m.sourcePropertyId && (s.status === "issued" || s.status === "partially paid" || s.balance > 0));
        if (unpaidSoas.length > 0) {
          return res.status(400).json({ 
            message: `Cannot post ownership transfer. Property possesses outstanding real property tax liability of ₱${unpaidSoas.reduce((sum, s) => sum + s.balance, 0).toLocaleString()} across ${unpaidSoas.length} SOAs. Clearing this clearance gate requires complete settlement of all municipal tax dues.` 
          });
        }

        // Apply owner change
        const sourcePropIdx = db.properties.findIndex(p => p.id === m.sourcePropertyId);
        if (sourcePropIdx === -1) {
          return res.status(400).json({ message: "Reference property not found on record." });
        }

        const sourceProp = db.properties[sourcePropIdx];
        const prevOwnerSnap = sourceProp.ownerName;

        // Obtain new owner taxpayer details
        const newOwnerTaxpayer = db.taxpayers.find(t => t.id === m.newTaxpayerId);
        if (!newOwnerTaxpayer) {
          return res.status(400).json({ message: "New owner taxpayer entity not found." });
        }
        const newOwnerName = `${newOwnerTaxpayer.firstName} ${newOwnerTaxpayer.lastName} ${newOwnerTaxpayer.companyName}`.trim();

        // 1. Log in property_ownership_history
        const startOfOwnership = sourceProp.createdAt || new Date().toISOString();
        const historyId = db.propertyOwnershipHistory.length > 0 ? Math.max(...db.propertyOwnershipHistory.map(h => h.id)) + 1 : 1;
        db.propertyOwnershipHistory.push({
          id: historyId,
          propertyId: sourceProp.id,
          taxpayerId: sourceProp.ownerId,
          ownerNameSnapshot: prevOwnerSnap,
          tdnSnapshot: sourceProp.tdn,
          pinSnapshot: sourceProp.pin,
          ownershipStartDate: startOfOwnership,
          ownershipEndDate: new Date().toISOString(),
          acquisitionType: parsedMetadata.transferType || "sale",
          documentReference: parsedMetadata.deedReference || "Transfer Contract",
          mutationId: m.id,
          remarks: transRemarks || m.remarks,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        // 2. Mark previous status as "transferred"
        const oldStatus = sourceProp.status;
        db.properties[sourcePropIdx].status = "transferred";
        db.properties[sourcePropIdx].remarks = `Transferred ownership under transaction ${m.mutationNumber} to ${newOwnerName}`;

        const statusHistId = db.propertyStatusHistory.length > 0 ? Math.max(...db.propertyStatusHistory.map(s => s.id)) + 1 : 1;
        db.propertyStatusHistory.push({
          id: statusHistId,
          propertyId: sourceProp.id,
          previousStatus: oldStatus,
          newStatus: "transferred",
          reason: "Ownership Transfer Mutation Posted",
          mutationId: m.id,
          changedBy: currentSession?.name || "Assessor Registrar",
          changedAt: new Date().toISOString(),
          remarks: transRemarks || ""
        });

        // 3. Create the New Property with the new owner and new TDN
        const newPropId = db.properties.length > 0 ? Math.max(...db.properties.map(p => p.id)) + 1 : 1;
        const newTdnVal = m.newTdn || `TD-${new Date().getFullYear()}-${String(newPropId).padStart(6, "0")}`;
        const newPinVal = m.newPin || sourceProp.pin;

        const transferredProp: Property = {
          ...sourceProp,
          id: newPropId,
          ownerId: newOwnerTaxpayer.id,
          ownerName: newOwnerName,
          tdn: newTdnVal,
          previousTdn: sourceProp.tdn,
          status: "active",
          remarks: `Acquired via ownership transfer from ${prevOwnerSnap} under ${m.mutationNumber}`,
          createdAt: new Date().toISOString()
        };

        db.properties.push(transferredProp);

        m.targetPropertyId = newPropId;
        m.newTdn = newTdnVal;
        m.newPin = newPinVal;

        // Auto-generate Tax Declaration for the new property
        const maxTdId = db.taxDeclarations.length > 0 ? Math.max(...db.taxDeclarations.map(t => t.id)) + 1 : 1;
        db.taxDeclarations.push({
          id: maxTdId,
          tdn: newTdnVal,
          propertyId: newPropId,
          faasId: 1, 
          ownerId: newOwnerTaxpayer.id,
          ownerName: newOwnerName,
          effectivityYear: m.effectivityYear,
          classification: sourceProp.classification,
          assessedValue: sourceProp.area * 500, 
          previousTdn: sourceProp.tdn,
          status: "active",
          dateIssued: new Date().toISOString().split('T')[0],
          issuedBy: currentSession?.name || "Renato Valdecantos",
          remarks: `Auto-generated from transaction ${m.mutationNumber}`
        });

      } else if (m.mutationType === "subdivision") {
        if (!m.sourcePropertyId) {
          return res.status(400).json({ message: "Missing mother reference property ID for subdivision." });
        }
        const motherPropIdx = db.properties.findIndex(p => p.id === m.sourcePropertyId);
        if (motherPropIdx === -1) {
          return res.status(400).json({ message: "Mother property not found." });
        }
        const motherProp = db.properties[motherPropIdx];
        if (motherProp.status !== "active") {
          return res.status(400).json({ message: "Mother property must be active in order to execute a subdivision." });
        }

        const childLots = parsedMetadata.childLots || [];
        if (childLots.length === 0) {
          return res.status(400).json({ message: "Subdivision requires at least one child lot mapped." });
        }

        const totalChildArea = childLots.reduce((sum: number, c: any) => sum + (parseFloat(c.area) || 0), 0);
        if (totalChildArea > motherProp.area && !parsedMetadata.overrideAreaCheck) {
          return res.status(400).json({ 
            message: `Total child area (${totalChildArea} sqm) exceeds mother property total area (${motherProp.area} sqm). Subdivision blocked unless area override permission is enabled in metadata.` 
          });
        }

        // Cancel mother property
        const oldMotherStatus = motherProp.status;
        db.properties[motherPropIdx].status = "subdivided";
        db.properties[motherPropIdx].remarks = `Subdivided into ${childLots.length} lots under transaction ${m.mutationNumber}`;

        const statusHistId = db.propertyStatusHistory.length > 0 ? Math.max(...db.propertyStatusHistory.map(s => s.id)) + 1 : 1;
        db.propertyStatusHistory.push({
          id: statusHistId,
          propertyId: motherProp.id,
          previousStatus: oldMotherStatus,
          newStatus: "subdivided",
          reason: "Property Subdivided Mutation",
          mutationId: m.id,
          changedBy: currentSession?.name || "Renato Valdecantos",
          changedAt: new Date().toISOString(),
          remarks: `Mother lot split into ${childLots.length} separate sub-titles.`
        });

        // Insert each child lot as property
        childLots.forEach((lot: any, lotIdx: number) => {
          const childPropId = db.properties.length > 0 ? Math.max(...db.properties.map(p => p.id)) + 1 : 1;
          const childTdn = lot.tdn || `TD-${new Date().getFullYear()}-${String(childPropId).padStart(6, "0")}`;
          const childPin = lot.pin || `${motherProp.pin}-S${lotIdx + 1}`;
          
          let childOwnerId = motherProp.ownerId;
          let childOwnerName = motherProp.ownerName;

          if (lot.ownerId) {
            const foundChildOwner = db.taxpayers.find(tx => tx.id === parseInt(lot.ownerId));
            if (foundChildOwner) {
              childOwnerId = foundChildOwner.id;
              childOwnerName = `${foundChildOwner.firstName} ${foundChildOwner.lastName} ${foundChildOwner.companyName}`.trim();
            }
          }

          const newChildProp: Property = {
            id: childPropId,
            pin: childPin,
            tdn: childTdn,
            previousTdn: motherProp.tdn,
            ownerId: childOwnerId,
            ownerName: childOwnerName,
            administrator: lot.administrator || "Self",
            kind: "land",
            classification: lot.classification || motherProp.classification,
            barangayId: motherProp.barangayId,
            barangayName: motherProp.barangayName,
            street: motherProp.street,
            lotNo: lot.lotNo || `Lot ${lotIdx + 1}`,
            blockNo: motherProp.blockNo,
            surveyNo: lot.surveyNo || motherProp.surveyNo,
            titleNo: lot.titleNo || "",
            area: parseFloat(lot.area) || 100,
            unit: motherProp.unit,
            boundaries: lot.boundaries || "",
            latitude: motherProp.latitude,
            longitude: motherProp.longitude,
            parcelReference: `PAR-SUB-${childPropId}`,
            status: "active",
            remarks: `Created via subdivision of mother property ${motherProp.tdn} under ${m.mutationNumber}`,
            createdAt: new Date().toISOString()
          };

          db.properties.push(newChildProp);

          // Add item entry
          const itemNextId = db.propertyMutationItems.length > 0 ? Math.max(...db.propertyMutationItems.map(i => i.id)) + 1 : 1;
          db.propertyMutationItems.push({
            id: itemNextId,
            mutationId: m.id,
            sourcePropertyId: motherProp.id,
            targetPropertyId: childPropId,
            itemType: "subdivision_lot",
            area: newChildProp.area,
            fairMarketValue: parseFloat(lot.fairMarketValue) || 100000,
            assessmentLevel: parseFloat(lot.assessmentLevel) || 20,
            assessedValue: parseFloat(lot.assessedValue) || 20000,
            oldValue: JSON.stringify({ motherTdn: motherProp.tdn, motherArea: motherProp.area }),
            newValue: JSON.stringify({ childTdn, childArea: newChildProp.area, childPin }),
            remarks: `Subdivided Child Lot ${lotIdx + 1}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

          // Generate FAAS reference
          const maxF = db.faasRecords.length > 0 ? Math.max(...db.faasRecords.map(f => f.id)) + 1 : 1;
          db.faasRecords.push({
            id: maxF,
            faasNumber: `FAAS-SUB-${String(maxF).padStart(6, "0")}`,
            propertyId: childPropId,
            taxpayerId: newChildProp.ownerId,
            effectivityYear: m.effectivityYear,
            revisionYear: new Date().getFullYear(),
            fairMarketValue: parseFloat(lot.fairMarketValue) || 100000,
            assessmentLevel: parseFloat(lot.assessmentLevel) || 20,
            assessedValue: parseFloat(lot.assessedValue) || 20000,
            appraisedBy: currentSession?.name || "Assessor Appraiser",
            dateAppraised: new Date().toISOString().split('T')[0],
            recommendedBy: "Staff Reviewer",
            approvedBy: currentSession?.name || "Assessor chief",
            dateApproved: new Date().toISOString().split('T')[0],
            status: "approved",
            createdAt: new Date().toISOString()
          });

          // Custom Tax Dec for subdivided lot
          const maxTdId = db.taxDeclarations.length > 0 ? Math.max(...db.taxDeclarations.map(t => t.id)) + 1 : 1;
          db.taxDeclarations.push({
            id: maxTdId,
            tdn: childTdn,
            propertyId: childPropId,
            faasId: maxF,
            ownerId: newChildProp.ownerId,
            ownerName: newChildProp.ownerName,
            effectivityYear: m.effectivityYear,
            classification: newChildProp.classification,
            assessedValue: parseFloat(lot.assessedValue) || 20000,
            previousTdn: motherProp.tdn,
            status: "active",
            dateIssued: new Date().toISOString().split('T')[0],
            issuedBy: currentSession?.name || "Renato Valdecantos",
            remarks: `Subdivision offspring from ${motherProp.tdn}`
          });
        });

      } else if (m.mutationType === "consolidation") {
        const sourceIds: number[] = parsedMetadata.sourcePropertyIds || [];
        if (sourceIds.length < 2) {
          return res.status(400).json({ message: "Consolidation requires at least 2 source properties." });
        }

        const sources = db.properties.filter(p => sourceIds.includes(p.id));
        const inactiveSources = sources.filter(s => s.status !== "active");
        if (inactiveSources.length > 0) {
          return res.status(400).json({ message: "All source properties for consolidation must be active." });
        }

        const totalCombinedArea = sources.reduce((sum, s) => sum + s.area, 0);
        const firstProp = sources[0];

        const consTdId = db.properties.length > 0 ? Math.max(...db.properties.map(p => p.id)) + 1 : 1;
        const consTdn = m.newTdn || `TD-CON-${consTdId}`;
        const consPin = m.newPin || `CON-${firstProp.pin}`;

        const consolidatedProperty: Property = {
          id: consTdId,
          pin: consPin,
          tdn: consTdn,
          previousTdn: sources.map(s => s.tdn).join(", "),
          ownerId: m.newTaxpayerId || firstProp.ownerId,
          ownerName: firstProp.ownerName,
          administrator: firstProp.administrator,
          kind: firstProp.kind,
          classification: firstProp.classification,
          barangayId: firstProp.barangayId,
          barangayName: firstProp.barangayName,
          street: firstProp.street,
          lotNo: "Consolidated Lot",
          blockNo: firstProp.blockNo,
          surveyNo: "Consolidated Survey No.",
          titleNo: "",
          area: totalCombinedArea,
          unit: firstProp.unit,
          boundaries: "Bordered by combined consolidated borders",
          latitude: firstProp.latitude,
          longitude: firstProp.longitude,
          parcelReference: `PAR-CON-${consTdId}`,
          status: "active",
          remarks: `Merged from source parts: ${sources.map(s => s.tdn).join(", ")}`,
          createdAt: new Date().toISOString()
        };

        db.properties.push(consolidatedProperty);

        // Cancel sources
        sources.forEach(src => {
          const srcIdx = db.properties.findIndex(p => p.id === src.id);
          db.properties[srcIdx].status = "consolidated";
          db.properties[srcIdx].remarks = `Merged into consolidated TDN ${consTdn} under transaction ${m.mutationNumber}`;

          const statusHistId = db.propertyStatusHistory.length > 0 ? Math.max(...db.propertyStatusHistory.map(s => s.id)) + 1 : 1;
          db.propertyStatusHistory.push({
            id: statusHistId,
            propertyId: src.id,
            previousStatus: "active",
            newStatus: "consolidated",
            reason: "Property Consolidated Mutation",
            mutationId: m.id,
            changedBy: currentSession?.name || "Assessor Registrar",
            changedAt: new Date().toISOString(),
            remarks: `Merged with adjacent properties into Consolidated Title.`
          });
        });

        m.targetPropertyId = consTdId;

      } else if (m.mutationType === "reclassification") {
        if (!m.sourcePropertyId) return res.status(400).json({ message: "No target property selected." });
        const pIdx = db.properties.findIndex(p => p.id === m.sourcePropertyId);
        if (pIdx === -1) return res.status(400).json({ message: "Target property not found." });

        const prevClass = db.properties[pIdx].classification;
        const targetClass = parsedMetadata.newClassification || "commercial";
        db.properties[pIdx].classification = targetClass;
        db.properties[pIdx].remarks += ` (Reclassified from ${prevClass} to ${targetClass} on ${m.effectivityYear})`;

        const statusHistId = db.propertyStatusHistory.length > 0 ? Math.max(...db.propertyStatusHistory.map(s => s.id)) + 1 : 1;
        db.propertyStatusHistory.push({
          id: statusHistId,
          propertyId: m.sourcePropertyId,
          previousStatus: "active",
          newStatus: "active",
          reason: `Reclassified classification metadata from ${prevClass} to ${targetClass}`,
          mutationId: m.id,
          changedBy: currentSession?.name || "Municipal Assessor",
          changedAt: new Date().toISOString(),
          remarks: m.remarks
        });

      } else if (m.mutationType === "assessment_revision") {
        if (!m.sourcePropertyId) return res.status(400).json({ message: "No source property selected." });
        const pIdx = db.properties.findIndex(p => p.id === m.sourcePropertyId);
        if (pIdx === -1) return res.status(400).json({ message: "Property not found." });

        const newFmv = parseFloat(parsedMetadata.fairMarketValue) || 500000;
        const newAsLvl = parseFloat(parsedMetadata.assessmentLevel) || 20;
        const newAssessed = (newFmv * newAsLvl) / 100;

        const maxF = db.faasRecords.length > 0 ? Math.max(...db.faasRecords.map(f => f.id)) + 1 : 1;
        db.faasRecords.push({
          id: maxF,
          faasNumber: `REV-FAAS-${maxF}`,
          propertyId: m.sourcePropertyId,
          taxpayerId: db.properties[pIdx].ownerId,
          effectivityYear: m.effectivityYear,
          revisionYear: new Date().getFullYear(),
          fairMarketValue: newFmv,
          assessmentLevel: newAsLvl,
          assessedValue: newAssessed,
          appraisedBy: currentSession?.name || "Assessor Staff Appraisal Team",
          dateAppraised: new Date().toISOString().split('T')[0],
          recommendedBy: "Senior Assessor Advisor",
          approvedBy: currentSession?.name || "Renato Valdecantos",
          dateApproved: new Date().toISOString().split('T')[0],
          status: "approved",
          createdAt: new Date().toISOString()
        });

      } else if (m.mutationType === "cancellation") {
        if (!m.sourcePropertyId) return res.status(400).json({ message: "Property id required for cancellation." });
        const pIdx = db.properties.findIndex(p => p.id === m.sourcePropertyId);
        if (pIdx === -1) return res.status(400).json({ message: "Property not found." });

        const oldStatus = db.properties[pIdx].status;
        db.properties[pIdx].status = "cancelled";
        db.properties[pIdx].remarks = `Cancelled! Reason: ${parsedMetadata.cancelReason || "Erroneous assessment"}. Reference ${m.mutationNumber}`;

        const statusHistId = db.propertyStatusHistory.length > 0 ? Math.max(...db.propertyStatusHistory.map(s => s.id)) + 1 : 1;
        db.propertyStatusHistory.push({
          id: statusHistId,
          propertyId: m.sourcePropertyId,
          previousStatus: oldStatus,
          newStatus: "cancelled",
          reason: `Declaration Cancelled: ${parsedMetadata.cancelReason || "Request of taxpayer"}`,
          mutationId: m.id,
          changedBy: currentSession?.name || "Renato Valdecantos",
          changedAt: new Date().toISOString(),
          remarks: m.remarks
        });
      }

      nextStatus = "posted";
      poster = currentSession?.name || "Municipal Assessor";
      postedTime = new Date().toISOString();
    }

    m.status = nextStatus;
    m.reviewedBy = reviewer;
    m.approvedBy = approver;
    m.postedBy = poster;
    m.postedAt = postedTime;
    m.updatedAt = new Date().toISOString();

    db.propertyMutations[idx] = m;
    writeDatabase(db);

    logAction(
      currentSession?.id || 1,
      currentSession?.username || "admin",
      `TRANSITION_MUTATION_${action.toUpperCase()}`,
      "Assessor Mutation Portal",
      "property_mutations",
      m.id,
      null,
      m
    );

    res.json(m);
  });

  // Hot-reloads & serves SPA
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LGU Paete RPT Billing & Collection System online on port ${PORT}`);
  });
}

startServer();
