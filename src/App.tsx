import { useState, useEffect, useCallback } from "react";
import { Menu, Rocket } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Mission, Step } from "@/types";
import { Sidebar, type View } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { NewMission } from "@/components/NewMission";
import { MissionDetail } from "@/components/MissionDetail";
import { History } from "@/components/History";
import { getStatusCounts } from "@/lib/utils";

function App() {
  const [view, setView] = useState<View>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [stepsByMission, setStepsByMission] = useState<Record<string, Step[]>>({});
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: missionData } = await supabase
      .from("missions")
      .select("*")
      .order("updated_at", { ascending: false });

    if (missionData) {
      setMissions(missionData as Mission[]);

      // Load steps for all missions
      if (missionData.length > 0) {
        const { data: allSteps } = await supabase
          .from("steps")
          .select("*")
          .in(
            "mission_id",
            missionData.map((m) => m.id)
          )
          .order("order_index");

        if (allSteps) {
          const grouped: Record<string, Step[]> = {};
          for (const step of allSteps as Step[]) {
            if (!grouped[step.mission_id]) grouped[step.mission_id] = [];
            grouped[step.mission_id].push(step);
          }
          setStepsByMission(grouped);
        }
      } else {
        setStepsByMission({});
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleNavigate(newView: View) {
    if (newView === "mission-detail" && !selectedMission) {
      // If no mission is selected, go to dashboard
      setView("dashboard");
      return;
    }
    setView(newView);
    setSidebarOpen(false);
  }

  function handleOpenMission(mission: Mission) {
    setSelectedMission(mission);
    setView("mission-detail");
    setSidebarOpen(false);
  }

  function handleMissionCreated(mission: Mission) {
    setSelectedMission(mission);
    setView("mission-detail");
    loadData();
  }

  const activeMissions = missions.filter((m) => m.status === "active").length;
  const completedMissions = missions.filter((m) => m.status === "completed").length;
  const allSteps = Object.values(stepsByMission).flat();
  const blockedTasks = getStatusCounts(allSteps).blocked;

  function handleBackToDashboard() {
    setView("dashboard");
    setSelectedMission(null);
    loadData();
  }

  // Keep selectedMission in sync with missions array
  useEffect(() => {
    if (selectedMission) {
      const updated = missions.find((m) => m.id === selectedMission.id);
      if (updated && updated !== selectedMission) {
        setSelectedMission(updated);
      }
    }
  }, [missions, selectedMission]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[100px]" />
      </div>

      <Sidebar
        currentView={view}
        onNavigate={handleNavigate}
        activeMissions={activeMissions}
        completedMissions={completedMissions}
        blockedTasks={blockedTasks}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 min-w-0 relative">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400">
              <Rocket className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">MissionPilot</span>
          </div>
        </div>

        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-5xl mx-auto relative">
          {view === "dashboard" && (
            <Dashboard
              missions={missions}
              stepsByMission={stepsByMission}
              onNewMission={() => handleNavigate("new-mission")}
              onOpenMission={handleOpenMission}
              onShowHistory={() => handleNavigate("history")}
              loading={loading}
            />
          )}

          {view === "new-mission" && (
            <NewMission
              onMissionCreated={handleMissionCreated}
              onCancel={() => handleNavigate("dashboard")}
            />
          )}

          {view === "mission-detail" && selectedMission && (
            <MissionDetail
              key={selectedMission.id}
              mission={selectedMission}
              onBack={handleBackToDashboard}
              onMissionUpdated={loadData}
            />
          )}

          {view === "mission-detail" && !selectedMission && (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-slate-400">No mission selected</p>
              <button
                onClick={() => handleNavigate("dashboard")}
                className="mt-4 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm hover:bg-slate-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          )}

          {view === "history" && (
            <History
              missions={missions}
              stepsByMission={stepsByMission}
              onBack={() => handleNavigate("dashboard")}
              onOpenMission={handleOpenMission}
              loading={loading}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
