import type { MissionAnalysis, ReplanResult, CompletionCheck } from "@/types";

export function getDemoAnalysis(goal: string): MissionAnalysis {
  const lowerGoal = goal.toLowerCase();

  let steps: MissionAnalysis["steps"] = [];

  if (lowerGoal.includes("website") || lowerGoal.includes("web app") || lowerGoal.includes("app")) {
    steps = [
      {
        title: "Define project scope and requirements",
        description: "Write down exactly what the website or app should do. List the main features, target audience, and any technical constraints. This becomes your blueprint for everything else.",
        priority: "critical",
        completion_criteria: "A written document listing all core features and target audience",
        depends_on: [],
      },
      {
        title: "Choose your technology stack",
        description: "Decide which tools and frameworks you'll use based on your requirements. Consider factors like your experience level, project complexity, and hosting needs.",
        priority: "high",
        completion_criteria: "A clear decision on frontend, backend, and database technologies",
        depends_on: [0],
      },
      {
        title: "Create wireframes and design mockups",
        description: "Sketch out the key pages of your application. You can use tools like Figma, or even pen and paper. Focus on layout and user flow, not visual polish yet.",
        priority: "high",
        completion_criteria: "Wireframes for all main pages (home, key features, etc.)",
        depends_on: [0],
      },
      {
        title: "Set up the project structure and development environment",
        description: "Initialize your project with the chosen tech stack. Set up version control, folder structure, and basic configuration files.",
        priority: "high",
        completion_criteria: "Project runs locally with a basic 'hello world' page",
        depends_on: [1],
      },
      {
        title: "Build the core features",
        description: "Implement the main functionality of your application, starting with the most critical features. Build incrementally and test as you go.",
        priority: "critical",
        completion_criteria: "All core features are functional and tested",
        depends_on: [2, 3],
      },
      {
        title: "Test and debug thoroughly",
        description: "Test all features on different devices and browsers. Fix any bugs you find. Ask a friend to try it out and give feedback.",
        priority: "medium",
        completion_criteria: "No critical bugs remaining; tested on at least 2 devices",
        depends_on: [4],
      },
      {
        title: "Deploy to production and share",
        description: "Deploy your application to a hosting service. Test the live version, then share it with your intended audience.",
        priority: "medium",
        completion_criteria: "App is live and accessible via a public URL",
        depends_on: [5],
      },
    ];
  } else if (lowerGoal.includes("learn") || lowerGoal.includes("study") || lowerGoal.includes("course")) {
    steps = [
      {
        title: "Identify what you already know and what you need to learn",
        description: "Assess your current knowledge level. Write down what concepts you're already familiar with and which ones are completely new to you.",
        priority: "critical",
        completion_criteria: "A written list of known vs. unknown topics",
        depends_on: [],
      },
      {
        title: "Gather learning resources",
        description: "Find 2-3 high-quality resources for your topic — courses, books, documentation, or tutorials. Avoid collecting too many; focus on a few good ones.",
        priority: "high",
        completion_criteria: "2-3 quality resources identified and bookmarked",
        depends_on: [0],
      },
      {
        title: "Create a study schedule",
        description: "Plan specific times during your week dedicated to learning. Be realistic about how much time you can commit. Consistency matters more than length.",
        priority: "high",
        completion_criteria: "A weekly schedule with specific study blocks",
        depends_on: [0],
      },
      {
        title: "Work through the fundamentals first",
        description: "Start with the basics. Don't skip ahead. Make sure you understand each concept before moving to the next one. Take notes as you go.",
        priority: "critical",
        completion_criteria: "Notes on all fundamental concepts",
        depends_on: [1, 2],
      },
      {
        title: "Practice with hands-on exercises",
        description: "Apply what you've learned through exercises, mini-projects, or practice problems. Active practice is far more effective than passive reading.",
        priority: "high",
        completion_criteria: "At least 3 practice exercises completed",
        depends_on: [3],
      },
      {
        title: "Build a project to apply everything",
        description: "Create a small project that uses the skills you've been learning. This solidifies your knowledge and gives you something to show for your work.",
        priority: "medium",
        completion_criteria: "A completed project demonstrating learned skills",
        depends_on: [4],
      },
      {
        title: "Review and assess your progress",
        description: "Go back to your initial list of unknown topics. Check which ones you now understand. Identify any gaps and plan next steps for continued learning.",
        priority: "low",
        completion_criteria: "Progress assessment completed with next steps identified",
        depends_on: [5],
      },
    ];
  } else {
    // Generic task plan
    steps = [
      {
        title: "Clarify and document the end goal",
        description: `Write down exactly what "${goal}" means to you. What does success look like? Be specific so you know when you're done.`,
        priority: "critical",
        completion_criteria: "A clear, written description of what done looks like",
        depends_on: [],
      },
      {
        title: "Research and gather information",
        description: "Spend time understanding the landscape. What tools, resources, or knowledge do you need? What have others done in similar situations?",
        priority: "high",
        completion_criteria: "A list of resources, tools, and information needed",
        depends_on: [0],
      },
      {
        title: "Break the goal into milestones",
        description: "Identify 2-3 major milestones that mark significant progress toward your goal. These are checkpoints, not individual tasks.",
        priority: "high",
        completion_criteria: "2-3 milestones written down with target descriptions",
        depends_on: [1],
      },
      {
        title: "Start working on the first milestone",
        description: "Begin with the most important or foundational milestone. Focus on making tangible progress, even if it's small.",
        priority: "critical",
        completion_criteria: "First milestone reached or significant progress made",
        depends_on: [2],
      },
      {
        title: "Review progress and adjust approach",
        description: "Step back and evaluate how things are going. Are you on track? Do you need to change your approach or timeline?",
        priority: "medium",
        completion_criteria: "A brief written assessment of progress and any adjustments needed",
        depends_on: [3],
      },
      {
        title: "Complete remaining work toward the goal",
        description: "Push through the remaining milestones. Use what you've learned so far to work more efficiently.",
        priority: "high",
        completion_criteria: "All milestones completed",
        depends_on: [4],
      },
      {
        title: "Final review and wrap-up",
        description: "Do a final check against your original goal. Make sure everything is truly complete. Celebrate your accomplishment!",
        priority: "low",
        completion_criteria: "Goal confirmed as achieved against original success criteria",
        depends_on: [5],
      },
    ];
  }

  return {
    title: goal.length > 60 ? goal.slice(0, 57) + "..." : goal,
    objective: goal,
    deadline: "",
    constraints: "",
    expected_outcome: "The goal is fully achieved with all steps completed and verified.",
    clarifying_questions: [],
    context_summary: `A step-by-step plan to: ${goal}`,
    steps,
  };
}

export function getDemoReplan(problemDescription: string): ReplanResult {
  return {
    explanation: `I've adjusted the plan to address the reported issue: "${problemDescription}". The remaining steps have been reorganized to work around this problem and keep you moving forward. Completed work has been preserved.`,
    steps: [
      {
        title: "Address the reported problem",
        description: `Take action to resolve: ${problemDescription}. This may involve troubleshooting, finding an alternative approach, or getting help from someone with relevant expertise.`,
        priority: "critical",
        completion_criteria: "The reported problem is resolved or a workaround is in place",
        depends_on: [],
      },
      {
        title: "Reassess remaining work with the new context",
        description: "Now that the problem is addressed, review what's left to do. Some steps may need to be adjusted based on what you learned from resolving the problem.",
        priority: "high",
        completion_criteria: "Updated understanding of what remains to be done",
        depends_on: [0],
      },
      {
        title: "Continue with adjusted plan",
        description: "Proceed with the remaining work, incorporating any changes needed due to the problem you resolved. Stay flexible and adjust as you go.",
        priority: "high",
        completion_criteria: "All remaining work completed successfully",
        depends_on: [1],
      },
      {
        title: "Final verification",
        description: "Confirm everything is complete and the original goal has been achieved despite the problem encountered.",
        priority: "medium",
        completion_criteria: "Goal confirmed as achieved",
        depends_on: [2],
      },
    ],
  };
}

export function getDemoChatReply(message: string, missionTitle: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("stuck") || lower.includes("help") || lower.includes("don't know")) {
    return `It's completely normal to feel stuck! For "${missionTitle}", try breaking the current step into an even smaller piece. What specific part is giving you trouble? I can help you work through it step by step.\n\n(Note: This is a demo response. Add an OpenAI API key to get personalized AI guidance.)`;
  }
  if (lower.includes("how") || lower.includes("what")) {
    return `Great question! For your mission "${missionTitle}", the best approach is to focus on one step at a time. Make sure you understand the completion criteria for the current step before moving forward.\n\n(Note: This is a demo response. Add an OpenAI API key for detailed, context-aware guidance.)`;
  }
  return `I understand you're working on "${missionTitle}". Keep focusing on the current step — once you complete it, mark it done and move to the next one. You're making good progress!\n\n(Note: This is a demo response. Add an OpenAI API key to enable full AI-powered chat.)`;
}

export function getDemoCompletionCheck(
  steps: { status: string; title: string; evidence: string }[]
): CompletionCheck {
  const completed = steps.filter((s) => s.status === "completed");
  const remaining = steps.filter((s) => s.status !== "completed");
  const withoutEvidence = completed.filter((s) => !s.evidence);
  const percentage = steps.length > 0 ? Math.round((completed.length / steps.length) * 100) : 0;

  return {
    is_complete: remaining.length === 0 && withoutEvidence.length === 0,
    completion_percentage: percentage,
    missing_steps: remaining.map((s) => s.title),
    incomplete_requirements: withoutEvidence.map((s) => `Step "${s.title}" is marked complete but has no evidence of completion`),
    recommendation:
      remaining.length === 0 && withoutEvidence.length === 0
        ? "All steps are completed with evidence. Your mission appears to be fully achieved!"
        : `${remaining.length} step(s) still need to be completed. ${withoutEvidence.length} step(s) lack evidence. Please address these before marking the mission complete.`,
  };
}
