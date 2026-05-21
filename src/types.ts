export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  office: string;
  status: "active" | "inactive" | "locked";
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
  assessmentLevel: number;
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
  fileSize: number;
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
  oldValues: string;
  newValues: string;
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
  basicRptRate: number;
  sefRate: number;
  penaltyRatePercent: number;
  maxPenaltyPercent: number;
  discountPercent: number;
  discountDeadline: string;
  paymentProviderName: string;
  paymentBaseUrl: string;
  paymentApiKeyEncrypted: string;
  paymentEnvironment: "sandbox" | "production";
  paymentEnabled: boolean;
}

export interface PropertyMutation {
  id: number;
  mutationNumber: string;
  mutationType: string; // 'land_transfer' | 'ownership_transfer' | 'subdivision' | 'consolidation' | 'reclassification' | 'assessment_revision' | 'cancellation' | 'new_discovery' | 'annotation' | 'correction' | 'taxpayer_info_change' | 'admin_change' | 'building_improvement' | 'machinery_update' | 'retirement'
  sourcePropertyId: number | null;
  targetPropertyId: number | null;
  taxpayerId: number | null;
  previousTaxpayerId: number | null;
  newTaxpayerId: number | null;
  previousTdn: string;
  newTdn: string;
  previousPin: string;
  newPin: string;
  effectivityDate: string;
  effectivityYear: number;
  status: "draft" | "for review" | "approved" | "clearance checked" | "final approved" | "posted";
  requestedBy: string;
  reviewedBy: string;
  approvedBy: string;
  postedBy: string;
  postedAt: string | null;
  remarks: string;
  metadata: string; // JSON string containing mutation extra spec fields
  createdAt: string;
  updatedAt: string;
}

export interface PropertyMutationItem {
  id: number;
  mutationId: number;
  sourcePropertyId: number | null;
  targetPropertyId: number | null;
  itemType: string;
  area: number;
  fairMarketValue: number;
  assessmentLevel: number;
  assessedValue: number;
  oldValue: string; // JSON snapshot
  newValue: string; // JSON snapshot
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyOwnershipHistory {
  id: number;
  propertyId: number;
  taxpayerId: number;
  ownerNameSnapshot: string;
  tdnSnapshot: string;
  pinSnapshot: string;
  ownershipStartDate: string;
  ownershipEndDate: string | null;
  acquisitionType: string;
  documentReference: string;
  mutationId: number | null;
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyStatusHistory {
  id: number;
  propertyId: number;
  previousStatus: string;
  newStatus: string;
  reason: string;
  mutationId: number | null;
  changedBy: string;
  changedAt: string;
  remarks: string;
}

