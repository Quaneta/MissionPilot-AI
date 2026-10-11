import { Rocket, Target, CheckCircle2, AlertCircle, Plus, ArrowRight, Clock, TrendingUp } from "lucide-react";
import type { Mission, Step } from "@/types";
import { getProgress, getStatusCounts, formatDate, cn } from "@/lib/utils";
import { ProgressBar } from "./ProgressBar";

interface DashboardProps {
  missions: Mission[];
  stepsByMission: Record<string, Step[]>;
  onNewMission: () => void;
  onOpenMission: (mission: Mission) => void;
  onShowHistory: () => void;
  loading: boolean;
}

export function Dashboard({
  missions,
  stepsByMission,
  onNewMission,
  onOpenMission,
  onShowHistory,
  loading,
}: DashboardProps) {
  const activeMissions = missions.filter((m) => m.status === "active");
  const completedMissions = missions.filter((m) => m.status === "completed");

  const allSteps = Object.values(stepsByMission).flat();
  const statusCounts = getStatusCounts(allSteps);

  const totalProgress =
    missions.length > 0
      ? Math.round(
          missions.reduce((acc, m) => acc + getProgress(stepsByMission[m.id] || []), 0) /
            missions.length
        )
      : 0;

  const stats = [
    {
      label: "Active Missions",
      value: activeMissions.length,
      icon: Rocket,
      gradient: "from-blue-500 to-cyan-400",
      iconBg: "bg-blue-500/15",
      iconColor: "text-blue-400",
    },
    {
      label: "Completed",
      value: completedMissions.length,
      icon: CheckCircle2,
      gradient: "from-emerald-500 to-teal-400",
      iconBg: "bg-emerald-500/15",
      iconColor: "text-emerald-400",
    },
    {
      label: "Blocked Tasks",
      value: statusCounts.blocked,
      icon: AlertCircle,
      gradient: "from-red-500 to-orange-400",
      iconBg: "bg-red-500/15",
      iconColor: "text-red-400",
    },
    {
      label: "Overall Progress",
      value: `${totalProgress}%`,
      icon: TrendingUp,
      gradient: "from-violet-500 to-purple-400",
      iconBg: "bg-violet-500/15",
      iconColor: "text-violet-400",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Dashboard</h2>
          <p className="text-sm text-slate-400 mt-1">
            Track your missions and stay on course
          </p>
        </div>
        <button
          onClick={onNewMission}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] transition-all"
        >
          <Plus className="w-4 h-4" />
          New Mission
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="relative overflow-hidden rounded-2xl bg-slate-800/40 border border-slate-700/50 p-5 hover:border-slate-600/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn("flex items-center justify-center w-10 h-10 rounded-xl", stat.iconBg)}>
                  <Icon className={cn("w-5 h-5", stat.iconColor)} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Active Missions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Active Missions</h3>
          {activeMissions.length > 0 && (
            <span className="text-xs text-slate-400">{activeMissions.length} in progress</span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 rounded-2xl bg-slate-800/40 border border-slate-700/50 animate-pulse"
              />
            ))}
          </div>
        ) : activeMissions.length === 0 ? (
          <EmptyState onNewMission={onNewMission} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeMissions.map((mission) => {
              const steps = stepsByMission[mission.id] || [];
              const progress = getProgress(steps);
              const counts = getStatusCounts(steps);
              return (
                <button
                  key={mission.id}
                  onClick={() => onOpenMission(mission)}
                  className="group text-left rounded-2xl bg-slate-800/40 border border-slate-700/50 p-5 hover:border-blue-500/40 hover:bg-slate-800/60 transition-all"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 shrink-0">
                      <Target className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-white text-sm leading-snug line-clamp-2 group-hover:text-blue-300 transition-colors">
                        {mission.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDate(mission.created_at)}
                      </p>
                    </div>
                  </div>

                  <ProgressBar value={progress} size="sm" showLabel />

                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs text-slate-400">{counts.completed} done</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs text-slate-400">{counts.pending + counts.inProgress} left</span>
                    </div>
                    {counts.blocked > 0 && (
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-xs text-red-400">{counts.blocked} blocked</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end mt-3 pt-3 border-t border-slate-700/40">
                    <span className="flex items-center gap-1 text-xs font-medium text-blue-400 group-hover:gap-2 transition-all">
                      Open mission
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed Missions Preview */}
      {completedMissions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Recently Completed</h3>
            <button
              onClick={onShowHistory}
              className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {completedMissions.slice(0, 3).map((mission) => {
              const steps = stepsByMission[mission.id] || [];
              return (
                <button
                  key={mission.id}
                  onClick={() => onOpenMission(mission)}
                  className="group text-left rounded-2xl bg-slate-800/30 border border-slate-700/40 p-5 hover:border-emerald-500/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-slate-300 text-sm line-clamp-1">{mission.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {steps.filter((s) => s.status === "completed").length}/{steps.length} steps completed
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onNewMission }: { onNewMission: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border-2 border-dashed border-slate-700/50">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800/50 mb-5">
        <Rocket className="w-8 h-8 text-slate-500" />
      </div>
      <h4 className="text-lg font-semibold text-white mb-2">No active missions yet</h4>
      <p className="text-sm text-slate-400 text-center max-w-sm mb-6">
        Create your first mission and let MissionPilot AI break it down into clear, actionable steps.
      </p>
      <button
        onClick={onNewMission}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium text-sm shadow-lg shadow-blue-500/25 hover:scale-[1.02] transition-all"
      >
        <Plus className="w-4 h-4" />
        Create Your First Mission
      </button>
    </div>
  );
}
