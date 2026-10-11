import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PlanStep {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  completion_criteria: string;
  depends_on: string[];
}

interface MissionAnalysis {
  title: string;
  objective: string;
  deadline: string;
  constraints: string;
  expected_outcome: string;
  clarifying_questions: string[];
  context_summary: string;
  steps: PlanStep[];
}

interface ChatRequestBody {
  action: "analyze" | "replan" | "chat" | "check_completion";
  missionId?: string;
  goal?: string;
  message?: string;
  context?: {
    mission?: {
      title: string;
      goal: string;
      objective: string;
      deadline: string;
      constraints: string;
      expected_outcome: string;
    };
    steps?: Array<{
      id: string;
      title: string;
      description: string;
      status: string;
      priority: string;
      order_index: number;
      depends_on: string;
      problem_reported: string;
      evidence: string;
    }>;
    chatHistory?: Array<{ role: string; content: string }>;
    problemDescription?: string;
    newDeadline?: string;
  };
}

function getApiKey(): string | null {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key || key === "" || key === "your-openai-api-key-here") {
    return null;
  }
  return key;
}

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  model = "gpt-4o-mini",
  temperature = 0.7,
  maxTokens = 2000
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned no content");
  }
  return content;
}

function extractJSON(text: string): unknown {
  let cleaned = text.trim();
  // Remove markdown code fences if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  return JSON.parse(cleaned);
}

const ANALYZE_SYSTEM_PROMPT = `You are MissionPilot AI, an intelligent task-planning agent. Your job is to understand a user's goal, extract key information, and create a detailed actionable plan.

You must respond with valid JSON only — no markdown, no prose outside the JSON.

The JSON must have this exact shape:
{
  "title": "A short, memorable name for this mission (max 60 chars)",
  "objective": "The core objective the user wants to achieve",
  "deadline": "The deadline if mentioned, or empty string if not specified",
  "constraints": "Any constraints mentioned (budget, time, tools, etc.) or empty string",
  "expected_outcome": "What a successful outcome looks like",
  "clarifying_questions": ["Ask 0-3 clarifying questions ONLY if critical info is missing. If the goal is clear enough to plan, return an empty array."],
  "context_summary": "A 1-2 sentence summary of the mission for quick context",
  "steps": [
    {
      "title": "Step title (imperative, action-oriented, max 80 chars)",
      "description": "Detailed explanation of what to do and how. Be specific and practical.",
      "priority": "low" | "medium" | "high" | "critical",
      "completion_criteria": "How to verify this step is done — concrete, checkable criteria",
      "depends_on": [] // indices (0-based) of steps that must be completed before this one
    }
  ]
}

Rules:
- Break the goal into 4-10 logical, sequential steps.
- Steps should be genuinely actionable — not vague.
- The first step should be the most foundational action.
- Prioritize steps by importance: critical steps are blockers.
- Use depends_on to show step ordering (e.g., step index 2 depends on [0, 1]).
- Only ask clarifying questions if information is TRULY missing and would change the plan. If you can plan confidently, return an empty array.
- For simple goals, you can plan without questions. For complex/ambiguous goals, ask 1-3 questions.
- Make descriptions practical and specific to the goal domain.`;

const REPLAN_SYSTEM_PROMPT = `You are MissionPilot AI, an adaptive task-planning agent. The user has reported a problem or a change that requires revising the plan.

You must respond with valid JSON only — no markdown, no prose outside the JSON.

The JSON must have this exact shape:
{
  "explanation": "A clear, friendly explanation of what changed and why (2-4 sentences)",
  "steps": [
    {
      "title": "Step title (imperative, action-oriented, max 80 chars)",
      "description": "Detailed explanation of what to do and how",
      "priority": "low" | "medium" | "high" | "critical",
      "completion_criteria": "How to verify this step is done",
      "depends_on": [] // indices (0-based) of steps this depends on
    }
  ]
}

Rules:
- PRESERVE completed work — do not include steps that are already completed.
- Only revise the REMAINING steps (pending, in_progress, blocked).
- If a deadline changed, adjust priorities and possibly merge/simplify steps.
- If a problem was reported, add steps to address the problem and adjust downstream steps.
- Keep the plan practical and focused.
- Provide a clear explanation the user can understand.`;

const CHAT_SYSTEM_PROMPT = `You are MissionPilot AI, a friendly and practical task-completion assistant. You're helping a user work through their mission step by step.

Guidelines:
- Be concise and practical — answer in 2-4 short paragraphs maximum.
- Use the mission context and current step progress to give relevant advice.
- If the user asks about a specific step, explain it clearly and suggest how to approach it.
- If the user is stuck, break things down into smaller actions.
- Be encouraging but honest — don't claim something is done if it isn't.
- Reference the current step and progress when relevant.
- Keep responses friendly and conversational, not robotic.`;

const COMPLETION_CHECK_SYSTEM_PROMPT = `You are MissionPilot AI, a completion-checking agent. Your job is to evaluate whether a mission is truly complete by comparing progress against the original goal.

You must respond with valid JSON only — no markdown, no prose outside the JSON.

The JSON must have this exact shape:
{
  "is_complete": boolean,
  "completion_percentage": number (0-100),
  "missing_steps": ["Description of any steps that are not yet completed or lack evidence"],
  "incomplete_requirements": ["Any requirements from the original goal that aren't met"],
  "recommendation": "What the user should do next to complete the mission (if not complete) or confirmation (if complete)"
}

Rules:
- A step is only complete if its status is "completed" AND it has either evidence or reasonable completion criteria met.
- NEVER mark a mission as complete if steps are still pending, in_progress, or blocked.
- Be strict but fair — if the user has provided evidence or clear completion, acknowledge it.
- If steps lack evidence but are marked completed, note this as a potential gap.
- The completion_percentage should reflect actual verified progress.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = getApiKey();

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          demo_mode: true,
          message: "AI is running in demo mode. Add an OPENAI_API_KEY edge function secret to enable full AI planning.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json()) as ChatRequestBody;
    const { action, context } = body;

    if (action === "analyze") {
      const goal = body.goal?.trim();
      if (!goal || goal.length < 3) {
        return new Response(
          JSON.stringify({ error: "Please provide a goal description (at least 3 characters)." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userMessage = `Analyze this goal and create a plan:\n\n"${goal}"`;
      const raw = await callOpenAI(apiKey, ANALYZE_SYSTEM_PROMPT, userMessage, "gpt-4o-mini", 0.7, 2500);
      const parsed = extractJSON(raw) as MissionAnalysis;

      return new Response(
        JSON.stringify({ analysis: parsed }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "replan") {
      if (!context?.mission) {
        return new Response(
          JSON.stringify({ error: "Mission context is required for replanning." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const m = context.mission;
      const completedSteps = (context.steps || []).filter((s) => s.status === "completed");
      const remainingSteps = (context.steps || []).filter((s) => s.status !== "completed");

      const userMessage = `Mission: ${m.title}
Goal: ${m.goal}
Objective: ${m.objective || "N/A"}
Deadline: ${m.deadline || "Not specified"}
Constraints: ${m.constraints || "None"}

COMPLETED STEPS (do NOT include these in the new plan):
${completedSteps.map((s, i) => `${i + 1}. ${s.title} (COMPLETED)`).join("\n") || "None completed yet."}

REMAINING STEPS (revise these):
${remainingSteps.map((s, i) => `${i + 1}. ${s.title} — Status: ${s.status} — Priority: ${s.priority}\n   Description: ${s.description}\n   Problem reported: ${s.problem_reported || "None"}`).join("\n") || "None remaining."}

${context.problemDescription ? `PROBLEM REPORTED: ${context.problemDescription}` : ""}
${context.newDeadline ? `NEW DEADLINE: ${context.newDeadline}` : ""}

Please revise the remaining plan based on the above information.`;

      const raw = await callOpenAI(apiKey, REPLAN_SYSTEM_PROMPT, userMessage, "gpt-4o-mini", 0.7, 2000);
      const parsed = extractJSON(raw) as { explanation: string; steps: PlanStep[] };

      return new Response(
        JSON.stringify({ replan: parsed }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "chat") {
      if (!context?.mission) {
        return new Response(
          JSON.stringify({ error: "Mission context is required for chat." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const m = context.mission;
      const steps = context.steps || [];
      const chatHistory = context.chatHistory || [];
      const userMessage = body.message?.trim();

      if (!userMessage) {
        return new Response(
          JSON.stringify({ error: "Message is required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const contextStr = `Mission: ${m.title}
Goal: ${m.goal}
Objective: ${m.objective || "N/A"}
Deadline: ${m.deadline || "Not specified"}

Current steps and their status:
${steps.map((s, i) => `${i + 1}. ${s.title} — Status: ${s.status} — Priority: ${s.priority}${s.problem_reported ? ` — PROBLEM: ${s.problem_reported}` : ""}`).join("\n") || "No steps yet."}

Previous conversation:
${chatHistory.slice(-6).map((c) => `${c.role}: ${c.content}`).join("\n") || "No previous conversation."}

User's new message: ${userMessage}`;

      const reply = await callOpenAI(apiKey, CHAT_SYSTEM_PROMPT, contextStr, "gpt-4o-mini", 0.7, 800);

      return new Response(
        JSON.stringify({ reply }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "check_completion") {
      if (!context?.mission || !context?.steps) {
        return new Response(
          JSON.stringify({ error: "Mission context and steps are required for completion check." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const m = context.mission;
      const steps = context.steps;

      const userMessage = `Mission: ${m.title}
Goal: ${m.goal}
Objective: ${m.objective || "N/A"}
Expected outcome: ${m.expected_outcome || "N/A"}

Steps and their current status:
${steps.map((s, i) => `${i + 1}. ${s.title} — Status: ${s.status} — Completion Criteria: ${s.completion_criteria || "N/A"}${s.evidence ? ` — Evidence: ${s.evidence}` : " — No evidence provided"}`).join("\n") || "No steps defined."}

Please evaluate whether this mission is truly complete.`;

      const raw = await callOpenAI(apiKey, COMPLETION_CHECK_SYSTEM_PROMPT, userMessage, "gpt-4o-mini", 0.3, 1000);
      const parsed = extractJSON(raw) as {
        is_complete: boolean;
        completion_percentage: number;
        missing_steps: string[];
        incomplete_requirements: string[];
        recommendation: string;
      };

      return new Response(
        JSON.stringify({ check: parsed }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: analyze, replan, chat, or check_completion." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
