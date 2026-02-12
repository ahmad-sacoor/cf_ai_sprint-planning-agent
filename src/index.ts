import { SprintPlanningAgent } from './agent';
import { routeAgentRequest } from 'agents';
import type { Env } from './types';

export { SprintPlanningAgent };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Use the official Cloudflare routing
    const agentResponse = await routeAgentRequest(request, env);
    
    if (agentResponse) {
      return agentResponse;
    }

    // Fallback for non-agent routes (e.g., serving the frontend)
    return new Response('Sprint Planning Agent - Visit the frontend app', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};
