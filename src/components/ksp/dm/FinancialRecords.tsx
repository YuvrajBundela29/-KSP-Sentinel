"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Building2,
  IndianRupee,
  Landmark,
  TrendingUp,
  Eye,
  Network,
  Flag,
  FileDown,
  FileSpreadsheet,
  FileJson,
  Printer,
  X,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Filter,
  Clock,
  MapPin,
  Calendar,
  AlertTriangle,
  AlertCircle,
  Wallet,
  ArrowUpRight,
  CreditCard,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { loadCrimeData } from "@/lib/data";
import type { BankAccount, FIR, CrimeDataset, FinancialTransaction } from "@/lib/types";
import {
  exportToCSV,
  exportToJSON,
  exportToExcel,
  exportToPrint,
  formatNumber,
} from "@/lib/export-utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ──────────────────────────────────────────────────────────
type AccountStatus = "Suspicious" | "Under Review" | "Normal";
type SortField = "acc" | "bank" | "holder" | "linkedFirs" | "totalAmount" | "mode" | "status";
type SortDir = "asc" | "desc";

interface AccountWithMeta extends BankAccount {
  linkedFirs: FIR[];
  transactions: FinancialTransaction[];
  linkedFirCount: number;
  totalAmount: number;
  transactionMode: string;
  status: AccountStatus;
  suspiciousIndicators: string[];
}

// ─── INR Formatter ──────────────────────────────────────────────────
function formatINR(amount: number): string {
  return "₹" + new Intl.NumberFormat("en-IN").format(amount);
}

// ─── Animated Counter ───────────────────────────────────────────────
function useAnimatedCounter(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

// ─── Stat Card ──────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  color: string;
  delay: number;
  isCurrency?: boolean;
}

function StatCard({ icon, label, value, suffix = "", color, delay, isCurrency = false }: StatCardProps) {
  const animatedValue = useAnimatedCounter(value, 1400);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.08 }}
      whileHover={{ scale: 1.03, boxShadow: `0 0 30px ${color}20` }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-300"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `linear-gradient(135deg, ${color}08 0%, transparent 60%)` }}
      />
      <div className="relative flex items-start justify-between p-5">
        <div className="flex-1">
          <span className="text-[#5a657a] text-xs font-medium uppercase tracking-wider">
            {label}
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            {isCurrency && (
              <span className="text-[#f1f5f9] text-xl font-bold">₹</span>
            )}
            <span className="text-[#f1f5f9] text-3xl font-bold tabular-nums">
              {isCurrency ? formatNumber(animatedValue) : animatedValue.toLocaleString("en-IN")}
            </span>
            {suffix && <span className="text-[#5a657a] text-sm">{suffix}</span>}
          </div>
        </div>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function FinancialRecords() {
  const { addAuditLog, addNotification, setView } = useAppStore();
  const [data, setData] = useState<CrimeDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterBank, setFilterBank] = useState("all");
  const [filterAmountRange, setFilterAmountRange] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountWithMeta | null>(null);
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [sortField, setSortField] = useState<SortField>("totalAmount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load data
  useEffect(() => {
    loadCrimeData()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Derive account metadata
  const accountsWithMeta = useMemo<AccountWithMeta[]>(() => {
    if (!data) return [];
    return data.bank_accounts.map((acc) => {
      const linkedFirs = data.firs.filter(
        (f) => f.financial_transaction && f.financial_transaction.account === acc.acc
      );
      const transactions = linkedFirs
        .map((f) => f.financial_transaction)
        .filter((t): t is FinancialTransaction => t !== null);
      const totalAmount = transactions.reduce((sum, t) => sum + t.amount_inr, 0);
      const modes = [...new Set(transactions.map((t) => t.mode))];
      const transactionMode = modes.join(", ") || "N/A";

      // Determine suspicious indicators
      const indicators: string[] = [];
      if (linkedFirs.length > 1) indicators.push("Multiple FIRs linked");
      if (totalAmount > 500000) indicators.push("High transaction value");
      if (linkedFirs.length >= 3) indicators.push("Frequent criminal linkage");
      const maxSingleAmount = Math.max(0, ...transactions.map((t) => t.amount_inr));
      if (maxSingleAmount > 100000) indicators.push("High-value single transaction");

      // Determine status
      let status: AccountStatus = "Normal";
      if (indicators.length >= 3) status = "Suspicious";
      else if (indicators.length >= 1) status = "Under Review";

      return {
        ...acc,
        linkedFirs,
        transactions,
        linkedFirCount: linkedFirs.length,
        totalAmount,
        transactionMode,
        status,
        suspiciousIndicators: indicators,
      };
    });
  }, [data]);

  // Stats
  const stats = useMemo(() => {
    const totalAccounts = accountsWithMeta.length;
    const totalAmount = accountsWithMeta.reduce((sum, a) => sum + a.totalAmount, 0);
    const banksInvolved = new Set(accountsWithMeta.map((a) => a.bank)).size;
    const highValueTxns = accountsWithMeta.filter(
      (a) => a.transactions.some((t) => t.amount_inr > 100000)
    ).length;
    return { totalAccounts, totalAmount, banksInvolved, highValueTxns };
  }, [accountsWithMeta]);

  // Unique banks
  const banks = useMemo(() => [...new Set(accountsWithMeta.map((a) => a.bank))].sort(), [accountsWithMeta]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let result = accountsWithMeta;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (a) =>
          a.acc.toLowerCase().includes(q) ||
          a.bank.toLowerCase().includes(q) ||
          a.holder.toLowerCase().includes(q)
      );
    }
    if (filterBank !== "all") result = result.filter((a) => a.bank === filterBank);
    if (filterAmountRange !== "all") {
      result = result.filter((a) => {
        switch (filterAmountRange) {
          case "under-1l": return a.totalAmount < 100000;
          case "1l-5l": return a.totalAmount >= 100000 && a.totalAmount < 500000;
          case "5l-10l": return a.totalAmount >= 500000 && a.totalAmount < 1000000;
          case "10l-50l": return a.totalAmount >= 1000000 && a.totalAmount < 5000000;
          case "over-50l": return a.totalAmount >= 5000000;
          default: return true;
        }
      });
    }

    result = [...result].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortField) {
        case "acc": return dir * a.acc.localeCompare(b.acc);
        case "bank": return dir * a.bank.localeCompare(b.bank);
        case "holder": return dir * a.holder.localeCompare(b.holder);
        case "linkedFirs": return dir * (a.linkedFirCount - b.linkedFirCount);
        case "totalAmount": return dir * (a.totalAmount - b.totalAmount);
        case "mode": return dir * a.transactionMode.localeCompare(b.transactionMode);
        case "status": return dir * a.status.localeCompare(b.status);
        default: return 0;
      }
    });

    return result;
  }, [accountsWithMeta, debouncedSearch, filterBank, filterAmountRange, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterBank !== "all") count++;
    if (filterAmountRange !== "all") count++;
    return count;
  }, [filterBank, filterAmountRange]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3.5 w-3.5 text-[#3d4659]" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3.5 w-3.5 text-[#22d3ee]" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-[#22d3ee]" />
    );
  };

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  }, [sortField]);

  const clearFilters = useCallback(() => {
    setFilterBank("all");
    setFilterAmountRange("all");
    setSearchQuery("");
    setDebouncedSearch("");
    setPage(1);
  }, []);

  const handleFlagForInvestigation = useCallback(() => {
    if (!flagReason.trim() || !selectedAccount) return;
    addAuditLog({
      user: "Current User",
      role: "investigator",
      action: "Flagged account for investigation",
      entity: "BankAccount",
      entityId: selectedAccount.acc,
      oldValue: selectedAccount.status,
      newValue: "Flagged: " + flagReason.trim(),
      status: "success",
    });
    addNotification({
      title: "Account Flagged",
      message: `${selectedAccount.acc} (${selectedAccount.bank}) flagged for investigation`,
      type: "warning",
      read: false,
    });
    setFlagReason("");
    setShowFlagDialog(false);
  }, [flagReason, selectedAccount, addAuditLog, addNotification]);

  const handleAction = useCallback(
    (action: string, acc: AccountWithMeta) => {
      addAuditLog({
        user: "Current User",
        role: "investigator",
        action,
        entity: "BankAccount",
        entityId: acc.acc,
        oldValue: "",
        newValue: action,
        status: "success",
      });
      if (action === "View Linked FIRs") {
        setSelectedAccount(acc);
      } else if (action === "View on Network") {
        addNotification({
          title: "Network View",
          message: `Opening network graph for account ${acc.acc}`,
          type: "info",
          read: false,
        });
        setView("network");
      } else if (action === "Flag for Investigation") {
        setSelectedAccount(acc);
        setShowFlagDialog(true);
      }
    },
    [addAuditLog, addNotification, setView]
  );

  const statusColor = (s: AccountStatus) => {
    switch (s) {
      case "Suspicious": return "bg-[#f87171]/15 text-[#f87171] border-[rgba(248,113,113,0.15)]";
      case "Under Review": return "bg-[#fbbf24]/15 text-[#fbbf24] border-[rgba(251,191,36,0.15)]";
      case "Normal": return "bg-[#34d399]/15 text-[#34d399] border-[rgba(52,211,153,0.15)]";
    }
  };

  const getExportData = useCallback(() =>
    filtered.map((a) => ({
      account_number: a.acc,
      bank: a.bank,
      holder: a.holder,
      linked_firs: a.linkedFirCount,
      total_amount_inr: a.totalAmount,
      transaction_mode: a.transactionMode,
      status: a.status,
    })),
  [filtered]);

  // ── Render: Loading ──
  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // ── Render: Main ──
  return (
    <div className="space-y-5 p-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[#f1f5f9] text-2xl font-bold tracking-tight">
            Financial Records
          </h1>
          <p className="text-[#5a657a] text-sm mt-1">
            Monitor bank accounts linked to criminal investigations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-[#f1f5f9] rounded-xl">
                <FileDown className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[rgba(15,21,36,0.45)] border-white/10 text-[#f1f5f9]">
              <DropdownMenuItem onClick={() => exportToCSV(getExportData(), "financial_records_export")}>
                <FileDown className="mr-2 h-4 w-4" /> Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToExcel(getExportData(), "financial_records_export")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToJSON(getExportData(), "financial_records_export")}>
                <FileJson className="mr-2 h-4 w-4" /> Export JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={() => exportToPrint("financial-table")}>
                <Printer className="mr-2 h-4 w-4" /> Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Building2 className="h-5 w-5" />}
          label="Total Accounts"
          value={stats.totalAccounts}
          color="#22d3ee"
          delay={0}
        />
        <StatCard
          icon={<IndianRupee className="h-5 w-5" />}
          label="Total Amount"
          value={stats.totalAmount}
          color="#34d399"
          delay={1}
          isCurrency
          suffix="INR"
        />
        <StatCard
          icon={<Landmark className="h-5 w-5" />}
          label="Banks Involved"
          value={stats.banksInvolved}
          color="#818cf8"
          delay={2}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="High-Value Transactions"
          value={stats.highValueTxns}
          color="#fbbf24"
          delay={3}
          suffix="(&gt;₹1L)"
        />
      </div>

      {/* ── Search + Filter Controls ── */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3d4659]" />
            <Input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search by account number, bank, or holder name..."
              className="pl-10 bg-white/5 border-white/10 text-[#f1f5f9] placeholder:text-[#3d4659] h-10 rounded-xl focus-visible:border-cyan-500/50 focus-visible:ring-cyan-500/20"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={`gap-2 border-white/10 rounded-xl h-10 ${
              showFilters || activeFilterCount > 0
                ? "bg-[#22d3ee]/10 border-[rgba(34,211,238,0.15)] text-[#22d3ee]"
                : "bg-white/5 text-[#8b97b0] hover:bg-white/10"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#22d3ee] text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
                <div className="space-y-1.5">
                  <label className="text-[#5a657a] text-xs font-medium uppercase tracking-wider">
                    Bank
                  </label>
                  <Select value={filterBank} onValueChange={(v) => { setFilterBank(v); setPage(1); }}>
                    <SelectTrigger className="w-[200px] bg-white/5 border-white/10 text-[#f1f5f9] h-9 rounded-xl">
                      <SelectValue placeholder="All Banks" />
                    </SelectTrigger>
                    <SelectContent className="bg-[rgba(15,21,36,0.45)] border-white/10 text-[#f1f5f9]">
                      <SelectItem value="all">All Banks</SelectItem>
                      {banks.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[#5a657a] text-xs font-medium uppercase tracking-wider">
                    Amount Range
                  </label>
                  <Select value={filterAmountRange} onValueChange={(v) => { setFilterAmountRange(v); setPage(1); }}>
                    <SelectTrigger className="w-[200px] bg-white/5 border-white/10 text-[#f1f5f9] h-9 rounded-xl">
                      <SelectValue placeholder="All Ranges" />
                    </SelectTrigger>
                    <SelectContent className="bg-[rgba(15,21,36,0.45)] border-white/10 text-[#f1f5f9]">
                      <SelectItem value="all">All Ranges</SelectItem>
                      <SelectItem value="under-1l">Under ₹1,00,000</SelectItem>
                      <SelectItem value="1l-5l">₹1,00,000 – ₹5,00,000</SelectItem>
                      <SelectItem value="5l-10l">₹5,00,000 – ₹10,00,000</SelectItem>
                      <SelectItem value="10l-50l">₹10,00,000 – ₹50,00,000</SelectItem>
                      <SelectItem value="over-50l">Over ₹50,00,000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="text-[#8b97b0] hover:text-[#f1f5f9] hover:bg-white/10 h-9 text-xs"
                >
                  Clear All
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Results Info ── */}
      <div className="flex items-center justify-between">
        <p className="text-[#5a657a] text-sm">
          Showing <span className="text-[#f1f5f9] font-medium">{paged.length}</span> of{" "}
          <span className="text-[#f1f5f9] font-medium">{filtered.length}</span> accounts
        </p>
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl py-20"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
            <Wallet className="h-8 w-8 text-[#3d4659]" />
          </div>
          <div className="text-center">
            <p className="text-[#f1f5f9] font-medium">No accounts found</p>
            <p className="text-[#5a657a] text-sm mt-1">
              Try adjusting your search or filters
            </p>
          </div>
          {activeFilterCount > 0 && (
            <Button variant="ghost" onClick={clearFilters} className="text-[#22d3ee] hover:text-cyan-300 hover:bg-[#22d3ee]/10">
              Clear Filters
            </Button>
          )}
        </motion.div>
      ) : (
        <div id="financial-table">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden"
          >
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-[#5a657a] font-semibold text-xs uppercase tracking-wider">
                      <button onClick={() => handleSort("acc")} className="flex items-center gap-1 hover:text-[#f1f5f9] transition-colors">
                        Account Number <SortIcon field="acc" />
                      </button>
                    </TableHead>
                    <TableHead className="text-[#5a657a] font-semibold text-xs uppercase tracking-wider">
                      <button onClick={() => handleSort("bank")} className="flex items-center gap-1 hover:text-[#f1f5f9] transition-colors">
                        Bank <SortIcon field="bank" />
                      </button>
                    </TableHead>
                    <TableHead className="text-[#5a657a] font-semibold text-xs uppercase tracking-wider">
                      <button onClick={() => handleSort("holder")} className="flex items-center gap-1 hover:text-[#f1f5f9] transition-colors">
                        Account Holder <SortIcon field="holder" />
                      </button>
                    </TableHead>
                    <TableHead className="text-[#5a657a] font-semibold text-xs uppercase tracking-wider">
                      <button onClick={() => handleSort("linkedFirs")} className="flex items-center gap-1 hover:text-[#f1f5f9] transition-colors">
                        Linked FIRs <SortIcon field="linkedFirs" />
                      </button>
                    </TableHead>
                    <TableHead className="text-[#5a657a] font-semibold text-xs uppercase tracking-wider">
                      <button onClick={() => handleSort("totalAmount")} className="flex items-center gap-1 hover:text-[#f1f5f9] transition-colors">
                        Total Amount (INR) <SortIcon field="totalAmount" />
                      </button>
                    </TableHead>
                    <TableHead className="text-[#5a657a] font-semibold text-xs uppercase tracking-wider">
                      <button onClick={() => handleSort("mode")} className="flex items-center gap-1 hover:text-[#f1f5f9] transition-colors">
                        Transaction Mode <SortIcon field="mode" />
                      </button>
                    </TableHead>
                    <TableHead className="text-[#5a657a] font-semibold text-xs uppercase tracking-wider">
                      <button onClick={() => handleSort("status")} className="flex items-center gap-1 hover:text-[#f1f5f9] transition-colors">
                        Status <SortIcon field="status" />
                      </button>
                    </TableHead>
                    <TableHead className="text-[#5a657a] font-semibold text-xs uppercase tracking-wider text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((acc, idx) => (
                    <motion.tr
                      key={acc.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className={`border-white/5 hover:bg-white/5 cursor-pointer transition-colors group ${
                        acc.status === "Suspicious" ? "bg-[#f87171]/3" : ""
                      }`}
                      onClick={() => setSelectedAccount(acc)}
                    >
                      <TableCell className="text-[#f1f5f9] font-mono text-sm font-medium">
                        {acc.acc}
                      </TableCell>
                      <TableCell className="text-[#8b97b0] text-sm">{acc.bank}</TableCell>
                      <TableCell className="text-[#8b97b0] text-sm">{acc.holder}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${
                            acc.linkedFirCount > 1 ? "text-[#f87171]" : acc.linkedFirCount === 1 ? "text-[#fbbf24]" : "text-[#3d4659]"
                          }`}>
                            {acc.linkedFirCount}
                          </span>
                          {acc.linkedFirCount > 1 && (
                            <Badge className="bg-[#f87171]/15 text-[#f87171] border-[rgba(248,113,113,0.15)] text-[10px]">
                              {acc.linkedFirCount} FIRs
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className={`font-semibold ${
                          acc.totalAmount > 500000 ? "text-[#f87171]" : acc.totalAmount > 100000 ? "text-[#fbbf24]" : "text-[#f1f5f9]"
                        }`}>
                          {formatINR(acc.totalAmount)}
                        </span>
                        {acc.totalAmount > 100000 && (
                          <Badge className={`ml-2 text-[10px] ${
                            acc.totalAmount > 500000
                              ? "bg-[#f87171]/15 text-[#f87171] border-[rgba(248,113,113,0.15)]"
                              : "bg-[#fbbf24]/15 text-[#fbbf24] border-[rgba(251,191,36,0.15)]"
                          }`}>
                            <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" />
                            High Value
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-[#8b97b0] text-sm">
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="h-3.5 w-3.5 text-[#5a657a]" />
                          {acc.transactionMode}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-[10px] border ${statusColor(acc.status)}`}>
                            {acc.status}
                          </Badge>
                          {acc.suspiciousIndicators.length >= 3 && (
                            <AlertCircle className="h-4 w-4 text-[#f87171] animate-pulse" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); handleAction("View Linked FIRs", acc); }}
                            className="h-7 w-7 p-0 text-[#8b97b0] hover:text-[#22d3ee] hover:bg-[#22d3ee]/10"
                            title="View Linked FIRs"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); handleAction("View on Network", acc); }}
                            className="h-7 w-7 p-0 text-[#8b97b0] hover:text-[#34d399] hover:bg-[#34d399]/10"
                            title="View on Network"
                          >
                            <Network className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); handleAction("Flag for Investigation", acc); }}
                            className="h-7 w-7 p-0 text-[#8b97b0] hover:text-[#f87171] hover:bg-[#f87171]/10"
                            title="Flag for Investigation"
                          >
                            <Flag className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </motion.div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-[#5a657a] text-sm">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="border-white/10 bg-white/5 text-[#8b97b0] hover:bg-white/10 rounded-lg h-8"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="border-white/10 bg-white/5 text-[#8b97b0] hover:bg-white/10 rounded-lg h-8"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Detail Panel (Side Sheet) ── */}
      <AnimatePresence>
        {selectedAccount && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className="fixed right-0 top-0 bottom-0 z-40 w-[480px] border-l border-white/10 bg-[rgba(15,21,36,0.95)] backdrop-blur-xl "
          >
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-[#f1f5f9] text-lg font-bold font-mono">{selectedAccount.acc}</h2>
                    <p className="text-[#5a657a] text-sm mt-0.5">
                      {selectedAccount.bank} · {selectedAccount.holder}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedAccount(null)}
                    className="h-8 w-8 p-0 text-[#5a657a] hover:text-[#f1f5f9] hover:bg-white/10 rounded-lg"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Status & Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={`text-xs border ${statusColor(selectedAccount.status)}`}>
                    {selectedAccount.status}
                  </Badge>
                  {selectedAccount.suspiciousIndicators.map((ind) => (
                    <Badge
                      key={ind}
                      className={`text-xs border ${
                        ind.includes("Multiple") || ind.includes("Frequent") || ind.includes("High transaction")
                          ? "bg-[#f87171]/15 text-[#f87171] border-[rgba(248,113,113,0.15)]"
                          : "bg-[#fbbf24]/15 text-[#fbbf24] border-[rgba(251,191,36,0.15)]"
                      }`}
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {ind}
                    </Badge>
                  ))}
                </div>

                {/* Account Details */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                  <h3 className="text-[#f1f5f9] text-sm font-semibold">Account Details</h3>
                  {[
                    { label: "Account Number", value: selectedAccount.acc },
                    { label: "Bank", value: selectedAccount.bank },
                    { label: "Account Holder", value: selectedAccount.holder },
                    { label: "ID", value: selectedAccount.id },
                    { label: "Total Amount", value: formatINR(selectedAccount.totalAmount) },
                    { label: "Transaction Mode", value: selectedAccount.transactionMode },
                    { label: "Linked FIRs", value: String(selectedAccount.linkedFirCount) },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between">
                      <span className="text-[#5a657a] text-sm">{item.label}</span>
                      <span className={`text-sm font-medium ${
                        item.label === "Total Amount" && selectedAccount.totalAmount > 100000
                          ? "text-[#fbbf24]"
                          : "text-[#f1f5f9]"
                      }`}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => handleAction("View Linked FIRs", selectedAccount)}
                    className="gap-2 bg-[#22d3ee] hover:bg-cyan-700 text-white border-0 rounded-xl text-sm flex-1"
                  >
                    <Eye className="h-4 w-4" /> View Linked FIRs
                  </Button>
                  <Button
                    onClick={() => handleAction("View on Network", selectedAccount)}
                    className="gap-2 bg-white/5 hover:bg-white/10 text-[#f1f5f9] border border-white/10 rounded-xl text-sm flex-1"
                  >
                    <Network className="h-4 w-4" /> View on Network
                  </Button>
                  <Button
                    onClick={() => setShowFlagDialog(true)}
                    className="gap-2 bg-[#f87171]/20 hover:bg-[#f87171]/30 text-[#f87171] border border-[rgba(248,113,113,0.15)] rounded-xl text-sm flex-1"
                  >
                    <Flag className="h-4 w-4" /> Flag for Investigation
                  </Button>
                </div>

                {/* Linked FIRs with amounts */}
                {selectedAccount.linkedFirs.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-[#f1f5f9] text-sm font-semibold flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-[#34d399]" />
                      Linked FIRs with Transactions ({selectedAccount.linkedFirs.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedAccount.linkedFirs
                        .sort((a, b) => {
                          const amtA = a.financial_transaction?.amount_inr ?? 0;
                          const amtB = b.financial_transaction?.amount_inr ?? 0;
                          return amtB - amtA;
                        })
                        .map((fir) => (
                          <div
                            key={fir.fir_id}
                            className="rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/8 transition-colors cursor-pointer"
                            onClick={() => {
                              useAppStore.getState().setSelectedFirId(fir.fir_id);
                              setSelectedAccount(null);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[#f1f5f9] text-sm font-mono font-medium">
                                {fir.fir_id}
                              </span>
                              <Badge className="text-[10px] bg-[#34d399]/15 text-[#34d399] border-[rgba(52,211,153,0.15)]">
                                {formatINR(fir.financial_transaction?.amount_inr ?? 0)}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between mt-1.5">
                              <Badge className="text-[10px] bg-[#22d3ee]/15 text-[#22d3ee] border-[rgba(34,211,238,0.15)]">
                                {fir.crime_type}
                              </Badge>
                              <span className="text-[#8b97b0] text-xs flex items-center gap-1">
                                <CreditCard className="h-3 w-3" />
                                {fir.financial_transaction?.mode}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-[#8b97b0] text-xs flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(fir.date).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                              <span className="text-[#8b97b0] text-xs flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {fir.district}
                              </span>
                            </div>
                            {fir.financial_transaction?.note && (
                              <p className="text-[#5a657a] text-xs mt-1.5 italic">
                                &quot;{fir.financial_transaction.note}&quot;
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Transaction Timeline */}
                {selectedAccount.linkedFirs.length > 1 && (
                  <div className="space-y-3">
                    <h3 className="text-[#f1f5f9] text-sm font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#fbbf24]" />
                      Transaction Timeline
                    </h3>
                    <div className="relative pl-6 space-y-4">
                      <div className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-emerald-500/50 via-amber-500/50 to-red-500/50" />
                      {selectedAccount.linkedFirs
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map((fir, i, arr) => {
                          const amt = fir.financial_transaction?.amount_inr ?? 0;
                          const isHighValue = amt > 100000;
                          return (
                            <div key={fir.fir_id} className="relative">
                              <div
                                className="absolute -left-[18px] top-1.5 h-3 w-3 rounded-full border-2"
                                style={{
                                  borderColor: isHighValue ? "#f87171" : "#34d399",
                                  backgroundColor: isHighValue ? "#f87171" : "#34d399",
                                }}
                              />
                              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[#f1f5f9] text-sm font-medium">
                                    {fir.crime_type}
                                  </span>
                                  <span className={`text-sm font-semibold ${isHighValue ? "text-[#f87171]" : "text-[#34d399]"}`}>
                                    {formatINR(amt)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-[#5a657a] text-xs">
                                    {new Date(fir.date).toLocaleDateString("en-IN")}
                                  </span>
                                  <span className="text-[#5a657a] text-xs">
                                    {fir.financial_transaction?.mode}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Backdrop for detail panel ── */}
      <AnimatePresence>
        {selectedAccount && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedAccount(null)}
            className="fixed inset-0 z-30 bg-black/40"
          />
        )}
      </AnimatePresence>

      {/* ── Flag Dialog ── */}
      <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
        <DialogContent className="bg-[rgba(15,21,36,0.45)] border-white/10 text-[#f1f5f9] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-[#f87171]" />
              Flag for Investigation
            </DialogTitle>
            <DialogDescription className="text-[#5a657a]">
              Account: <span className="font-mono text-[#f1f5f9]">{selectedAccount?.acc}</span> — {selectedAccount?.bank}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            placeholder="Enter reason for flagging this account..."
            rows={4}
            className="bg-white/5 border-white/10 text-[#f1f5f9] placeholder:text-[#3d4659] focus-visible:border-red-500/50 focus-visible:ring-[rgba(248,113,113,0.2)] rounded-xl"
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => { setShowFlagDialog(false); setFlagReason(""); }}
              className="text-[#8b97b0] hover:text-[#f1f5f9] hover:bg-white/10 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleFlagForInvestigation}
              disabled={!flagReason.trim()}
              className="bg-[#f87171] hover:bg-red-700 text-white border-0 rounded-xl"
            >
              <Flag className="h-4 w-4 mr-2" />
              Flag Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}