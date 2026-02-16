import { Agent, callable } from 'agents';
import type {
    Env,
    RoomState,
    Task,
    Member,
    Constraints,
    GeneratedPlan,
    PlanVersion,
    JoinInput,
    TaskInput,
    VoteInput,
} from './types';

export class SprintPlanningAgent extends Agent<Env, RoomState> {

    initialState: RoomState = {
        roomId: '',
        members: {},
        tasks: {},
        constraints: {
            sprintLengthDays: 14,
            capacityPoints: 40,
            notes: '',
        },
        workflowState: 'DRAFT',
        planVersions: [],
        currentPlanVersion: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    async onStart() {
        // Initialize roomId from the Agent's name
        if (!this.state.roomId) {
            this.setState({
                ...this.state,
                roomId: this.name,
            });
        }
    }

    async onRequest(request: Request) {
        // Handle non-WebSocket GET requests (testing/status)
        if (request.method === 'GET' && !request.headers.get('Upgrade')) {
            return new Response(JSON.stringify({
                success: true,
                message: 'Agent is alive!',
                roomId: this.state.roomId,
                members: Object.keys(this.state.members),
                taskCount: Object.keys(this.state.tasks).length,
                workflowState: this.state.workflowState,
                fullState: this.state,
            }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Handle HTTP POST requests (for demo scripts/testing)
        if (request.method === 'POST' && !request.headers.get('Upgrade')) {
            try {
                const body = await request.json();
                const { method, params = [] } = body;

                // Route to appropriate @callable method
                let result;
                switch (method) {
                    case 'join':
                        result = await this.join(params[0]);
                        break;
                    case 'addTask':
                        result = await this.addTask(params[0]);
                        break;
                    case 'vote':
                        result = await this.vote(params[0]);
                        break;
                    case 'updateConstraints':
                        result = await this.updateConstraints(params[0]);
                        break;
                    case 'generatePlan':
                        result = await this.generatePlan();
                        break;
                    case 'finalize':
                        result = await this.finalize();
                        break;
                    default:
                        return new Response(JSON.stringify({
                            error: `Unknown method: ${method}`,
                        }), {
                            status: 400,
                            headers: { 'Content-Type': 'application/json' },
                        });
                }

                return new Response(JSON.stringify(result), {
                    headers: { 'Content-Type': 'application/json' },
                });
            } catch (error) {
                console.error('HTTP POST error:', error);
                return new Response(JSON.stringify({
                    error: (error as Error).message,
                    stack: (error as Error).stack,
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        }

        // For WebSocket upgrades and SDK routing, return undefined
        return undefined as any;
    }

    // ===== CALLABLE METHODS (RPC from frontend) =====

    @callable()
    async join(input: JoinInput) {
        const { name } = input;

        if (!name || name.trim() === '') {
            throw new Error('Name is required');
        }

        const member: Member = {
            name: name.trim(),
            joinedAt: Date.now(),
        };

        this.setState({
            ...this.state,
            members: {
                ...this.state.members,
                [name.trim()]: member,
            },
        });

        return { success: true, member };
    }

    @callable()
    async addTask(input: TaskInput) {
        if (this.state.workflowState === 'FINALIZED') {
            throw new Error('Room is finalized, cannot add tasks');
        }

        const { title, effort, impact, tags, notes, createdBy } = input;

        if (!title || effort < 1 || effort > 30 || impact < 1 || impact > 10) {
            throw new Error('Invalid task data: title required, effort must be 1-30, impact must be 1-10');
        }

        const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const task: Task = {
            id: taskId,
            title: title.trim(),
            effort,
            impact,
            tags: tags || [],
            notes: notes || '',
            votes: 0,
            createdAt: Date.now(),
            createdBy,
        };

        this.setState({
            ...this.state,
            tasks: {
                ...this.state.tasks,
                [taskId]: task,
            },
        });

        return { success: true, task };
    }

    @callable()
    async vote(input: VoteInput) {
        const { taskId } = input;

        if (!this.state.tasks[taskId]) {
            throw new Error('Task not found');
        }

        const updatedTask = {
            ...this.state.tasks[taskId],
            votes: this.state.tasks[taskId].votes + 1,
        };

        this.setState({
            ...this.state,
            tasks: {
                ...this.state.tasks,
                [taskId]: updatedTask,
            },
        });

        return { success: true };
    }

    @callable()
    async updateConstraints(constraints: Constraints) {
        if (this.state.workflowState === 'FINALIZED') {
            throw new Error('Room is finalized, cannot update constraints');
        }

        this.setState({
            ...this.state,
            constraints,
        });

        return { success: true };
    }

    @callable()
    async generatePlan() {
        if (this.state.workflowState === 'FINALIZED') {
            throw new Error('Room is finalized, cannot generate new plans');
        }

        const tasks = Object.values(this.state.tasks);
        const constraints = this.state.constraints;

        if (tasks.length === 0) {
            throw new Error('No tasks to plan. Add some tasks first!');
        }

        const prompt = this.buildPrompt(tasks, constraints);

        try {
            console.log('🤖 Calling Workers AI...');
            const response = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
                messages: [
                    {
                        role: 'system',
                        content: 'You are a sprint planning assistant. You MUST respond with valid JSON only, no other text.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                max_tokens: 2048,
                temperature: 0.7,
            });

            // DEBUG: Log the raw response
            console.log('📦 Raw AI response type:', typeof response);
            console.log('📦 Raw AI response:', JSON.stringify(response, null, 2));

            // Workers AI returns: { response: {actual plan object}, tool_calls: [], usage: {} }
            const respObj = response as any;

            let plan: GeneratedPlan;

            if (respObj.response && typeof respObj.response === 'object') {
                // AI already returned parsed object!
                console.log('✅ Using AI response object directly');
                plan = respObj.response as GeneratedPlan;
            } else if (typeof respObj.response === 'string') {
                // AI returned string, need to parse
                console.log('✅ Parsing AI response string');
                plan = this.parseAIResponse(respObj.response);
            } else {
                console.error('❌ Unexpected response structure:', Object.keys(respObj));
                throw new Error('Could not extract plan from AI response');
            }

            const version: PlanVersion = {
                version: this.state.planVersions.length + 1,
                plan,
                generatedAt: Date.now(),
                inputSnapshot: {
                    tasks: [...tasks],
                    constraints: { ...constraints },
                },
            };

            this.setState({
                ...this.state,
                planVersions: [...this.state.planVersions, version],
                currentPlanVersion: version.version,
                workflowState: 'GENERATED',
            });

            return { success: true, plan, version: version.version };
        } catch (error) {
            console.error('❌ AI generation error:', error);
            throw new Error('Failed to generate plan: ' + (error as Error).message);
        }
    }

    @callable()
    async finalize() {
        if (this.state.workflowState !== 'GENERATED') {
            throw new Error('Must generate a plan before finalizing');
        }

        this.setState({
            ...this.state,
            workflowState: 'FINALIZED',
        });

        return { success: true };
    }

    // ===== PRIVATE HELPER METHODS =====

    private buildPrompt(tasks: Task[], constraints: Constraints): string {
        const tasksJson = JSON.stringify(tasks, null, 2);
        const constraintsJson = JSON.stringify(constraints, null, 2);

        return `You are a sprint planning expert. Given these tasks and constraints, create an optimal sprint plan.

TASKS:
${tasksJson}

CONSTRAINTS:
${constraintsJson}

Create a sprint plan that:
1. Prioritizes tasks by value (impact × effort ratio, votes, and business value)
2. Fits within the capacity (${constraints.capacityPoints} story points)
3. Considers the sprint length (${constraints.sprintLengthDays} days)
4. Balances quick wins with high-impact work

Respond with ONLY valid JSON in this EXACT format (no markdown, no extra text):
{
  "orderedBacklog": [
    {
      "taskId": "task_xxx",
      "title": "Task title",
      "reason": "Brief explanation why this task is prioritized here"
    }
  ],
  "excluded": [
    {
      "taskId": "task_yyy",
      "title": "Task title",
      "reason": "Brief explanation why this task is excluded"
    }
  ],
  "risks": ["Risk 1", "Risk 2"],
  "assumptions": ["Assumption 1", "Assumption 2"],
  "summary": "Brief summary of the sprint plan strategy"
}`;
    }

    private parseAIResponse(aiText: string): GeneratedPlan {
        let cleaned = aiText.trim();
        cleaned = cleaned.replace(/^```json\n/, '').replace(/\n```$/, '');
        cleaned = cleaned.replace(/^```\n/, '').replace(/\n```$/, '');

        try {
            const parsed = JSON.parse(cleaned);

            if (!parsed.orderedBacklog || !Array.isArray(parsed.orderedBacklog)) {
                throw new Error('Invalid plan format: missing orderedBacklog');
            }
            if (!parsed.excluded || !Array.isArray(parsed.excluded)) {
                throw new Error('Invalid plan format: missing excluded');
            }
            if (!parsed.risks || !Array.isArray(parsed.risks)) {
                throw new Error('Invalid plan format: missing risks');
            }
            if (!parsed.assumptions || !Array.isArray(parsed.assumptions)) {
                throw new Error('Invalid plan format: missing assumptions');
            }
            if (!parsed.summary || typeof parsed.summary !== 'string') {
                throw new Error('Invalid plan format: missing summary');
            }

            return parsed as GeneratedPlan;
        } catch (error) {
            console.error('Failed to parse AI response:', aiText);
            throw new Error('AI returned invalid JSON: ' + (error as Error).message);
        }
    }
}