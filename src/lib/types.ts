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
}

export type ViewType = "login" | "dashboard" | "chat" | "network" | "map" | "accused";

export interface AuthUser {
  username: string;
  role: string;
}