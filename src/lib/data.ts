// KSP Sentinel AI — Data loading and query functions

import { CrimeDataset, FIR, Accused, NetworkEdge } from "./types";

export async function loadCrimeData(): Promise<CrimeDataset> {
  const res = await fetch("/data/ksp_crime_dataset.json");
  if (!res.ok) throw new Error("Failed to load crime dataset");
  return res.json();
}

export function searchFIRs(data: CrimeDataset, query: Partial<FIR>): FIR[] {
  return data.firs.filter((fir) => {
    return Object.keys(query).every((key) => {
      const firVal = fir[key as keyof FIR];
      const queryVal = query[key as keyof FIR];
      if (queryVal === undefined || queryVal === null) return true;
      if (typeof queryVal === "string") {
        return String(firVal).toLowerCase().includes(queryVal.toLowerCase());
      }
      return firVal === queryVal;
    });
  });
}

export function getAccusedById(data: CrimeDataset, id: string): Accused | undefined {
  return data.accused.find((a) => a.id === id);
}

export function getFIRsByAccused(data: CrimeDataset, accusedId: string): FIR[] {
  return data.firs.filter((fir) => fir.accused.includes(accusedId));
}

export function getFIRsByGang(data: CrimeDataset, gangId: string): FIR[] {
  return data.firs.filter((fir) => fir.gang_id === gangId);
}

export function getNetworkEdges(data: CrimeDataset): NetworkEdge[] {
  const edges: NetworkEdge[] = [];
  const gangAssociatePairs = new Set<string>();

  // accused → fir (involved_in)
  for (const fir of data.firs) {
    for (const accusedId of fir.accused) {
      edges.push({ source: accusedId, target: fir.fir_id, type: "involved_in" });
    }
  }

  // accused → gang (member_of)
  for (const accused of data.accused) {
    if (accused.gang) {
      edges.push({ source: accused.id, target: accused.gang, type: "member_of" });
    }
  }

  // fir → district (occurred_in)
  for (const fir of data.firs) {
    edges.push({ source: fir.fir_id, target: fir.district, type: "occurred_in" });
  }

  // fir → vehicle (used_vehicle)
  for (const fir of data.firs) {
    if (fir.vehicle_used) {
      edges.push({ source: fir.fir_id, target: fir.vehicle_used, type: "used_vehicle" });
    }
  }

  // accused → accused when same gang (gang_associate)
  for (const gang of data.gangs) {
    for (let i = 0; i < gang.members.length; i++) {
      for (let j = i + 1; j < gang.members.length; j++) {
        const pairKey = [gang.members[i], gang.members[j]].sort().join("-");
        if (!gangAssociatePairs.has(pairKey)) {
          gangAssociatePairs.add(pairKey);
          edges.push({
            source: gang.members[i],
            target: gang.members[j],
            type: "gang_associate",
          });
        }
      }
    }
  }

  return edges;
}