# MissionPilot AI — Your Intelligent Task Completion Agent

MissionPilot AI is a universal task-planning agent that helps people turn confusing goals into clear, manageable actions and track their progress until completion.

## Features

### Smart Task Understanding
- Describe any goal in natural language
- AI asks clarifying questions when important information is missing
- Automatically identifies objectives, deadlines, constraints, and expected outcomes

### AI Task Planner
- Breaks goals into 4-10 actionable steps with titles, descriptions, priorities, and completion criteria
- Arranges steps in logical order with dependency tracking
- Each step shows what to do, how to do it, and how to know it's done

### One-Step Guidance
- Presents the next recommended action prominently at the top of the mission page
- Explains what to do and how to do it
- Mark complete, request help, or report a problem directly from the spotlight

### Progress Tracker
- Visual progress bar showing overall completion percentage
- Step counts for completed, pending, in-progress, and blocked tasks
- Edit any step's title, description, priority, or completion criteria
- Change step status with a dropdown or by clicking the status icon
- All progress saves automatically to the database and persists across sessions

### Adaptive Planning
- Report a problem or change a deadline to trigger an AI replan
- Completed work is preserved — only remaining steps are revised
- The AI explains what changed and why

### Completion Checker
- Compares progress against the original goal
- Identifies missing steps and incomplete requirements
- Will not mark a mission complete unless all steps are done and verified
- Flags steps marked complete without evidence

### Interactive AI Chat
- Floating chat panel with full conversation history
- Context-aware responses that reference the current mission and step progress
- Ask questions, get help, or discuss strategy

### Dashboard
- Overview cards: active missions, completed missions, blocked tasks, overall progress
- Mission cards with progress bars and quick stats
- Empty states with clear calls to action
- Mission history page with filtering by status

## Architecture

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling (dark theme with gradients)
- **Lucide React** for icons

### Backend
- **Supabase** (PostgreSQL database with Row Level Security)
- **Supabase Edge Functions** (Deno runtime) for secure AI API calls
- **OpenAI API** (gpt-4o-mini) for task understanding, planning, replanning, and chat

### Database Schema
- `missions` — stores goals with extracted metadata (objective, deadline, constraints, outcome)
- `steps` — individual actionable steps with status, priority, dependencies, and evidence
- `chat_messages` — conversation history between user and AI per mission

All tables have Row Level Security enabled. This is a single-tenant app (no authentication) with `anon, authenticated` policies allowing full CRUD.

## Setup Instructions

### Prerequisites
- The Supabase project is already provisioned and configured
- Environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are pre-populated

### Enabling Full AI Mode
The app runs in **demo mode** by default (template-based plans and responses). To enable full AI:

1. Add an OpenAI API key as an edge function secret named `OPENAI_API_KEY`
2. The edge function (`ai-agent`) will automatically use it when present
3. If the key is missing or invalid, the app falls back to demo mode with a clear banner

**Important:** The app never exposes API keys in frontend code. All AI calls go through the Supabase Edge Function, which reads the key from server-side environment variables.

### Running the App
```bash
npm install
npm run dev
```

### Building for Production
```bash
npm run build
```

## Demo Mode vs Full AI Mode

| Feature | Demo Mode | Full AI Mode |
|---------|-----------|--------------|
| Task planning | Template-based plans | AI generates custom plans from your goal |
| Clarifying questions | None | AI asks when info is missing |
| Chat | Generic responses | Context-aware, personalized guidance |
| Replanning | Template revision | AI rewrites remaining steps based on your problem |
| Completion check | Basic status check | AI evaluates against original goal |

The app clearly displays a demo mode banner when AI credentials are not configured. It does not fabricate AI responses or claim the AI integration is working when it isn't.

## AWS Integration Readiness

This application is architected for easy migration to AWS services. The following AWS services would be suitable:

### Compute
- **AWS Lambda + API Gateway**: Replace Supabase Edge Functions with Lambda functions behind API Gateway for the AI proxy layer. The edge function logic (`supabase/functions/ai-agent/index.ts`) maps directly to a Lambda handler.

### Database
- **Amazon RDS (PostgreSQL)**: Replace Supabase's PostgreSQL with RDS for the same schema (`missions`, `steps`, `chat_messages`). Use Amazon RDS Proxy for connection pooling.

### AI
- **Amazon Bedrock**: Replace OpenAI API calls with Bedrock's model access (e.g., Claude or Titan models). The system prompts and JSON parsing logic remain the same — only the API call changes.

### Storage & Secrets
- **AWS Secrets Manager**: Store the AI API key in Secrets Manager instead of Supabase edge function secrets. Lambda reads the secret at runtime.
- **Amazon S3**: If file evidence uploads are added (for completion verification), use S3 with presigned URLs.

### Authentication (if needed)
- **Amazon Cognito**: Add user authentication with Cognito user pools, replacing Supabase Auth. Update RLS policies to use Cognito JWT claims.

### Networking
- **Amazon CloudFront**: Serve the frontend static assets through CloudFront for global CDN delivery.
- **Application Load Balancer**: Route API requests to Lambda functions.

### Migration Notes
- The frontend only needs the API base URL changed (from Supabase function URL to API Gateway URL)
- The database schema is standard PostgreSQL and migrates to RDS without changes
- The edge function body maps directly to a Lambda handler — the Deno `fetch` handler becomes a Lambda `event` handler
- No AWS integration is currently implemented or tested — the architecture is ready for it

## Live Walkthrough

To demonstrate the app:

1. **Create a mission**: Click "New Mission", describe a goal (e.g., "Build a personal portfolio website"), and see the AI break it into steps
2. **Review the plan**: See the extracted objective, deadline, constraints, and step-by-step plan
3. **Launch the mission**: The mission is saved and opens in the detail view
4. **Follow one-step guidance**: The next action is highlighted at the top with action buttons
5. **Update progress**: Mark steps complete, change status, or edit step details
6. **Chat with AI**: Click "Ask AI" to get contextual help
7. **Replan**: Click "Replan" to report a problem and see the plan adapt
8. **Check completion**: Click "Check Completion" to verify the mission against its goal
9. **View dashboard**: See overall progress, active missions, and completed missions
10. **Browse history**: Filter all missions by status

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Icons | Lucide React |
| Database | Supabase (PostgreSQL) |
| AI Proxy | Supabase Edge Functions (Deno) |
| AI Model | OpenAI GPT-4o-mini |
| Fonts | Inter (Google Fonts) |
