import { SprintPlanningAgent } from './agent';
import { routeAgentRequest } from 'agents';
import type { Env } from './types';

export { SprintPlanningAgent };

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        // Add CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': '*',
        };

        // Handle preflight requests
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Use the official Cloudflare routing
        const agentResponse = await routeAgentRequest(request, env);

        if (agentResponse) {
            // Add CORS headers to agent response
            const headers = new Headers(agentResponse.headers);
            Object.entries(corsHeaders).forEach(([key, value]) => {
                headers.set(key, value);
            });

            return new Response(agentResponse.body, {
                status: agentResponse.status,
                statusText: agentResponse.statusText,
                headers,
            });
        }

        // Fallback for non-agent routes (e.g., serving the frontend)
        return new Response('Sprint Planning Agent - Visit the frontend app', {
            status: 404,
            headers: { 'Content-Type': 'text/plain', ...corsHeaders },
        });
    },
};