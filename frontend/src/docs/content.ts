
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
- **Extensions**: A powerful plugin system using the **Model Context Protocol (MCP)**.

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

## Configuration
Sagentic needs access to a Postgres database. By default, the docker-compose file sets up a local Postgres instance.

Environment Variables (\`.env\`):
\`\`\`env
DATABASE_URL=postgresql://user:password@db:5432/sagentic
LOG_LEVEL=INFO
\`\`\`
`;

const LANGGRAPH_CONTENT = `
# LangGraph Integration

Sagentic includes first-class support for **LangGraph**. We provide a custom checkpointer / callback handler (coming soon) or a simple way to instrument your nodes.

## Instrumentation
To send traces to Sagentic, you can use our simple REST API or the Python SDK.

### Using Python Requests
\`\`\`python
import requests
import uuid

RUN_ID = str(uuid.uuid4())
SAGENTIC_API = "http://localhost:8000/api"

# 1. Create a Run
requests.post(f"{SAGENTIC_API}/runs", json={
    "id": RUN_ID,
    "graph_id": "research-agent",
    "input_state": {"query": "Quantum Computing"}
})

# 2. Log a Step
requests.post(f"{SAGENTIC_API}/runs/{RUN_ID}/nodes", json={
    "node_key": "search_tool",
    "node_type": "tool",
    "status": "completed",
    "latency_ms": 450,
    "start_time": "2023-10-27T10:00:00Z"
})
\`\`\`

## Automatic Instrumentation
*Coming soon: \`SagenticCallbackHandler\` for LangChain/LangGraph.*
`;

const MCP_CONTENT = `
# Model Context Protocol (MCP)

Sagentic leverages the **Model Context Protocol (MCP)** to allow you to build powerful extensions.

## What is MCP?
MCP is a standard for connecting AI models to external data and tools. In Sagentic, **Extensions** are essentially MCP Servers. Sagentic acts as the MCP Client.

## Creating an Extension
1. Create a \`manifest.json\`
2. Build a backend (Python/Node) that speaks MCP (stdio or SSE).
3. Zip it up and upload it in the Extensions UI.

### Manifest Example
\`\`\`json
{
  "id": "my-weather-extension",
  "name": "Weather Tools",
  "version": "1.0.0",
  "backend_entry": "main.py",
  "capabilities": ["tools", "resources"]
}
\`\`\`
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
            { id: "autogen", title: "AutoGen", content: "# AutoGen Support\\n\\n*Coming soon.*" },
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
