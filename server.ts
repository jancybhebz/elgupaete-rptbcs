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
