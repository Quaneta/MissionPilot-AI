import { useState } from "react";
import { Rocket, ArrowRight, ArrowLeft, Sparkles, Lightbulb, Check, AlertCircle, Send } from "lucide-react";
import { analyzeGoal } from "@/lib/ai";
import { getDemoAnalysis } from "@/lib/demo";
import { supabase } from "@/lib/supabase";
import type { MissionAnalysis, PlanStep, Mission, Step } from "@/types";
import { Spinner } from "./Spinner";
import { cn } from "@/lib/utils";

interface NewMissionProps {
  onMissionCreated: (mission: Mission) => void;
  onCancel: () => void;
}

type Phase = "input" | "clarifying" | "review" | "creating";

const EXAMPLE_GOALS = [
  "Build a personal portfolio website to showcase my projects",
  "Prepare for a software engineering job interview in 4 weeks",
  "Write and publish a 10-page research paper on climate change",
  "Plan and execute a product launch for my mobile app",
];

export function NewMission({ onMissionCreated, onCancel }: NewMissionProps) {
  const [phase, setPhase] = useState<Phase>("input");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [analysis, setAnalysis] = useState<MissionAnalysis | null>(null);
  const [clarifyingAnswers, setClarifyingAnswers] = useState<string[]>([]);

  async function handleAnalyze() {
    if (goal.trim().length < 10) {
      setError("Please describe your goal in at least a sentence.");
      return;
    }

    setError(null);
    setLoading(true);

    const result = await analyzeGoal(goal.trim());

    if (result.demoMode) {
      setDemoMode(true);
      const demo = getDemoAnalysis(goal.trim());
      setAnalysis(demo);
      setClarifyingAnswers(new Array(demo.clarifying_questions.length).fill(""));
      setPhase(demo.clarifying_questions.length > 0 ? "clarifying" : "review");
    } else if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setDemoMode(false);
      const a = result.data.analysis;
      setAnalysis(a);
      setClarifyingAnswers(new Array(a.clarifying_questions.length).fill(""));
      setPhase(a.clarifying_questions.length > 0 ? "clarifying" : "review");
    }

    setLoading(false);
  }

  function handleClarifyingSubmit() {
    if (!analysis) return;
    // Append answers to the goal context and re-analyze
    const answeredContext = analysis.clarifying_questions
      .map((q, i) => `Q: ${q}\nA: ${clarifyingAnswers[i] || "Not provided"}`)
      .join("\n");
    const enrichedGoal = `${goal}\n\nAdditional context:\n${answeredContext}`;
    setGoal(enrichedGoal);
    setPhase("review");
  }

  function handleSkipClarifying() {
    setPhase("review");
  }

  async function handleCreate() {
    if (!analysis) return;
    setLoading(true);
    setError(null);

    try {
      const { data: mission, error: missionError } = await supabase
        .from("missions")
        .insert({
          title: analysis.title,
          goal: goal,
          status: "active",
          objective: analysis.objective,
          deadline: analysis.deadline || null,
          constraints: analysis.constraints || null,
          expected_outcome: analysis.expected_outcome || null,
          context_summary: analysis.context_summary || null,
        })
        .select()
        .single();

      if (missionError || !mission) {
        throw new Error(missionError?.message || "Failed to create mission");
      }

      // Create steps
      const stepsToInsert = analysis.steps.map((s: PlanStep, index: number) => ({
        mission_id: mission.id,
        title: s.title,
        description: s.description,
        priority: s.priority,
        completion_criteria: s.completion_criteria,
        status: "pending",
        order_index: index,
        depends_on: s.depends_on.map((d) => d.toString()).join(","),
      }));

      const { error: stepsError } = await supabase.from("steps").insert(stepsToInsert);

      if (stepsError) {
        throw new Error(stepsError.message);
      }

      onMissionCreated(mission as Mission);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create mission";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/20">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">New Mission</h2>
            <p className="text-sm text-slate-400">Describe your goal and let AI create a plan</p>
          </div>
        </div>
      </div>

      {demoMode && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-300">Demo Mode Active</p>
            <p className="text-xs text-amber-400/80 mt-1">
              AI credentials are not configured. You're seeing a template-based plan. Add an OpenAI API key as an edge function secret to enable full AI-powered planning.
            </p>
          </div>
        </div>
      )}

      {/* Phase: Input */}
      {phase === "input" && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              What do you want to accomplish?
            </label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Describe your goal in your own words. The more detail you provide, the better the plan will be. For example: 'I want to build a personal portfolio website to showcase my coding projects and blog posts, and I need it done in 3 weeks.'"
              className="w-full px-4 py-3.5 rounded-xl bg-slate-800/60 border border-slate-700 text-white placeholder-slate-500 text-sm leading-relaxed focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
              rows={6}
              autoFocus
            />
            <p className="text-xs text-slate-500 mt-2">
              {goal.length} characters {goal.length < 10 && "· at least 10 needed"}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Example goals */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" />
              Need inspiration? Try one of these
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EXAMPLE_GOALS.map((example, i) => (
                <button
                  key={i}
                  onClick={() => setGoal(example)}
                  className="text-left p-3 rounded-lg bg-slate-800/40 border border-slate-700/50 hover:border-blue-500/40 hover:bg-slate-800/60 transition-all text-xs text-slate-400 hover:text-slate-200"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onCancel}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleAnalyze}
              disabled={loading || goal.trim().length < 10}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium text-sm shadow-lg shadow-blue-500/25 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] transition-all"
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyze Goal
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Phase: Clarifying */}
      {phase === "clarifying" && analysis && (
        <div className="space-y-6">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <Lightbulb className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-300">A few questions first</p>
              <p className="text-xs text-blue-400/70 mt-1">
                Answer these to help create a more accurate plan. You can skip any you're unsure about.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {analysis.clarifying_questions.map((q, i) => (
              <div key={i}>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {i + 1}. {q}
                </label>
                <textarea
                  value={clarifyingAnswers[i] || ""}
                  onChange={(e) => {
                    const updated = [...clarifyingAnswers];
                    updated[i] = e.target.value;
                    setClarifyingAnswers(updated);
                  }}
                  placeholder="Your answer..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700 text-white placeholder-slate-500 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                  rows={2}
                />
              </div>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={handleSkipClarifying}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Skip and use plan as-is
            </button>
            <button
              onClick={handleClarifyingSubmit}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium text-sm shadow-lg shadow-blue-500/25 hover:scale-[1.02] transition-all"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Phase: Review */}
      {phase === "review" && analysis && (
        <div className="space-y-6">
          {/* Mission Summary */}
          <div className="rounded-2xl bg-slate-800/40 border border-slate-700/50 p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{analysis.title}</h3>
                {analysis.context_summary && (
                  <p className="text-sm text-slate-400 mt-1">{analysis.context_summary}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {analysis.objective && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Objective</p>
                  <p className="text-sm text-slate-300">{analysis.objective}</p>
                </div>
              )}
              {analysis.deadline && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Deadline</p>
                  <p className="text-sm text-slate-300">{analysis.deadline}</p>
                </div>
              )}
              {analysis.constraints && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Constraints</p>
                  <p className="text-sm text-slate-300">{analysis.constraints}</p>
                </div>
              )}
              {analysis.expected_outcome && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Expected Outcome</p>
                  <p className="text-sm text-slate-300">{analysis.expected_outcome}</p>
                </div>
              )}
            </div>
          </div>

          {/* Steps */}
          <div>
            <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              Action Plan ({analysis.steps.length} steps)
            </p>
            <div className="space-y-3">
              {analysis.steps.map((step, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-slate-800/40 border border-slate-700/50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-700 text-xs font-bold text-slate-300 shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-white">{step.title}</h4>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                            step.priority === "critical" && "bg-red-500/20 text-red-300",
                            step.priority === "high" && "bg-orange-500/15 text-orange-300",
                            step.priority === "medium" && "bg-amber-500/15 text-amber-300",
                            step.priority === "low" && "bg-slate-600/30 text-slate-400"
                          )}
                        >
                          {step.priority}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed mb-2">{step.description}</p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Check className="w-3 h-3 text-emerald-400/60" />
                        <span>{step.completion_criteria}</span>
                      </div>
                      {step.depends_on.length > 0 && (
                        <p className="text-xs text-slate-500 mt-1.5">
                          Depends on: {step.depends_on.map((d) => `Step ${d + 1}`).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => {
                setPhase("input");
                setAnalysis(null);
                setError(null);
              }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to edit
            </button>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium text-sm shadow-lg shadow-emerald-500/25 disabled:opacity-40 hover:scale-[1.02] transition-all"
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  Creating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Launch Mission
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
