import { Rocket, LayoutDashboard, Plus, History, CheckCircle2, AlertCircle, X, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export type View = "dashboard" | "new-mission" | "mission-detail" | "history";

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  activeMissions: number;
  completedMissions: number;
  blockedTasks: number;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({
  currentView,
  onNavigate,
  activeMissions,
  completedMissions,
  blockedTasks,
  open,
  onClose,
}: SidebarProps) {
  const navItems: {
    id: View;
    label: string;
    icon: typeof LayoutDashboard;
    badge?: { count: number; color: string };
  }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "new-mission", label: "New Mission", icon: Plus },
    {
      id: "mission-detail",
      label: "Active Missions",
      icon: Circle,
      badge: { count: activeMissions, color: "bg-blue-500" },
    },
    {
      id: "history",
      label: "History",
      icon: History,
      badge: { count: completedMissions, color: "bg-emerald-500" },
    },
  ];

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 h-screen w-72 bg-slate-900 border-r border-slate-800 z-50 flex flex-col transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-800">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/20">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">MissionPilot</h1>
            <p className="text-xs text-slate-400 font-medium">AI Task Agent</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Mission Button */}
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => onNavigate("new-mission")}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all",
              currentView === "new-mission"
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
            )}
          >
            <Plus className="w-4 h-4" />
            Create New Mission
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Navigation
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                  )}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && item.badge.count > 0 && (
                  <span
                    className={cn(
                      "flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold text-white",
                      item.badge.color
                    )}
                  >
                    {item.badge.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Stats Summary */}
        <div className="px-4 py-4 border-t border-slate-800 space-y-3">
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Overview
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/40">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-xs text-slate-400 flex-1">Active</span>
              <span className="text-xs font-semibold text-white">{activeMissions}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/40">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs text-slate-400 flex-1">Completed</span>
              <span className="text-xs font-semibold text-white">{completedMissions}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/40">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-xs text-slate-400 flex-1">Blocked</span>
              <span className="text-xs font-semibold text-white">{blockedTasks}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
