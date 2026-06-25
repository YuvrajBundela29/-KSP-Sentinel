"use client";

import { useEffect, lazy, Suspense } from "react";
import { useAppStore } from "@/lib/store";
import LoginView from "@/components/ksp/LoginView";
import Sidebar from "@/components/ksp/Sidebar";
import Header from "@/components/ksp/Header";
import DashboardHome from "@/components/ksp/DashboardHome";
import ChatView from "@/components/ksp/ChatView";
import NetworkGraph from "@/components/ksp/NetworkGraph";
import CrimeMap from "@/components/ksp/CrimeMap";
import AccusedProfile from "@/components/ksp/AccusedProfile";
import InvestigationTimeline from "@/components/ksp/InvestigationTimeline";
import ReportGenerator from "@/components/ksp/ReportGenerator";
import CommandPalette from "@/components/ksp/CommandPalette";
import LoadingSpinner from "@/components/ksp/LoadingSpinner";

// Lazy load DM components for code splitting
const DataManagementDashboard = lazy(() => import("@/components/ksp/dm/DataManagementDashboard"));
const FIRManagement = lazy(() => import("@/components/ksp/dm/FIRManagement"));
const EvidenceManagement = lazy(() => import("@/components/ksp/dm/EvidenceManagement"));
const CriminalsPage = lazy(() => import("@/components/ksp/dm/CriminalsPage"));
const VictimsPage = lazy(() => import("@/components/ksp/dm/VictimsPage"));
const VehiclesPage = lazy(() => import("@/components/ksp/dm/VehiclesPage"));
const FinancialRecords = lazy(() => import("@/components/ksp/dm/FinancialRecords"));
const ImportCenter = lazy(() => import("@/components/ksp/dm/ImportCenter"));
const AuditLogs = lazy(() => import("@/components/ksp/dm/AuditLogs"));
const AIProcessingQueue = lazy(() => import("@/components/ksp/dm/AIProcessingQueue"));
const SettingsPage = lazy(() => import("@/components/ksp/dm/SettingsPage"));

export default function Home() {
  const user = useAppStore((s) => s.user);
  const currentView = useAppStore((s) => s.currentView);

  // Restore auth from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ksp_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.username && parsed.role) {
            useAppStore.getState().login(parsed.username, parsed.role);
            useAppStore.getState().setView("dashboard");
          }
        } catch {
          // Invalid stored data
        }
      }
    }
  }, []);

  // Not logged in — show login
  if (!user) {
    return <LoginView />;
  }

  const renderContent = () => {
    switch (currentView) {
      case "dashboard":
        return <DashboardHome />;
      case "chat":
        return <ChatView />;
      case "network":
        return <NetworkGraph />;
      case "map":
        return <CrimeMap />;
      case "accused":
        return <AccusedProfile />;
      case "timeline":
        return <InvestigationTimeline />;
      case "report":
        return <ReportGenerator />;
      case "dm-dashboard":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <DataManagementDashboard />
          </Suspense>
        );
      case "dm-fir":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <FIRManagement />
          </Suspense>
        );
      case "dm-evidence":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <EvidenceManagement />
          </Suspense>
        );
      case "dm-criminals":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <CriminalsPage />
          </Suspense>
        );
      case "dm-victims":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <VictimsPage />
          </Suspense>
        );
      case "dm-vehicles":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <VehiclesPage />
          </Suspense>
        );
      case "dm-financial":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <FinancialRecords />
          </Suspense>
        );
      case "dm-import":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ImportCenter />
          </Suspense>
        );
      case "dm-audit":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AuditLogs />
          </Suspense>
        );
      case "dm-ai-queue":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AIProcessingQueue />
          </Suspense>
        );
      case "dm-settings":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <SettingsPage />
          </Suspense>
        );
      default:
        return <DashboardHome />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0f1e] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto relative">{renderContent()}</main>
      </div>
      <CommandPalette />
    </div>
  );
}