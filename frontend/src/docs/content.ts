
export interface DocSection {
    id: string;
    title: string;
    items: DocItem[];
}

export interface DocItem {
    id: string;
    title: string;
    content: string;
}

const INTRO_CONTENT = `
# Sagentic
**The Agentic Application Platform for Engineers.**

Sagentic is a developer-first platform designed to observe, debug, and manage your agentic workflows. Whether you are building with LangGraph, AutoGen, or custom Python scripts, Sagentic provides the visibility you need.

## Core Features
- **Observability**: detailed traces of every step in your agent's execution.
- **Visual Graph**: Interactive node-link diagram of your agent's workflow.
- **Analytics**: Cost, latency, and token usage metrics.
- **MCP Server**: Sagentic acts as an MCP Server, providing tools for your agents to log themselves.

## Why Sagentic?
Building agents is hard. Debugging them is harder. Sagentic gives you the "X-Ray vision" to understand why your agent got stuck in a loop or why it hallucinated a response.
`;

const GETTING_STARTED_CONTENT = `
# Getting Started

## Installation
Sagentic is distributed as a Docker container for easy deployment.

\`\`\`bash
# Clone the repository
git clone https://github.com/jaredpilcher/sagentic.git
cd sagentic

# Start the platform
docker-compose up -d
\`\`\`

Once running, access the dashboard at:
- **UI**: [http://localhost:3000](http://localhost:3000)
- **API**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **MCP Endpoint**: [http://localhost:8000/api/mcp/sse](http://localhost:8000/api/mcp/sse)

## Configuration
Sagentic needs access to a Postgres database. By default, the docker-compose file sets up a local Postgres instance.

Environment Variables (\`.env\`):
\`\`\`env
DATABASE_URL=postgresql://user:password@db:5432/sagentic
LOG_LEVEL=INFO
\`\`\`
`;

const MCP_CONTENT = `
# Model Context Protocol (MCP)

Sagentic acts as an **MCP Server**, exposing tools that allow your agents to self-register and log their execution steps automatically.

## Connection
Connect your MCP Client (Agent) to the Sagentic SSE Endpoint:
**URL**: \`http://localhost:8000/api/mcp/sse\`

## Exposed Tools
When connected, Sagentic exposes the following tools to your agent:

### \`start_run\`
Start tracking a new execution run.
- **Arguments**:
  - \`graph_id\` (string): Unique identifier for your agent graph/type.
  - \`input_state\` (object): Initial input dictionary.
- **Returns**: \`run_id\` (string)

### \`log_step\`
Log the execution of a single node or step.
- **Arguments**:
  - \`run_id\` (string): The ID returned by \`start_run\`.
  - \`node_name\` (string): Name of the step/node executed.
  - \`output\` (object): State/Output of the step.
`;

const LANGGRAPH_CONTENT = `
# LangGraph Integration

Sagentic makes it **easy** to integrate with LangGraph using our "Plug and Play" tracer.

## The SagenticTracer Adapter
We provide a ready-to-use adapter that acts as a bridge between LangGraph and Sagentic. It automatically logs your agent's runs and steps.

### Setup
1. Copy the \`sagentic_tracer.py\` file from \`examples/langgraph_demo/\` into your project.
2. Initialize and attach the tracer:

\`\`\`python
from sagentic_tracer import SagenticTracer

# 1. Initialize
tracer = SagenticTracer(
    base_url="http://localhost:8000/api/mcp",
    graph_id="my-agent"
)

# 2. Run with Tracer
graph.invoke(inputs, config={"callbacks": [tracer]})
\`\`\`

That's it! Your agent runs will now appear in the Sagentic dashboard.
`;

export const DOCS_NAV: DocSection[] = [
    {
        id: "overview",
        title: "Overview",
        items: [
            { id: "intro", title: "Introduction", content: INTRO_CONTENT },
            { id: "getting-started", title: "Getting Started", content: GETTING_STARTED_CONTENT },
        ]
    },
    {
        id: "guides",
        title: "Integration Guides",
        items: [
            { id: "langgraph", title: "LangGraph", content: LANGGRAPH_CONTENT },
        ]
    },
    {
        id: "reference",
        title: "Reference",
        items: [
            { id: "mcp", title: "MCP Protocol", content: MCP_CONTENT },
            { id: "api", title: "API Reference", content: "# API Reference\\n\\nSee Swagger UI at /api/docs" },
        ]
    }
];

export function getDocContent(slug: string): string | undefined {
    for (const section of DOCS_NAV) {
        const item = section.items.find(i => i.id === slug);
        if (item) return item.content;
    }
    return undefined;
}
