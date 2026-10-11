export type MissionStatus = "active" | "completed" | "archived";
export type StepStatus = "pending" | "in_progress" | "completed" | "blocked";
export type StepPriority = "low" | "medium" | "high" | "critical";

export interface Mission {
  id: string;
  title: string;
  goal: string;
  status: MissionStatus;
  objective: string | null;
  deadline: string | null;
  constraints: string | null;
  expected_outcome: string | null;
  context_summary: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Step {
  id: string;
  mission_id: string;
  title: string;
  description: string;
  priority: StepPriority;
  completion_criteria: string;
  status: StepStatus;
  order_index: number;
  depends_on: string;
  help_requested: boolean;
  problem_reported: string;
  evidence: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface ChatMessage {
  id: string;
  mission_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface PlanStep {
  title: string;
  description: string;
  priority: StepPriority;
  completion_criteria: string;
  depends_on: number[];
}

export interface MissionAnalysis {
  title: string;
  objective: string;
  deadline: string;
  constraints: string;
  expected_outcome: string;
  clarifying_questions: string[];
  context_summary: string;
  steps: PlanStep[];
}

export interface ReplanResult {
  explanation: string;
  steps: PlanStep[];
}

export interface CompletionCheck {
  is_complete: boolean;
  completion_percentage: number;
  missing_steps: string[];
  incomplete_requirements: string[];
  recommendation: string;
}
