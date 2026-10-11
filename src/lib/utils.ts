import type { Step, StepStatus, StepPriority } from "@/types";

export function getProgress(steps: Step[]): number {
  if (steps.length === 0) return 0;
  const completed = steps.filter((s) => s.status === "completed").length;
  return Math.round((completed / steps.length) * 100);
}

export function getNextStep(steps: Step[]): Step | null {
  const sorted = [...steps].sort((a, b) => a.order_index - b.order_index);
  const inProgress = sorted.find((s) => s.status === "in_progress");
  if (inProgress) return inProgress;
  const blocked = sorted.find((s) => s.status === "blocked");
  if (blocked) return blocked;
  const pending = sorted.find((s) => s.status === "pending");
  if (pending) return pending;
  return null;
}

export function getStatusCounts(steps: Step[]) {
  return {
    completed: steps.filter((s) => s.status === "completed").length,
    pending: steps.filter((s) => s.status === "pending").length,
    inProgress: steps.filter((s) => s.status === "in_progress").length,
    blocked: steps.filter((s) => s.status === "blocked").length,
    total: steps.length,
  };
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Not set";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(dateStr);
}

export const STATUS_COLORS: Record<StepStatus, { bg: string; text: string; dot: string; border: string }> = {
  pending: {
    bg: "bg-slate-700/40",
    text: "text-slate-300",
    dot: "bg-slate-400",
    border: "border-slate-600",
  },
  in_progress: {
    bg: "bg-blue-500/15",
    text: "text-blue-300",
    dot: "bg-blue-400",
    border: "border-blue-500/40",
  },
  completed: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-300",
    dot: "bg-emerald-400",
    border: "border-emerald-500/40",
  },
  blocked: {
    bg: "bg-red-500/15",
    text: "text-red-300",
    dot: "bg-red-400",
    border: "border-red-500/40",
  },
};

export const PRIORITY_COLORS: Record<StepPriority, { bg: string; text: string }> = {
  low: { bg: "bg-slate-600/30", text: "text-slate-400" },
  medium: { bg: "bg-amber-500/15", text: "text-amber-300" },
  high: { bg: "bg-orange-500/15", text: "text-orange-300" },
  critical: { bg: "bg-red-500/20", text: "text-red-300" },
};

export const STATUS_LABELS: Record<StepStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  blocked: "Blocked",
};

export const PRIORITY_LABELS: Record<StepPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
