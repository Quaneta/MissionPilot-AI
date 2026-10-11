/*
# Create MissionPilot AI database schema

## Overview
This migration creates the complete data model for MissionPilot AI, a task-planning agent
that helps users turn goals into actionable steps and track progress. This is a single-tenant
(no-auth) schema — all data is shared and accessible via the anon key.

## New Tables

### 1. `missions`
- Stores a user's overall goal/mission.
- `id` (uuid, primary key)
- `title` (text) — short name of the mission
- `goal` (text) — the full natural-language goal description
- `status` (text) — one of: active, completed, archived
- `objective` (text) — extracted objective
- `deadline` (text) — extracted or user-provided deadline
- `constraints` (text) — extracted constraints
- `expected_outcome` (text) — what success looks like
- `context_summary` (text) — AI-generated summary of the mission
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `completed_at` (timestamptz, nullable)

### 2. `steps`
- Individual actionable steps within a mission.
- `id` (uuid, primary key)
- `mission_id` (uuid, foreign key to missions)
- `title` (text) — step title
- `description` (text) — what to do
- `priority` (text) — low, medium, high, critical
- `completion_criteria` (text) — how to know it's done
- `status` (text) — pending, in_progress, completed, blocked
- `order_index` (integer) — logical execution order
- `depends_on` (text) — comma-separated step IDs this depends on
- `help_requested` (boolean) — user flagged this step for help
- `problem_reported` (text) — user-reported problem description
- `evidence` (text) — user-provided evidence of completion
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `completed_at` (timestamptz, nullable)

### 3. `chat_messages`
- Chat history between user and AI about a specific mission.
- `id` (uuid, primary key)
- `mission_id` (uuid, foreign key to missions)
- `role` (text) — user or assistant
- `content` (text) — message text
- `created_at` (timestamptz)

## Security
- RLS enabled on all tables.
- Policies allow anon + authenticated full CRUD (single-tenant, intentionally public data).
- This is a no-auth app — no user_id columns, no auth.uid() checks.
*/

-- Create missions table
CREATE TABLE IF NOT EXISTS missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  goal text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  objective text,
  deadline text,
  constraints text,
  expected_outcome text,
  context_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Create steps table
CREATE TABLE IF NOT EXISTS steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'medium',
  completion_criteria text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  order_index integer NOT NULL DEFAULT 0,
  depends_on text NOT NULL DEFAULT '',
  help_requested boolean NOT NULL DEFAULT false,
  problem_reported text NOT NULL DEFAULT '',
  evidence text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Missions policies (single-tenant: anon + authenticated full CRUD)
DROP POLICY IF EXISTS "anon_select_missions" ON missions;
CREATE POLICY "anon_select_missions" ON missions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_missions" ON missions;
CREATE POLICY "anon_insert_missions" ON missions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_missions" ON missions;
CREATE POLICY "anon_update_missions" ON missions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_missions" ON missions;
CREATE POLICY "anon_delete_missions" ON missions FOR DELETE
  TO anon, authenticated USING (true);

-- Steps policies
DROP POLICY IF EXISTS "anon_select_steps" ON steps;
CREATE POLICY "anon_select_steps" ON steps FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_steps" ON steps;
CREATE POLICY "anon_insert_steps" ON steps FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_steps" ON steps;
CREATE POLICY "anon_update_steps" ON steps FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_steps" ON steps;
CREATE POLICY "anon_delete_steps" ON steps FOR DELETE
  TO anon, authenticated USING (true);

-- Chat messages policies
DROP POLICY IF EXISTS "anon_select_chat" ON chat_messages;
CREATE POLICY "anon_select_chat" ON chat_messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chat" ON chat_messages;
CREATE POLICY "anon_insert_chat" ON chat_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_chat" ON chat_messages;
CREATE POLICY "anon_update_chat" ON chat_messages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chat" ON chat_messages;
CREATE POLICY "anon_delete_chat" ON chat_messages FOR DELETE
  TO anon, authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_steps_mission_id ON steps(mission_id);
CREATE INDEX IF NOT EXISTS idx_steps_status ON steps(status);
CREATE INDEX IF NOT EXISTS idx_chat_mission_id ON chat_messages(mission_id);
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_missions_updated_at ON missions;
CREATE TRIGGER trigger_missions_updated_at
  BEFORE UPDATE ON missions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_steps_updated_at ON steps;
CREATE TRIGGER trigger_steps_updated_at
  BEFORE UPDATE ON steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();