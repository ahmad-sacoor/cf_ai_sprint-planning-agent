export interface Task {
  id: string;
  title: string;
  effort: number; // 1-5
  impact: number; // 1-5
  tags?: string[];
  notes?: string;
  votes: number;
  createdAt: number;
  createdBy: string;
}

export interface Member {
  name: string;
  joinedAt: number;
}

export interface Constraints {
  sprintLengthDays: number;
  capacityPoints: number;
  notes?: string;
}

export type WorkflowState = 'DRAFT' | 'GENERATED' | 'FINALIZED';

export interface GeneratedPlan {
  orderedBacklog: Array<{
    taskId: string;
    title: string;
    reason: string;
  }>;
  excluded: Array<{
    taskId: string;
    title: string;
    reason: string;
  }>;
  risks: string[];
  assumptions: string[];
  summary: string;
}

export interface PlanVersion {
  version: number;
  plan: GeneratedPlan;
  generatedAt: number;
  inputSnapshot: {
    tasks: Task[];
    constraints: Constraints;
  };
}

export interface RoomState {
  roomId: string;
  members: Record<string, Member>;
  tasks: Record<string, Task>;
  constraints: Constraints;
  workflowState: WorkflowState;
  planVersions: PlanVersion[];
  currentPlanVersion: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface Env {
  AI: Ai;
  AGENT: DurableObjectNamespace;
}

// Input types for callable methods
export interface JoinInput {
  name: string;
}

export interface TaskInput {
  title: string;
  effort: number;
  impact: number;
  tags?: string[];
  notes?: string;
  createdBy: string;
}

export interface VoteInput {
  taskId: string;
}
