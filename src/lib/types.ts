// KSP Sentinel AI — TypeScript Data Types

export interface Location {
  lat: number;
  lng: number;
  place: string;
}

export interface Victim {
  name: string;
  age: number | null;
  gender: string | null;
  occupation: string;
}

export interface FinancialTransaction {
  account: string;
  amount_inr: number;
  mode: string;
  note: string;
}

export interface FIR {
  fir_id: string;
  date: string;
  time: string;
  crime_type: string;
  ipc_section: string;
  severity: "critical" | "high" | "medium" | "low";
  district: string;
  location: Location;
  accused: string[];
  victim: Victim;
  vehicle_used: string | null;
  modus_operandi: string;
  items_stolen: string[];
  gang_id: string | null;
  investigation_status: string;
  officer_id: string;
  police_station: string;
  witnesses: string[];
  financial_transaction: FinancialTransaction | null;
  socio_tags: string[];
}

export interface Accused {
  id: string;
  name: string;
  age: number;
  gender: string;
  gang: string | null;
  risk: number;
  prior_firs: number;
}

export interface Gang {
  id: string;
  name: string;
  type: string;
  base: string;
  members: string[];
}

export interface Vehicle {
  id: string;
  reg: string;
  type: string;
  make: string;
  color: string;
}

export interface BankAccount {
  id: string;
  acc: string;
  bank: string;
  holder: string;
}

export interface District {
  name: string;
  lat: number;
  lng: number;
}

export interface CrimeDataset {
  firs: FIR[];
  accused: Accused[];
  gangs: Gang[];
  vehicles: Vehicle[];
  bank_accounts: BankAccount[];
  districts: District[];
}

export interface NetworkEdge {
  source: string;
  target: string;
  type: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  explainable?: ExplainableResponse;
}

export type ViewType =
  | "login"
  | "dashboard"
  | "chat"
  | "network"
  | "map"
  | "accused"
  | "timeline"
  | "report"
  | "dm-dashboard"
  | "dm-fir"
  | "dm-evidence"
  | "dm-criminals"
  | "dm-victims"
  | "dm-vehicles"
  | "dm-financial"
  | "dm-import"
  | "dm-audit"
  | "dm-ai-queue"
  | "dm-settings";

// ─── Intelligence Types ───────────────────────────────────────────

export interface InvestigationBrief {
  executiveSummary: string;
  relatedCases: { firId: string; crimeType: string; date: string; status: string; relevance: string }[];
  likelyAssociates: { name: string; id: string; connection: string; strength: "strong" | "moderate" | "weak" }[];
  financialLinks: { bank: string; account: string; holder: string; totalAmount: number; transactions: number; details: string }[];
  behavioralAnalysis: { pattern: string; description: string; frequency: string }[];
  missingEvidence: { type: string; description: string; priority: "high" | "medium" | "low" }[];
  suggestedActions: { action: string; rationale: string; priority: "immediate" | "short_term" | "long_term" }[];
  confidenceScore: number;
}

export interface SimilarCrimeResult {
  fir: FIR;
  similarityScore: number;
  matchedFactors: { factor: string; weight: number; matched: boolean; detail: string }[];
  explanation: string;
}

export interface TimelineEvent {
  id: string;
  type: "complaint" | "witness" | "cctv" | "phone" | "vehicle" | "financial" | "investigation" | "arrest" | "fir_filed";
  title: string;
  description: string;
  timestamp: string;
  firId?: string;
  icon: string;
  status: "completed" | "in_progress" | "pending" | "unknown";
}

export interface ExplainableResponse {
  content: string;
  evidenceChain: { firId: string; relevance: string }[];
  confidenceScore: number;
  reasoningSummary: string;
  alternativeExplanations?: string[];
}

export interface IntelFeedItem {
  id: string;
  type: "alert" | "update" | "arrest" | "pattern" | "intelligence";
  title: string;
  description: string;
  timestamp: string;
  severity: "critical" | "high" | "medium" | "low";
  relatedFirs?: string[];
}

export interface InvestigationQueueItem {
  firId: string;
  crimeType: string;
  district: string;
  priority: number;
  status: string;
  daysOpen: number;
  reason: string;
}

export interface AuthUser {
  username: string;
  role: string;
  permissions?: RolePermission[];
}

// ─── Data Management Types ──────────────────────────────────────

export type RoleName =
  | "super_admin"
  | "state_admin"
  | "district_admin"
  | "station_officer"
  | "investigator"
  | "analyst"
  | "auditor"
  | "demo_user";

export interface RolePermission {
  role: RoleName;
  label: string;
  can: Record<string, boolean>;
}

export interface EvidenceItem {
  id: string;
  firId: string;
  type: "photo" | "video" | "audio" | "pdf" | "cctv" | "document";
  filename: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  tags: string[];
  aiSummary: string;
  linkedAccused: string[];
  linkedVictim: string;
  linkedVehicle: string;
  status: "processing" | "ready" | "archived";
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue: string;
  newValue: string;
  ip: string;
  status: "success" | "failure" | "pending";
}

export interface ImportJob {
  id: string;
  filename: string;
  format: "csv" | "excel" | "json" | "parquet" | "zip";
  status: "queued" | "processing" | "completed" | "failed" | "rolled_back";
  totalRows: number;
  processedRows: number;
  errors: number;
  duplicates: number;
  startedAt: string;
  completedAt: string | null;
  startedBy: string;
  columnMapping: Record<string, string>;
}

export interface AIQueueItem {
  id: string;
  firId: string;
  stage: "queued" | "ocr" | "entity_extraction" | "relationship_detection" | "risk_scoring" | "network_update" | "embedding" | "completed" | "failed";
  progress: number;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
}

export interface DuplicateDetectionResult {
  field: string;
  value: string;
  existingFirId: string;
  similarity: number;
  suggestion: "merge" | "review" | "ignore";
  explanation: string;
}

export interface OCRExtractionResult {
  text: string;
  entities: {
    names: string[];
    addresses: string[];
    phones: string[];
    vehicles: string[];
    accounts: string[];
    ipcSections: string[];
    dates: string[];
    locations: string[];
    weapons: string[];
    evidence: string[];
    timeline: { event: string; date: string }[];
  };
  confidence: number;
}

export interface FIRWizardData {
  // Step 1: Incident
  crimeType: string;
  ipcSection: string;
  date: string;
  time: string;
  district: string;
  location: string;
  latitude: number;
  longitude: number;
  modusOperandi: string;
  itemsStolen: string[];
  severity: "critical" | "high" | "medium" | "low";
  socioTags: string[];
  policeStation: string;
  // Step 2: Victim
  victimName: string;
  victimAge: number;
  victimGender: string;
  victimOccupation: string;
  victimAddress: string;
  victimPhone: string;
  // Step 3: Accused
  accusedPersons: { name: string; age: number; gender: string; address: string }[];
  // Step 4: Witness
  witnesses: { name: string; phone: string; statement: string }[];
  // Step 5: Vehicle
  vehicleUsed: boolean;
  vehicleId: string;
  vehicleReg: string;
  vehicleType: string;
  vehicleMake: string;
  vehicleColor: string;
  // Step 6: Financial
  hasFinancial: boolean;
  bankAccount: string;
  bankName: string;
  amount: number;
  transactionMode: string;
  transactionNote: string;
  // Step 7: Evidence
  evidenceFiles: File[];
  evidenceDescription: string;
  // Step 8-10: Review, AI, Submit handled internally
}

export type EvidenceViewMode = "grid" | "card" | "table" | "timeline";