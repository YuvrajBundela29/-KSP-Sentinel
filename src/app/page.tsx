"use client";

import { useEffect, lazy, Suspense } from "react";
import { useAppStore } from "@/lib/store";
import LoadingSpinner from "@/components/ksp/LoadingSpinner";

// Lazy load all view components
const Sidebar = lazy(() => import("@/components/ksp/Sidebar"));
const Header = lazy(() => import("@/components/ksp/Header"));
const CommandPalette = lazy(() => import("@/components/ksp/CommandPalette"));
const WelcomeOnboarding = lazy(() => import("@/components/ksp/WelcomeOnboarding"));

// Lazy load all view components to isolate errors
const DashboardHome = lazy(() => import("@/components/ksp/DashboardHome"));
const ChatView = lazy(() => import("@/components/ksp/ChatView"));
const NetworkGraph = lazy(() => import("@/components/ksp/NetworkGraph"));
const CrimeMap = lazy(() => import("@/components/ksp/CrimeMap"));
const AccusedProfile = lazy(() => import("@/components/ksp/AccusedProfile"));
const InvestigationTimeline = lazy(() => import("@/components/ksp/InvestigationTimeline"));
const ReportGenerator = lazy(() => import("@/components/ksp/ReportGenerator"));

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
const SociologicalInsights = lazy(() => import("@/components/ksp/dm/SociologicalInsights"));
const CrimeForecasting = lazy(() => import("@/components/ksp/dm/CrimeForecasting"));
const FinancialNetworkView = lazy(() => import("@/components/ksp/dm/FinancialNetworkView"));

export default function Home() {
  const user = useAppStore((s) => s.user);
  const currentView = useAppStore((s) => s.currentView);

  // Auto-login — skip password panel
  useEffect(() => {
    if (!user) {
      useAppStore.getState().login("admin", "super_admin");
      useAppStore.getState().setView("dashboard");
    }
  }, [user]);

  // Apply theme class on mount
  useEffect(() => {
    const stored = localStorage.getItem("ksp_theme");
    const theme = stored === "light" ? "light" : "dark";
    document.documentElement.classList.add(theme);
  }, []);

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
      case "dm-sociological":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <SociologicalInsights />
          </Suspense>
        );
      case "dm-forecasting":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <CrimeForecasting />
          </Suspense>
        );
      case "dm-financial-network":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <FinancialNetworkView />
          </Suspense>
        );
      default:
        return <DashboardHome />;
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ backgroundColor: "var(--background)" }}>
      {/* Sidebar — fixed width, full height */}
      <Suspense fallback={<LoadingSpinner />}><Sidebar /></Suspense>

      {/* Main content area — takes remaining space */}
      <div className="flex flex-col flex-1 min-w-0 h-full relative">
        {/* Header — sticky top, no vertical overflow */}
        <Suspense fallback={<LoadingSpinner />}><Header /></Suspense>

        {/* Scrollable content area — only this scrolls */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <Suspense fallback={<LoadingSpinner />}>
            {renderContent()}
          </Suspense>
        </main>
      </div>

      {/* Command palette overlay */}
      <Suspense fallback={null}><CommandPalette /></Suspense>

      {/* Onboarding guide overlay */}
      <Suspense fallback={null}><WelcomeOnboarding /></Suspense>
    </div>
  );
}