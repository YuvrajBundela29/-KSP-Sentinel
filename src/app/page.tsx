"use client";

import { useEffect } from "react";
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

  // Logged in — show dashboard layout
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