import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft, Target, CheckCircle2, Circle, Clock, AlertCircle, ChevronDown, ChevronUp,
  MessageSquare, Send, Sparkles, RefreshCw, HelpCircle, Flag, Trash2, Edit3, X,
  Check, AlertTriangle, Lightbulb, Zap, ListChecks,
} from "lucide-react";
import type { Mission, Step, ChatMessage, StepStatus, CompletionCheck } from "@/types";
import { supabase } from "@/lib/supabase";
import { chatWithAI, replanMission, checkCompletion } from "@/lib/ai";
import {
  getDemoChatReply, getDemoReplan, getDemoCompletionCheck,
} from "@/lib/demo";
import {
  getProgress, getNextStep, getStatusCounts, formatDate, formatRelative,
  STATUS_COLORS, PRIORITY_COLORS, STATUS_LABELS, PRIORITY_LABELS, cn,
} from "@/lib/utils";
import { ProgressBar } from "./ProgressBar";
import { Spinner } from "./Spinner";

interface MissionDetailProps {
  mission: Mission;
  onBack: () => void;
  onMissionUpdated: () => void;
}

type ChatMode = "closed" | "open";

export function MissionDetail({ mission, onBack, onMissionUpdated }: MissionDetailProps) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>("closed");
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [replanModalOpen, setReplanModalOpen] = useState(false);
  const [replanLoading, setReplanLoading] = useState(false);
  const [replanProblem, setReplanProblem] = useState("");
  const [replanDeadline, setReplanDeadline] = useState("");
  const [replanError, setReplanError] = useState<string | null>(null);
  const [completionCheck, setCompletionCheck] = useState<CompletionCheck | null>(null);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [actionStepId, setActionStepId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [stepsRes, chatRes] = await Promise.all([
      supabase.from("steps").select("*").eq("mission_id", mission.id).order("order_index"),
      supabase
        .from("chat_messages")
        .select("*")
        .eq("mission_id", mission.id)
        .order("created_at", { ascending: true }),
    ]);

    if (stepsRes.data) setSteps(stepsRes.data as Step[]);
    if (chatRes.data) setChatMessages(chatRes.data as ChatMessage[]);
    setLoading(false);
  }, [mission.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const progress = getProgress(steps);
  const nextStep = getNextStep(steps);
  const counts = getStatusCounts(steps);

  function toggleStep(id: string) {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function updateStepStatus(step: Step, status: StepStatus) {
    const updates: Record<string, unknown> = { status };
    if (status === "completed") {
      updates.completed_at = new Date().toISOString();
    } else {
      updates.completed_at = null;
    }

    const { error } = await supabase.from("steps").update(updates).eq("id", step.id);
    if (error) return;

    setSteps((prev) =>
      prev.map((s) =>
        s.id === step.id
          ? { ...s, status, completed_at: status === "completed" ? new Date().toISOString() : null }
          : s
      )
    );
    onMissionUpdated();
  }

  async function handleStepAction(step: Step, action: "help" | "problem", value?: string) {
    setActionLoading(true);
    const updates: Record<string, unknown> = {};
    if (action === "help") {
      updates.help_requested = !step.help_requested;
    } else if (action === "problem") {
      updates.problem_reported = value || "";
      updates.status = value ? "blocked" : "pending";
    }

    const { error } = await supabase.from("steps").update(updates).eq("id", step.id);
    if (error) {
      setActionLoading(false);
      return;
    }

    setSteps((prev) =>
      prev.map((s) =>
        s.id === step.id
          ? {
              ...s,
              help_requested: action === "help" ? !s.help_requested : s.help_requested,
              problem_reported: action === "problem" ? (value || "") : s.problem_reported,
              status: action === "problem" && value ? "blocked" : action === "problem" && !value ? "pending" : s.status,
            }
          : s
      )
    );
    setActionStepId(null);
    setActionLoading(false);
    onMissionUpdated();
  }

  async function handleSaveStepEdit(updated: Step) {
    const { error } = await supabase
      .from("steps")
      .update({
        title: updated.title,
        description: updated.description,
        priority: updated.priority,
        completion_criteria: updated.completion_criteria,
      })
      .eq("id", updated.id);
    if (error) return;

    setSteps((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setEditingStep(null);
    onMissionUpdated();
  }

  async function handleSendChat() {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;

    setChatInput("");
    setChatLoading(true);
    setChatError(null);

    // Optimistic: add user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      mission_id: mission.id,
      role: "user",
      content: msg,
      created_at: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, tempUserMsg]);

    // Save user message to DB
    supabase
      .from("chat_messages")
      .insert({ mission_id: mission.id, role: "user", content: msg })
      .then(({ data }) => {
        if (data && data[0]) {
          setChatMessages((prev) =>
            prev.map((m) => (m.id === tempUserMsg.id ? (data[0] as ChatMessage) : m))
          );
        }
      });

    try {
      const result = await chatWithAI(mission, steps, msg, chatMessages);

      let reply: string;
      if (result.demoMode) {
        setDemoMode(true);
        reply = getDemoChatReply(msg, mission.title);
      } else if (result.error) {
        setChatError(result.error);
        reply = "Sorry, I couldn't process that. Please try again.";
      } else if (result.data) {
        setDemoMode(false);
        reply = result.data.reply;
      } else {
        reply = "Sorry, something went wrong.";
      }

      // Save assistant reply
      const { data: savedReply } = await supabase
        .from("chat_messages")
        .insert({ mission_id: mission.id, role: "assistant", content: reply })
        .select();

      if (savedReply && savedReply[0]) {
        setChatMessages((prev) => [...prev, savedReply[0] as ChatMessage]);
      }
    } catch {
      setChatError("Failed to get AI response");
    } finally {
      setChatLoading(false);
    }
  }

  async function handleReplan() {
    setReplanLoading(true);
    setReplanError(null);

    try {
      const result = await replanMission(
        mission,
        steps,
        replanProblem.trim() || undefined,
        replanDeadline.trim() || undefined
      );

      let replanSteps;
      let explanation: string;

      if (result.demoMode) {
        setDemoMode(true);
        const demo = getDemoReplan(replanProblem || "the plan needs adjustment");
        replanSteps = demo.steps;
        explanation = demo.explanation;
      } else if (result.error) {
        setReplanError(result.error);
        setReplanLoading(false);
        return;
      } else if (result.data) {
        setDemoMode(false);
        replanSteps = result.data.replan.steps;
        explanation = result.data.replan.explanation;
      } else {
        setReplanError("Failed to replan");
        setReplanLoading(false);
        return;
      }

      // Delete non-completed steps
      const remainingStepIds = steps.filter((s) => s.status !== "completed").map((s) => s.id);
      if (remainingStepIds.length > 0) {
        await supabase.from("steps").delete().in("id", remainingStepIds);
      }

      // Insert new steps
      const maxOrder = Math.max(...steps.filter((s) => s.status === "completed").map((s) => s.order_index), -1);
      const stepsToInsert = replanSteps.map((s, i) => ({
        mission_id: mission.id,
        title: s.title,
        description: s.description,
        priority: s.priority,
        completion_criteria: s.completion_criteria,
        status: "pending",
        order_index: maxOrder + 1 + i,
        depends_on: s.depends_on.map((d) => d.toString()).join(","),
      }));

      const { data: newSteps } = await supabase.from("steps").insert(stepsToInsert).select();

      // Save replan explanation as a chat message
      await supabase
        .from("chat_messages")
        .insert({
          mission_id: mission.id,
          role: "assistant",
          content: `Plan updated: ${explanation}`,
        });

      // Reload
      await loadData();
      setReplanModalOpen(false);
      setReplanProblem("");
      setReplanDeadline("");
      onMissionUpdated();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to replan";
      setReplanError(message);
    } finally {
      setReplanLoading(false);
    }
  }

  async function handleCheckCompletion() {
    setCompletionLoading(true);
    setCompletionError(null);

    try {
      const result = await checkCompletion(mission, steps);

      let check: CompletionCheck;
      if (result.demoMode) {
        setDemoMode(true);
        check = getDemoCompletionCheck(steps.map((s) => ({ status: s.status, title: s.title, evidence: s.evidence })));
      } else if (result.error) {
        setCompletionError(result.error);
        setCompletionLoading(false);
        return;
      } else if (result.data) {
        setDemoMode(false);
        check = result.data.check;
      } else {
        setCompletionError("Failed to check completion");
        setCompletionLoading(false);
        return;
      }

      setCompletionCheck(check);

      // If complete, update mission status
      if (check.is_complete) {
        await supabase
          .from("missions")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", mission.id);
        onMissionUpdated();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to check completion";
      setCompletionError(message);
    } finally {
      setCompletionLoading(false);
    }
  }

  async function handleDeleteMission() {
    if (!confirm("Delete this mission and all its steps? This cannot be undone.")) return;
    const { error } = await supabase.from("missions").delete().eq("id", mission.id);
    if (error) return;
    onBack();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" className="text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReplanModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Replan
          </button>
          <button
            onClick={handleDeleteMission}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Mission Header */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-800/30 border border-slate-700/50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/20 shrink-0">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-white tracking-tight">{mission.title}</h2>
            <p className="text-sm text-slate-400 mt-1">{mission.goal}</p>
            <div className="flex flex-wrap items-center gap-4 mt-3">
              {mission.deadline && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  {mission.deadline}
                </div>
              )}
              {mission.objective && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Target className="w-3.5 h-3.5" />
                  {mission.objective.length > 40 ? mission.objective.slice(0, 40) + "..." : mission.objective}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                Created {formatDate(mission.created_at)}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <ProgressBar value={progress} showLabel />
        </div>

        {/* Step counts */}
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <span className="flex items-center gap-1.5 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">{counts.completed} completed</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">{counts.inProgress + counts.pending} remaining</span>
          </span>
          {counts.blocked > 0 && (
            <span className="flex items-center gap-1.5 text-xs">
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-red-400">{counts.blocked} blocked</span>
            </span>
          )}
          <button
            onClick={handleCheckCompletion}
            disabled={completionLoading}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {completionLoading ? <Spinner size="sm" /> : <ListChecks className="w-3.5 h-3.5" />}
            Check Completion
          </button>
        </div>
      </div>

      {/* Demo Mode Banner */}
      {demoMode && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-300">Demo Mode</p>
            <p className="text-xs text-amber-400/80 mt-1">
              AI is running in demo mode with template-based responses. Add an OpenAI API key as an edge function secret for full AI capabilities.
            </p>
          </div>
        </div>
      )}

      {/* Completion Check Result */}
      {completionCheck && (
        <div
          className={cn(
            "rounded-2xl border p-5",
            completionCheck.is_complete
              ? "bg-emerald-500/10 border-emerald-500/30"
              : "bg-amber-500/10 border-amber-500/30"
          )}
        >
          <div className="flex items-start gap-3">
            {completionCheck.is_complete ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-white">
                {completionCheck.is_complete ? "Mission Complete!" : "Not Yet Complete"}
              </h3>
              <p className="text-sm text-slate-300 mt-1">{completionCheck.recommendation}</p>

              {completionCheck.missing_steps.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Missing Steps
                  </p>
                  <ul className="space-y-1">
                    {completionCheck.missing_steps.map((s, i) => (
                      <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                        <span className="text-red-400 mt-0.5">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {completionCheck.incomplete_requirements.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Incomplete Requirements
                  </p>
                  <ul className="space-y-1">
                    {completionCheck.incomplete_requirements.map((r, i) => (
                      <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => setCompletionCheck(null)}
                className="mt-3 text-xs text-slate-500 hover:text-slate-300"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Error */}
      {completionError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{completionError}</p>
        </div>
      )}

      {/* Next Step Spotlight */}
      {nextStep && (
        <div className="rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/30 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-blue-300 uppercase tracking-wider">
              Your Next Action
            </h3>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/20 shrink-0">
              <span className="text-lg font-bold text-blue-300">{nextStep.order_index + 1}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-lg font-bold text-white">{nextStep.title}</h4>
              <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{nextStep.description}</p>
              <div className="mt-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/30">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-400" />
                  Completion Criteria
                </p>
                <p className="text-xs text-slate-300">{nextStep.completion_criteria}</p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <button
                  onClick={() => updateStepStatus(nextStep, "completed")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 text-sm font-medium hover:bg-emerald-500/30 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark Complete
                </button>
                <button
                  onClick={() => updateStepStatus(nextStep, nextStep.status === "in_progress" ? "pending" : "in_progress")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-300 text-sm font-medium hover:bg-blue-500/30 transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  {nextStep.status === "in_progress" ? "Pause" : "Start Working"}
                </button>
                <button
                  onClick={() => {
                    setChatMode("open");
                    setChatInput(`I need help with: ${nextStep.title}`);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-700/50 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors"
                >
                  <HelpCircle className="w-4 h-4" />
                  Get Help
                </button>
                <button
                  onClick={() => setActionStepId(nextStep.id)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/15 text-red-300 text-sm font-medium hover:bg-red-500/25 transition-colors"
                >
                  <Flag className="w-4 h-4" />
                  Report Problem
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Problem Report Inline Form */}
      {actionStepId === nextStep?.id && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Flag className="w-4 h-4 text-red-400" />
            <h4 className="text-sm font-semibold text-red-300">Report a Problem</h4>
          </div>
          <textarea
            value={replanProblem}
            onChange={(e) => setReplanProblem(e.target.value)}
            placeholder="What's blocking you? Describe the issue..."
            className="w-full px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-white text-sm placeholder-slate-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all resize-none"
            rows={3}
            autoFocus
          />
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => {
                if (nextStep) handleStepAction(nextStep, "problem", replanProblem);
                setReplanProblem("");
              }}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/20 text-red-300 text-sm font-medium hover:bg-red-500/30 transition-colors"
            >
              {actionLoading ? <Spinner size="sm" /> : <Flag className="w-3.5 h-3.5" />}
              Report Problem
            </button>
            <button
              onClick={() => {
                setActionStepId(null);
                setReplanProblem("");
              }}
              className="px-4 py-2 rounded-lg text-slate-400 text-sm hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* All Steps List */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">All Steps</h3>
        <div className="space-y-2">
          {steps.map((step) => {
            const isExpanded = expandedSteps.has(step.id);
            const colors = STATUS_COLORS[step.status];
            const prioColors = PRIORITY_COLORS[step.priority];
            return (
              <div
                key={step.id}
                className={cn(
                  "rounded-xl border transition-all",
                  colors.bg,
                  colors.border
                )}
              >
                <div className="flex items-start gap-3 p-4">
                  {/* Status toggle */}
                  <button
                    onClick={() => {
                      if (step.status === "completed") {
                        updateStepStatus(step, "pending");
                      } else {
                        updateStepStatus(step, "completed");
                      }
                    }}
                    className="mt-0.5 shrink-0"
                  >
                    {step.status === "completed" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 hover:scale-110 transition-transform" />
                    ) : step.status === "blocked" ? (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    ) : step.status === "in_progress" ? (
                      <Clock className="w-5 h-5 text-blue-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-500 hover:text-slate-300 transition-colors" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2 flex-wrap">
                      <h4
                        className={cn(
                          "text-sm font-semibold",
                          step.status === "completed"
                            ? "text-slate-500 line-through"
                            : "text-white"
                        )}
                      >
                        {step.order_index + 1}. {step.title}
                      </h4>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                          prioColors.bg,
                          prioColors.text
                        )}
                      >
                        {PRIORITY_LABELS[step.priority]}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                          colors.bg,
                          colors.text
                        )}
                      >
                        {STATUS_LABELS[step.status]}
                      </span>
                    </div>

                    {/* Problem indicator */}
                    {step.problem_reported && (
                      <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                        <p className="text-xs text-red-300 flex items-start gap-1.5">
                          <Flag className="w-3 h-3 mt-0.5 shrink-0" />
                          {step.problem_reported}
                        </p>
                      </div>
                    )}

                    {/* Help indicator */}
                    {step.help_requested && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400">
                        <HelpCircle className="w-3 h-3" />
                        Help requested
                      </div>
                    )}

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-3 space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Description</p>
                          <p className="text-xs text-slate-300 leading-relaxed">{step.description}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Completion Criteria</p>
                          <p className="text-xs text-slate-300">{step.completion_criteria}</p>
                        </div>
                        {step.depends_on && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Depends On</p>
                            <p className="text-xs text-slate-400">
                              {step.depends_on
                                .split(",")
                                .filter(Boolean)
                                .map((d) => `Step ${parseInt(d) + 1}`)
                                .join(", ")}
                            </p>
                          </div>
                        )}

                        {/* Step Actions */}
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          <select
                            value={step.status}
                            onChange={(e) => updateStepStatus(step, e.target.value as StepStatus)}
                            className="px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs focus:border-blue-500 outline-none"
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="blocked">Blocked</option>
                          </select>
                          <button
                            onClick={() => setEditingStep(step)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs font-medium hover:text-white hover:bg-slate-700 transition-colors"
                          >
                            <Edit3 className="w-3 h-3" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleStepAction(step, "help")}
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                              step.help_requested
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                            )}
                          >
                            <HelpCircle className="w-3 h-3" />
                            {step.help_requested ? "Help Requested" : "Request Help"}
                          </button>
                          {step.status === "blocked" && step.problem_reported && (
                            <button
                              onClick={() => handleStepAction(step, "problem", "")}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-medium hover:bg-emerald-500/25 transition-colors"
                            >
                              <Check className="w-3 h-3" />
                              Mark Resolved
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expand/Collapse */}
                  <button
                    onClick={() => toggleStep(step.id)}
                    className="text-slate-500 hover:text-white transition-colors shrink-0"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Replan Modal */}
      {replanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-lg rounded-2xl bg-slate-800 border border-slate-700 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Adaptive Replan</h3>
              </div>
              <button onClick={() => setReplanModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Report a problem or change the deadline. The AI will revise the remaining steps while preserving completed work.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  What changed? (problem or new context)
                </label>
                <textarea
                  value={replanProblem}
                  onChange={(e) => setReplanProblem(e.target.value)}
                  placeholder="e.g., I can't access the database server, or I realized I need to add authentication..."
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-white text-sm placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  New deadline (optional)
                </label>
                <input
                  type="text"
                  value={replanDeadline}
                  onChange={(e) => setReplanDeadline(e.target.value)}
                  placeholder="e.g., 2 weeks from now, December 31st..."
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-white text-sm placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>
              {replanError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-sm text-red-300">{replanError}</p>
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setReplanModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 text-sm hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReplan}
                  disabled={replanLoading || (!replanProblem.trim() && !replanDeadline.trim())}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium text-sm shadow-lg shadow-blue-500/25 disabled:opacity-40 hover:scale-[1.02] transition-all"
                >
                  {replanLoading ? <Spinner size="sm" /> : <Sparkles className="w-4 h-4" />}
                  Revise Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Step Modal */}
      {editingStep && (
        <EditStepModal
          step={editingStep}
          onSave={handleSaveStepEdit}
          onClose={() => setEditingStep(null)}
        />
      )}

      {/* Chat Panel */}
      {chatMode === "open" && (
        <ChatPanel
          messages={chatMessages}
          input={chatInput}
          setInput={setChatInput}
          onSend={handleSendChat}
          loading={chatLoading}
          error={chatError}
          demoMode={demoMode}
          onClose={() => setChatMode("closed")}
          chatEndRef={chatEndRef}
        />
      )}

      {/* Floating Chat Button */}
      {chatMode === "closed" && (
        <button
          onClick={() => setChatMode("open")}
          className="fixed bottom-6 right-6 flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium text-sm shadow-xl shadow-blue-500/30 hover:scale-105 transition-all z-40"
        >
          <MessageSquare className="w-4 h-4" />
          Ask AI
        </button>
      )}
    </div>
  );
}

function EditStepModal({
  step,
  onSave,
  onClose,
}: {
  step: Step;
  onSave: (step: Step) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(step.title);
  const [description, setDescription] = useState(step.description);
  const [priority, setPriority] = useState(step.priority);
  const [criteria, setCriteria] = useState(step.completion_criteria);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-lg rounded-2xl bg-slate-800 border border-slate-700 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Edit Step</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-white text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-white text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Step["priority"])}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-white text-sm focus:border-blue-500 outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Completion Criteria</label>
            <textarea
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-white text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
              rows={2}
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-400 text-sm hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                onSave({
                  ...step,
                  title,
                  description,
                  priority,
                  completion_criteria: criteria,
                })
              }
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium text-sm shadow-lg shadow-blue-500/25 hover:scale-[1.02] transition-all"
            >
              <Check className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatPanel({
  messages,
  input,
  setInput,
  onSend,
  loading,
  error,
  demoMode,
  onClose,
  chatEndRef,
}: {
  messages: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  loading: boolean;
  error: string | null;
  demoMode: boolean;
  onClose: () => void;
  chatEndRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <>
      {typeof window !== "undefined" && window.innerWidth < 1024 && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onClose} />
      )}
      <div className="fixed lg:sticky bottom-0 right-0 lg:right-auto z-50 w-full lg:w-96 h-[500px] lg:h-[calc(100vh-2rem)] lg:max-h-[700px] lg:top-0 lg:my-0 lg:ml-6 flex flex-col rounded-t-2xl lg:rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
              {demoMode && <p className="text-[10px] text-amber-400">Demo mode</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Lightbulb className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-sm text-slate-400 mb-1">Ask me anything about your mission</p>
              <p className="text-xs text-slate-500">I can help with steps, strategies, and problems</p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                  msg.role === "user"
                    ? "bg-blue-500/20 text-slate-100 rounded-br-sm"
                    : "bg-slate-700/50 text-slate-200 rounded-bl-sm"
                )}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <p className="text-[10px] text-slate-500 mt-1">{formatRelative(msg.created_at)}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-700/50 rounded-2xl rounded-bl-sm px-3.5 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-3 border-t border-slate-700">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              placeholder="Type your message..."
              rows={1}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-white text-sm placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none max-h-24"
            />
            <button
              onClick={onSend}
              disabled={loading || !input.trim()}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white shrink-0 disabled:opacity-40 hover:scale-105 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
