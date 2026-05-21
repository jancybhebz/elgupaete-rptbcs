import fs from "fs";
import path from "path";

// Define Interfaces for RPT tables
export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  office: string;
  status: "active" | "inactive" | "locked";
  passwordHash: string; // bcrypt placeholder
  createdAt: string;
}

export interface Taxpayer {
  id: number;
  code: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  companyName: string;
  type: "individual" | "corporation" | "estate" | "government";
  tin: string;
  contactNumber: string;
  email: string;
  address: string;
  barangay: string;
  municipality: string;
  province: string;
  zipCode: string;
  status: "active" | "inactive";
  remarks: string;
  createdAt: string;
}

export interface Property {
  id: number;
  pin: string;
  tdn: string;
  previousTdn: string;
  ownerId: number;
  ownerName: string;
  administrator: string;
  kind: "land" | "building" | "machinery";
  classification: "residential" | "commercial" | "agricultural" | "industrial" | "mineral" | "special";
  barangayId: number;
  barangayName: string;
  street: string;
  lotNo: string;
  blockNo: string;
  surveyNo: string;
  titleNo: string;
  area: number;
  unit: "sqm" | "hectare";
  boundaries: string;
  latitude: number;
  longitude: number;
  parcelReference: string;
  status: "active" | "cancelled" | "revised" | "transferred" | "subdivided" | "consolidated";
  remarks: string;
  createdAt: string;
}

export interface FaaSRecord {
  id: number;
  faasNumber: string;
  propertyId: number;
  taxpayerId: number;
  effectivityYear: number;
  revisionYear: number;
  fairMarketValue: number;
  assessmentLevel: number; // percentage, e.g. 20 for 20%
  assessedValue: number;
  appraisedBy: string;
  dateAppraised: string;
  recommendedBy: string;
  approvedBy: string;
  dateApproved: string;
  status: "draft" | "for review" | "approved" | "cancelled" | "archived";
  createdAt: string;
}

export interface TaxDeclaration {
  id: number;
  tdn: string;
  propertyId: number;
  faasId: number;
  ownerId: number;
  ownerName: string;
  effectivityYear: number;
  classification: string;
  assessedValue: number;
  previousTdn: string;
  status: "active" | "revised" | "cancelled";
  dateIssued: string;
  issuedBy: string;
  remarks: string;
}

export interface BillingYear {
  year: number;
  basicRate: number; // e.g. 0.01 for 1%
  sefRate: number;   // e.g. 0.01 for 1%
}

export interface SoaRecord {
  id: number;
  soaNumber: string;
  taxpayerId: number;
  propertyId: number;
  billingYear: number;
  billingPeriod: "annual" | "q1" | "q2" | "q3" | "q4";
  assessedValue: number;
  basicRptAmount: number;
  sefAmount: number;
  penaltyAmount: number;
  discountAmount: number;
  totalDue: number;
  amountPaid: number;
  balance: number;
  dueDate: string;
  status: "draft" | "issued" | "partially paid" | "fully paid" | "cancelled" | "expired";
  preparedBy: string;
  approvedBy: string;
  createdAt: string;
  verificationCode: string;
}

export interface Payment {
  id: number;
  paymentRef: string;
  soaNumber: string;
  taxpayerId: number;
  taxpayerName: string;
  propertyId: number;
  orNumber: string;
  paymentDate: string;
  paymentChannel: "Cash" | "Check" | "Bank Transfer" | "LandBank LinkBiz" | "GCash" | "Maya" | "eGovPay";
  amountPaid: number;
  basicPortion: number;
  sefPortion: number;
  penaltyPortion: number;
  discountApplied: number;
  cashierName: string;
  status: "pending" | "posted" | "voided" | "cancelled" | "reversed";
  voidReason?: string;
  voidedBy?: string;
}

export interface OfficialReceipt {
  id: number;
  orNumber: string;
  paymentId: number;
  taxpayerName: string;
  amount: number;
  paymentDate: string;
  cashierName: string;
  remarks: string;
  status: "active" | "voided";
  voidReason?: string;
}

export interface Attachment {
  id: number;
  propertyId: number;
  fileName: string;
  fileType: string;
  fileSize: number; // in KB
  category: "FAAS" | "Tax Declaration" | "Land Title" | "Sketch Plan" | "Deed of Sale" | "Other";
  uploadedBy: string;
  uploadedAt: string;
  securePath: string;
}

export interface AuditLog {
  id: number;
  userId: number;
  username: string;
  action: string;
  module: string;
  recordType: string;
  recordId: number | string;
  oldValues: string; // JSON String
  newValues: string; // JSON String
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export interface SystemSettings {
  lguName: string;
  province: string;
  municipality: string;
  officeName: string;
  assessmentStartYear: number;
  basicRptRate: number; // e.g. 1%
  sefRate: number;      // e.g. 1%
  penaltyRatePercent: number; // e.g. 2% per month
  maxPenaltyPercent: number; // e.g. 72% (36 months at 2%)
  discountPercent: number; // e.g. 10% for early payments
  discountDeadline: string; // "YYYY-MM-DD"
  paymentProviderName: string;
  paymentBaseUrl: string;
  paymentApiKeyEncrypted: string;
  paymentEnvironment: "sandbox" | "production";
  paymentEnabled: boolean;
}

// In-Memory Database Structure saved to JSON File
interface DatabaseSchema {
  users: User[];
  taxpayers: Taxpayer[];
  barangays: Array<{ id: number; name: string; zipCode: string }>;
  properties: Property[];
  faasRecords: FaaSRecord[];
  taxDeclarations: TaxDeclaration[];
  billingYears: BillingYear[];
  soaRecords: SoaRecord[];
  payments: Payment[];
  officialReceipts: OfficialReceipt[];
  attachments: Attachment[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
}

const DB_FILE_PATH = path.join(process.cwd(), "db_store.json");

// Retrieve full schema
export function loadDatabase(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE_PATH)) {
    const defaultDb = getSeedData();
    writeDatabase(defaultDb);
    return defaultDb;
  }
  try {
    const raw = fs.readFileSync(DB_FILE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to read JSON DB. Returning default seed.", err);
    return getSeedData();
  }
}

// Write schema back
export function writeDatabase(data: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing JSON DB file", err);
  }
}

// Logger helper
export function logAction(
  userId: number,
  username: string,
  action: string,
  module: string,
  recordType: string,
  recordId: number | string,
  oldValues: any,
  newValues: any,
  ip: string = "127.0.0.1",
  ua: string = "Server System"
) {
  const db = loadDatabase();
  const nextId = db.auditLogs.length > 0 ? Math.max(...db.auditLogs.map(l => l.id)) + 1 : 1;
  const newLog: AuditLog = {
    id: nextId,
    userId,
    username,
    action,
    module,
    recordType,
    recordId,
    oldValues: oldValues ? JSON.stringify(oldValues) : "{}",
    newValues: newValues ? JSON.stringify(newValues) : "{}",
    ipAddress: ip,
    userAgent: ua,
    createdAt: new Date().toISOString()
  };
  db.auditLogs.unshift(newLog); // Prepend to show latest logs first
  writeDatabase(db);
}

// Default Paete Master Seeder
function getSeedData(): DatabaseSchema {
  return {
    users: [
      {
        id: 1,
        username: "admin",
        name: "Honesto Administrator",
        email: "admin@paete.gov.ph",
        role: "System Administrator",
        office: "LGU Paete Admin Group",
        status: "active",
        passwordHash: "admin123", // Simple plain or hashed for mockup login
        createdAt: "2026-01-10T08:00:00Z"
      },
      {
        id: 2,
        username: "assessor",
        name: "Renato D. Valdecantos",
        email: "assessor@paete.gov.ph",
        role: "Municipal Assessor",
        office: "Office of the Municipal Assessor",
        status: "active",
        passwordHash: "assessor123",
        createdAt: "2026-01-15T09:30:00Z"
      },
      {
        id: 3,
        username: "cashier",
        name: "Maria Theresa Alarcon",
        email: "cashier@paete.gov.ph",
        role: "Treasury Cashier",
        office: "Office of the Municipal Treasurer",
        status: "active",
        passwordHash: "cashier123",
        createdAt: "2026-01-16T10:15:00Z"
      },
      {
        id: 4,
        username: "treasurer",
        name: "Felipe L. Cagandahan",
        email: "treasurer@paete.gov.ph",
        role: "Municipal Treasurer",
        office: "Office of the Municipal Treasurer",
        status: "active",
        passwordHash: "treasurer123",
        createdAt: "2026-01-16T11:00:00Z"
      },
      {
        id: 5,
        username: "staff",
        name: "John Assessor Staff",
        email: "staff@paete.gov.ph",
        role: "Assessor Staff",
        office: "Office of the Municipal Assessor",
        status: "active",
        passwordHash: "staff123",
        createdAt: "2026-01-18T10:00:00Z"
      },
      {
        id: 6,
        username: "supervisor",
        name: "Carlos T. Supervisor",
        email: "supervisor@paete.gov.ph",
        role: "Treasury Supervisor",
        office: "Office of the Municipal Treasurer",
        status: "active",
        passwordHash: "super123",
        createdAt: "2026-01-19T08:00:00Z"
      },
      {
        id: 7,
        username: "viewer",
        name: "Alicia P. Report Viewer",
        email: "viewer@paete.gov.ph",
        role: "Report Viewer",
        office: "Audit and Accounting Office",
        status: "active",
        passwordHash: "viewer123",
        createdAt: "2026-01-20T14:45:00Z"
      }
    ],
    barangays: [
      { id: 1, name: "Bagumbayan", zipCode: "4016" },
      { id: 2, name: "Ermita", zipCode: "4016" },
      { id: 3, name: "Maytoong", zipCode: "4016" },
      { id: 4, name: "Quinale", zipCode: "4016" },
      { id: 5, name: "San Juan", zipCode: "4016" },
      { id: 6, name: "San Pedro", zipCode: "4016" },
      { id: 7, name: "Ilaya Norte", zipCode: "4016" },
      { id: 8, name: "Ilaya Sur", zipCode: "4016" },
      { id: 9, name: "Poblacion", zipCode: "4016" }
    ],
    taxpayers: [
      {
        id: 1,
        code: "TP-2026-000001",
        firstName: "Generoso",
        middleName: "Adaya",
        lastName: "Aseoche",
        suffix: "",
        companyName: "Paete Woodcarving Handicrafts Inc.",
        type: "individual",
        tin: "102-394-582-000",
        contactNumber: "0917-555-1234",
        email: "gener.aseoche@woodcraft.com",
        address: "74 J.P. Rizal St.",
        barangay: "Bagumbayan",
        municipality: "Paete",
        province: "Laguna",
        zipCode: "4016",
        status: "active",
        remarks: "Pioneer woodcarving shop owner in Paete.",
        createdAt: "2026-01-20T08:00:00Z"
      },
      {
        id: 2,
        code: "TP-2026-000002",
        firstName: "Luzviminda",
        middleName: "Q.",
        lastName: "Madriñan",
        suffix: "",
        companyName: "Luz Craft Papermache",
        type: "individual",
        tin: "205-883-111-001",
        contactNumber: "0918-444-9876",
        email: "luz.madrinan@taka.ph",
        address: "12 Quesada Street",
        barangay: "Quinale",
        municipality: "Paete",
        province: "Laguna",
        zipCode: "4016",
        status: "active",
        remarks: "Renowned Taka (papier-mâché) maker.",
        createdAt: "2026-01-22T09:12:00Z"
      },
      {
        id: 3,
        code: "TP-2026-000003",
        firstName: "",
        middleName: "",
        lastName: "",
        suffix: "",
        companyName: "Laguna Wood Products Corp.",
        type: "corporation",
        tin: "400-111-222-000",
        contactNumber: "049-501-1234",
        email: "procurement@lagunawood.corp",
        address: "National Highway, Brgy. Maytoong",
        barangay: "Maytoong",
        municipality: "Paete",
        province: "Laguna",
        zipCode: "4016",
        status: "active",
        remarks: "Large scale lumber processing corporation.",
        createdAt: "2026-02-10T11:05:00Z"
      }
    ],
    properties: [
      {
        id: 1,
        pin: "162-12-001-04-001",
        tdn: "TD-2026-000001",
        previousTdn: "TD-2020-009948",
        ownerId: 1,
        ownerName: "Generoso Adaya Aseoche",
        administrator: "Self",
        kind: "land",
        classification: "commercial",
        barangayId: 1,
        barangayName: "Bagumbayan",
        street: "74 J.P. Rizal St.",
        lotNo: "Lot 412-A",
        blockNo: "Blk 12",
        surveyNo: "Cad 412",
        titleNo: "TCT-991823",
        area: 320,
        unit: "sqm",
        boundaries: "N: Rizal Street, E: Lot 412-B, S: Lot 413, W: J.P. Rizal alley",
        latitude: 14.364444,
        longitude: 121.527222,
        parcelReference: "PAR-PAETE-00124",
        status: "active",
        remarks: "Woodcarving retail shop site with prime highway frontage.",
        createdAt: "2026-01-20T08:30:00Z"
      },
      {
        id: 2,
        pin: "162-12-004-01-314",
        tdn: "TD-2026-000002",
        previousTdn: "TD-2021-008122",
        ownerId: 2,
        ownerName: "Luzviminda Q. Madriñan",
        administrator: "Self",
        kind: "land",
        classification: "residential",
        barangayId: 4,
        barangayName: "Quinale",
        street: "12 Quesada Street",
        lotNo: "Lot 992-B",
        blockNo: "Blk 4",
        surveyNo: "Psu-91223",
        titleNo: "TCT-124987",
        area: 180,
        unit: "sqm",
        boundaries: "N: Quesada St, E: Lot 992-C, S: Cad-104, W: Barangay path",
        latitude: 14.362500,
        longitude: 121.529167,
        parcelReference: "PAR-PAETE-00512",
        status: "active",
        remarks: "Hereditary residential property housing family craftsmen.",
        createdAt: "2026-01-22T09:40:00Z"
      },
      {
        id: 3,
        pin: "162-12-003-12-009",
        tdn: "TD-2026-000003",
        previousTdn: "TD-2018-005234",
        ownerId: 3,
        ownerName: "Laguna Wood Products Corp.",
        administrator: "Engr. Dante Reyes",
        kind: "building",
        classification: "industrial",
        barangayId: 3,
        barangayName: "Maytoong",
        street: "National Highway",
        lotNo: "Lot 15",
        blockNo: "Blk 1",
        surveyNo: "Cad 221",
        titleNo: "T-88231",
        area: 1250,
        unit: "sqm",
        boundaries: "N: Highway, E: Creek, S: Government Lot, W: Cad 222",
        latitude: 14.359722,
        longitude: 121.525556,
        parcelReference: "PAR-PAETE-00991",
        status: "active",
        remarks: "Main warehouse and industrial woodcutter kiln plant.",
        createdAt: "2026-02-10T11:20:00Z"
      }
    ],
    faasRecords: [
      {
        id: 1,
        faasNumber: "FAAS-2026-000001",
        propertyId: 1,
        taxpayerId: 1,
        effectivityYear: 2026,
        revisionYear: 2024,
        fairMarketValue: 1500000.00,
        assessmentLevel: 30.00, // 30% for commercial land standard
        assessedValue: 450000.00,
        appraisedBy: "John Assessor Staff",
        dateAppraised: "2026-01-18",
        recommendedBy: "John Assessor Staff",
        approvedBy: "Renato D. Valdecantos",
        dateApproved: "2026-01-20",
        status: "approved",
        createdAt: "2026-01-20T08:20:00Z"
      },
      {
        id: 2,
        faasNumber: "FAAS-2026-000002",
        propertyId: 2,
        taxpayerId: 2,
        effectivityYear: 2026,
        revisionYear: 2024,
        fairMarketValue: 600000.00,
        assessmentLevel: 20.00, // 20% for residential land standard
        assessedValue: 120000.00,
        appraisedBy: "John Assessor Staff",
        dateAppraised: "2026-01-21",
        recommendedBy: "John Assessor Staff",
        approvedBy: "Renato D. Valdecantos",
        dateApproved: "2026-01-22",
        status: "approved",
        createdAt: "2026-01-22T09:30:00Z"
      },
      {
        id: 3,
        faasNumber: "FAAS-2026-000003",
        propertyId: 3,
        taxpayerId: 3,
        effectivityYear: 2026,
        revisionYear: 2024,
        fairMarketValue: 3500000.00,
        assessmentLevel: 50.00, // 50% for industrial structures standard
        assessedValue: 1750000.00,
        appraisedBy: "John Assessor Staff",
        dateAppraised: "2026-02-05",
        recommendedBy: "John Assessor Staff",
        approvedBy: "Renato D. Valdecantos",
        dateApproved: "2026-02-10",
        status: "approved",
        createdAt: "2026-02-10T11:15:00Z"
      }
    ],
    taxDeclarations: [
      {
        id: 1,
        tdn: "TD-2026-000001",
        propertyId: 1,
        faasId: 1,
        ownerId: 1,
        ownerName: "Generoso Adaya Aseoche",
        effectivityYear: 2026,
        classification: "commercial",
        assessedValue: 450000.00,
        previousTdn: "TD-2020-009948",
        status: "active",
        dateIssued: "2026-01-20",
        issuedBy: "Renato D. Valdecantos",
        remarks: "Auto-generated from approved FAAS-2026-000001"
      },
      {
        id: 2,
        tdn: "TD-2026-000002",
        propertyId: 2,
        faasId: 2,
        ownerId: 2,
        ownerName: "Luzviminda Q. Madriñan",
        effectivityYear: 2026,
        classification: "residential",
        assessedValue: 120000.00,
        previousTdn: "TD-2021-008122",
        status: "active",
        dateIssued: "2026-01-22",
        issuedBy: "Renato D. Valdecantos",
        remarks: "Auto-generated from approved FAAS-2026-000002"
      },
      {
        id: 3,
        tdn: "TD-2026-000003",
        propertyId: 3,
        faasId: 3,
        ownerId: 3,
        ownerName: "Laguna Wood Products Corp.",
        effectivityYear: 2026,
        classification: "industrial",
        assessedValue: 1750000.00,
        previousTdn: "TD-2018-005234",
        status: "active",
        dateIssued: "2026-02-10",
        issuedBy: "Renato D. Valdecantos",
        remarks: "Auto-generated from approved FAAS-2026-000003"
      }
    ],
    billingYears: [
      { year: 2026, basicRate: 0.01, sefRate: 0.01 },
      { year: 2025, basicRate: 0.01, sefRate: 0.01 },
      { year: 2024, basicRate: 0.01, sefRate: 0.01 }
    ],
    soaRecords: [
      {
        id: 1,
        soaNumber: "SOA-2026-000001",
        taxpayerId: 1,
        propertyId: 1,
        billingYear: 2026,
        billingPeriod: "annual",
        assessedValue: 450000.00,
        basicRptAmount: 4500.00, // 450,000 * 1%
        sefAmount: 4500.00,      // 450,000 * 1%
        penaltyAmount: 0.00,
        discountAmount: 900.00,   // 10% discount for annual prompt payment
        totalDue: 8100.00,       // 9000 - 900
        amountPaid: 8100.00,
        balance: 0.00,
        dueDate: "2026-03-31",
        status: "fully paid",
        preparedBy: "cashier",
        approvedBy: "treasurer",
        createdAt: "2026-01-25T08:00:00Z",
        verificationCode: "VF-SOA-450F2B"
      },
      {
        id: 2,
        soaNumber: "SOA-2026-000002",
        taxpayerId: 2,
        propertyId: 2,
        billingYear: 2026,
        billingPeriod: "annual",
        assessedValue: 120000.00,
        basicRptAmount: 1200.00, // 120,000 * 1%
        sefAmount: 1200.00,      // 120,000 * 1%
        penaltyAmount: 0.00,
        discountAmount: 0.00,
        totalDue: 2400.00,
        amountPaid: 0.00,
        balance: 2400.00,
        dueDate: "2026-03-31",
        status: "issued",
        preparedBy: "cashier",
        approvedBy: "treasurer",
        createdAt: "2026-02-01T10:00:00Z",
        verificationCode: "VF-SOA-12AC88"
      },
      {
        id: 3,
        soaNumber: "SOA-2026-000003",
        taxpayerId: 3,
        propertyId: 3,
        billingYear: 2026,
        billingPeriod: "annual",
        assessedValue: 1750000.00,
        basicRptAmount: 17500.00,
        sefAmount: 17500.00,
        penaltyAmount: 1400.00, // Simulated penalty of 2% per month (2 months past march = 4%)
        discountAmount: 0.00,
        totalDue: 36400.00, // 35000 + 1400
        amountPaid: 0.00,
        balance: 36400.00,
        dueDate: "2026-03-31",
        status: "issued",
        preparedBy: "cashier",
        approvedBy: "treasurer",
        createdAt: "2026-02-15T14:20:00Z",
        verificationCode: "VF-SOA-88BE12"
      }
    ],
    payments: [
      {
        id: 1,
        paymentRef: "PAY-20260125-000001",
        soaNumber: "SOA-2026-000001",
        taxpayerId: 1,
        taxpayerName: "Generoso Adaya Aseoche",
        propertyId: 1,
        orNumber: "OR-2026-77881",
        paymentDate: "2026-01-25T09:15:00Z",
        paymentChannel: "Cash",
        amountPaid: 8100.00,
        basicPortion: 4050.00,
        sefPortion: 4050.00,
        penaltyPortion: 0.00,
        discountApplied: 900.00,
        cashierName: "Maria Theresa Alarcon",
        status: "posted"
      }
    ],
    officialReceipts: [
      {
        id: 1,
        orNumber: "OR-2026-77881",
        paymentId: 1,
        taxpayerName: "Generoso Adaya Aseoche",
        amount: 8100.00,
        paymentDate: "2026-01-25T09:15:00Z",
        cashierName: "Maria Theresa Alarcon",
        remarks: "Full annual payment with 10% prompt discount",
        status: "active"
      }
    ],
    attachments: [
      {
        id: 1,
        propertyId: 1,
        fileName: "land_title_aseoche.pdf",
        fileType: "application/pdf",
        fileSize: 1420,
        category: "Land Title",
        uploadedBy: "John Assessor Staff",
        uploadedAt: "2026-01-20T08:35:00Z",
        securePath: "/writable/uploads/properties/1/land_title_aseoche.pdf"
      }
    ],
    auditLogs: [
      {
        id: 1,
        userId: 3,
        username: "cashier",
        action: "POST_PAYMENT",
        module: "Treasury Collection",
        recordType: "payment",
        recordId: 1,
        oldValues: "{}",
        newValues: '{"paymentRef":"PAY-20260125-000001","orNumber":"OR-2026-77881","amountPaid":8100}',
        ipAddress: "192.168.1.102",
        userAgent: "Mozilla/5.0 Chrome/120.0",
        createdAt: "2026-01-25T09:15:00Z"
      },
      {
        id: 2,
        userId: 2,
        username: "assessor",
        action: "APPROVE_FAAS",
        module: "FAAS Assessment",
        recordType: "faas",
        recordId: 1,
        oldValues: '{"status":"draft"}',
        newValues: '{"status":"approved"}',
        ipAddress: "192.168.1.84",
        userAgent: "Mozilla/5.0 Chrome/120.0",
        createdAt: "2026-01-20T08:20:00Z"
      }
    ],
    settings: {
      lguName: "Local Government Unit of Paete",
      province: "Laguna",
      municipality: "Paete",
      officeName: "Office of the Municipal Treasurer / Assessor",
      assessmentStartYear: 2020,
      basicRptRate: 1.0, // 1%
      sefRate: 1.0,      // 1%
      penaltyRatePercent: 2.0, // 2% per month
      maxPenaltyPercent: 72.0, // max 72%
      discountPercent: 10.0,   // 10%
      discountDeadline: "2026-03-31",
      paymentProviderName: "LandBank LinkBizPortal",
      paymentBaseUrl: "https://www.lbp-linkbiz.com.ph/api",
      paymentApiKeyEncrypted: "U09BLUxFVkVMLVBBRVRFLTIwMjYK", // Base64 representation for mockup
      paymentEnvironment: "sandbox",
      paymentEnabled: true
    }
  };
}
