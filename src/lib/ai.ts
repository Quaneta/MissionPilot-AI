import type {
  MissionAnalysis,
  ReplanResult,
  CompletionCheck,
  Mission,
  Step,
  ChatMessage,
} from "@/types";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent`;
const HEADERS: Record<string, string> = {
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

interface AIResponse<T> {
  data: T | null;
  error: string | null;
  demoMode: boolean;
  demoMessage?: string;
}

async function callAI<T>(body: Record<string, unknown>): Promise<AIResponse<T>> {
  try {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      return {
        data: null,
        error: errBody.error || `Request failed (${response.status})`,
        demoMode: false,
      };
    }

    const json = await response.json();

    if (json.demo_mode) {
      return {
        data: null,
        error: null,
        demoMode: true,
        demoMessage: json.message,
      };
    }

    if (json.error) {
      return { data: null, error: json.error, demoMode: false };
    }

    return { data: json as T, error: null, demoMode: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error calling AI service";
    return { data: null, error: message, demoMode: false };
  }
}

export async function analyzeGoal(
  goal: string
): Promise<AIResponse<{ analysis: MissionAnalysis }>> {
  return callAI<{ analysis: MissionAnalysis }>({ action: "analyze", goal });
}

export async function replanMission(
  mission: Mission,
  steps: Step[],
  problemDescription?: string,
  newDeadline?: string
): Promise<AIResponse<{ replan: ReplanResult }>> {
  return callAI<{ replan: ReplanResult }>({
    action: "replan",
    context: {
      mission: {
        title: mission.title,
        goal: mission.goal,
        objective: mission.objective || "",
        deadline: mission.deadline || "",
        constraints: mission.constraints || "",
        expected_outcome: mission.expected_outcome || "",
      },
      steps: steps.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        status: s.status,
        priority: s.priority,
        order_index: s.order_index,
        depends_on: s.depends_on,
        problem_reported: s.problem_reported,
        evidence: s.evidence,
      })),
      problemDescription,
      newDeadline,
    },
  });
}

export async function chatWithAI(
  mission: Mission,
  steps: Step[],
  message: string,
  chatHistory: ChatMessage[]
): Promise<AIResponse<{ reply: string }>> {
  return callAI<{ reply: string }>({
    action: "chat",
    message,
    context: {
      mission: {
        title: mission.title,
        goal: mission.goal,
        objective: mission.objective || "",
        deadline: mission.deadline || "",
        constraints: mission.constraints || "",
        expected_outcome: mission.expected_outcome || "",
      },
      steps: steps.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        status: s.status,
        priority: s.priority,
        order_index: s.order_index,
        depends_on: s.depends_on,
        problem_reported: s.problem_reported,
        evidence: s.evidence,
      })),
      chatHistory: chatHistory.map((c) => ({ role: c.role, content: c.content })),
    },
  });
}

export async function checkCompletion(
  mission: Mission,
  steps: Step[]
): Promise<AIResponse<{ check: CompletionCheck }>> {
  return callAI<{ check: CompletionCheck }>({
    action: "check_completion",
    context: {
      mission: {
        title: mission.title,
        goal: mission.goal,
        objective: mission.objective || "",
        deadline: mission.deadline || "",
        constraints: mission.constraints || "",
        expected_outcome: mission.expected_outcome || "",
      },
      steps: steps.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        status: s.status,
        priority: s.priority,
        order_index: s.order_index,
        depends_on: s.depends_on,
        problem_reported: s.problem_reported,
        evidence: s.evidence,
      })),
    },
  });
}
