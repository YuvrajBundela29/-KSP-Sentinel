"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Eye, EyeOff } from "lucide-react";

const USERS = [
  { username: "investigator", password: "ksp123", role: "Investigator" },
  { username: "analyst", password: "ksp123", role: "Analyst" },
  { username: "admin", password: "ksp123", role: "Admin" },
];

export default function LoginView() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const login = useAppStore((s) => s.login);

  const handleLogin = () => {
    const user = USERS.find(
      (u) => u.username === username && u.password === password
    );
    if (user) {
      login(user.username, user.role);
      setError("");
    } else {
      setError("Invalid credentials. Try investigator/ksp123");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1e] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Shield className="w-10 h-10 text-blue-500" />
          </div>
          <h1 className="text-4xl font-bold text-blue-500 tracking-wider">
            KSP SENTINEL AI
          </h1>
          <p className="text-[#94a3b8] mt-2 text-sm">
            Crime Intelligence Platform — Karnataka State Police
          </p>
          <Badge
            variant="outline"
            className="mt-3 border-yellow-500/50 text-yellow-400 text-xs"
          >
            DEMO MODE — Synthetic Data Only
          </Badge>
        </div>

        <Card className="bg-[#1a2035] border-[#2a3550]">
          <CardHeader className="pb-2">
            <h2 className="text-lg font-semibold text-center text-[#e2e8f0]">
              Sign In
            </h2>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm text-[#94a3b8]">Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="bg-[#0d1326] border-[#2a3550] text-[#e2e8f0] placeholder:text-[#4a5568]"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[#94a3b8]">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="bg-[#0d1326] border-[#2a3550] text-[#e2e8f0] placeholder:text-[#4a5568] pr-10"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a5568] hover:text-[#94a3b8]"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}
            <Button
              onClick={handleLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              Sign In
            </Button>
            <div className="text-center">
              <p className="text-xs text-[#4a5568] mt-3">
                Demo accounts: investigator / analyst / admin (password: ksp123)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}