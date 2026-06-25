"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Languages, Bell } from "lucide-react";

const VIEW_LABELS: Record<string, Record<string, string>> = {
  en: {
    dashboard: "Mission Control",
    chat: "AI Copilot",
    network: "Network Graph",
    map: "Crime Map",
    accused: "Accused Profile",
    timeline: "Investigation Timeline",
    report: "Report Generator",
  },
  kn: {
    dashboard: "ಮಿಷನ್ ಕಂಟ್ರೋಲ್",
    chat: "AI ಸಹಾಯಕ",
    network: "ನೆಟ್‌ವರ್ಕ್ ಗ್ರಾಫ್",
    map: "ಅಪರಾಧ ನಕ್ಷೆ",
    accused: "ಆರೋಪಿತ ಪ್ರೊಫೈಲ್",
    timeline: "ತನಿಖೆ ಟೈಮ್‌ಲೈನ್",
    report: "ವರದಿ ಜನರೇಟರ್",
  },
};

export default function Header() {
  const currentView = useAppStore((s) => s.currentView);
  const lang = useAppStore((s) => s.lang);
  const toggleLang = useAppStore((s) => s.toggleLang);
  const [clock, setClock] = useState("");

  useEffect(() => {
    const update = () => {
      setClock(
        new Date().toLocaleString("en-IN", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);

  const labels = VIEW_LABELS[lang];
  const viewTitle = labels[currentView] || currentView;

  return (
    <header className="h-14 bg-[#0d1326] border-b border-[#2a3550] flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold text-[#e2e8f0]">{viewTitle}</h1>
      <div className="flex items-center gap-3">
        <span className="text-xs text-[#94a3b8] hidden sm:block">{clock}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLang}
          className="text-[#94a3b8] hover:text-blue-400 hover:bg-blue-500/10"
        >
          <Languages className="w-4 h-4 mr-1" />
          {lang === "en" ? "ಕನ್ನಡ" : "English"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-[#94a3b8] hover:text-blue-400 hover:bg-blue-500/10 relative"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </Button>
      </div>
    </header>
  );
}