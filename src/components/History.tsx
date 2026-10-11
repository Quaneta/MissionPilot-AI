import { useState } from "react";
import { History as HistoryIcon, CheckCircle2, ArrowLeft, ArrowRight, Target, Clock } from "lucide-react";
import type { Mission, Step } from "@/types";
import { getProgress, getStatusCounts, formatDate } from "@/lib/utils";
import { ProgressBar } from "./ProgressBar";

interface HistoryProps {
  missions: Mission[];
  stepsByMission: Record<string, Step[]>;
  onBack: () => void;
  onOpenMission: (mission: Mission) => void;
  loading: boolean;
}

export function History({ missions, stepsByMission, onBack, onOpenMission, loading }: HistoryProps) {
  const [filter, setFilter] = useState<"all" | "completed" | "active" | "archived">("all");

  const filtered = missions.filter((m) => {
    if (filter === "all") return true;
    return m.status === filter;
  });

  const filters: { id: typeof filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: missions.length },
    { id: "completed", label: "Completed", count: missions.filter((m) => m.status === "completed").length },
    { id: "active", label: "Active", count: missions.filter((m) => m.status === "active").length },
    { id: "archived", label: "Archived", count: missions.filter((m) => m.status === "archived").length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 border border-slate-700">
            <HistoryIcon className="w-5 h-5 text-slate-300" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Mission History</h2>
            <p className="text-sm text-slate-400">All your missions in one place</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f.id
                ? "bg-slate-700 text-white"
                : "bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-slate-500">{f.count}</span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-800/40 border border-slate-700/50 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed border-slate-700/50">
          <HistoryIcon className="w-10 h-10 text-slate-600 mb-3" />
          <p className="text-sm text-slate-400">No missions found in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((mission) => {
            const steps = stepsByMission[mission.id] || [];
            const progress = getProgress(steps);
            const counts = getStatusCounts(steps);
            return (
              <button
                key={mission.id}
                onClick={() => onOpenMission(mission)}
                className="group w-full text-left rounded-xl bg-slate-800/40 border border-slate-700/50 p-5 hover:border-blue-500/40 hover:bg-slate-800/60 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${
                      mission.status === "completed"
                        ? "bg-emerald-500/10"
                        : mission.status === "archived"
                        ? "bg-slate-700/30"
                        : "bg-blue-500/10"
                    }`}
                  >
                    {mission.status === "completed" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Target className={`w-5 h-5 ${mission.status === "archived" ? "text-slate-500" : "text-blue-400"}`} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-white text-sm group-hover:text-blue-300 transition-colors line-clamp-1">
                      {mission.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{mission.goal}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex-1 max-w-xs">
                        <ProgressBar value={progress} size="sm" />
                      </div>
                      <span className="text-xs text-slate-400">
                        {counts.completed}/{counts.total} steps
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        {formatDate(mission.completed_at || mission.created_at)}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
