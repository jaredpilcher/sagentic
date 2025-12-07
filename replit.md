# Sagentic - LangGraph Observability Platform

## Overview
Sagentic is a lightweight, production-ready observability platform designed for LangGraph agent workflows. It provides comprehensive monitoring of agent executions, offering detailed insights into run metrics, performance, and state changes. The platform aims to streamline the development and debugging of LangGraph agents by centralizing trace data and offering advanced visualization tools.

## User Preferences
Not specified.

## System Architecture
Sagentic is built with a decoupled frontend and backend architecture.
- **Frontend**: A React, Vite, and TypeScript application provides a responsive user interface with a customizable dashboard, run detail pages, and agent management views. It leverages `react-grid-layout` for drag-and-drop widget customization.
- **Backend**: A Python FastAPI application serves as the core API, handling trace ingestion, data storage, and querying. It integrates with a PostgreSQL database for persistent storage and uses Alembic for database migrations.
- **MCP Server**: A JSON-RPC server facilitates direct integration with LangGraph, allowing agents to ingest traces and retrieve run information.

**Key Features:**
- **Trace Ingestion**: Supports upsert operations for `run_id`s, preserving timestamps and source ordering of node executions.
- **State Diff Visualization**: Displays added, removed, and modified keys between states in node executions.
- **Message Drill-down**: Detailed view of LLM messages, including model, tokens, cost, and latency.
- **Extension System**: A VS Code-style plugin architecture allows for custom functionality, including UI contributions (sidebar panels, dashboard widgets, run/agent actions, pages, modals) and backend API routes. Extensions are packaged as zip files with a `manifest.json` defining their contributions and permissions.
- **Agent-centric Observability**: Dedicated views for agents (`graph_id`) with aggregated statistics and filtered run histories.
- **Customizable Dashboard**: Users can add, remove, rearrange, and resize widgets. The dashboard supports built-in metrics and extension-contributed widgets, with layout persistence in local storage.
- **Responsive Design**: The UI adapts to various screen sizes (desktop, tablet, mobile).

**Data Model:**
- **Run**: Represents a workflow execution, tracking `graph_id`, `framework`, `status`, timestamps, and states.
- **NodeExecution**: Details individual node executions within a graph, including `state_in`, `state_out`, and `state_diff`.
- **Message**: Stores LLM interaction details like `role`, `content`, `model`, `tokens`, `cost`, and `latency`.
- **Edge**: Defines transitions between nodes, optionally with condition labels.
- **Evaluation**: Stores scores and feedback for runs or nodes.

## External Dependencies
- **PostgreSQL**: Primary database for all application data, managed via Alembic migrations. Utilizes Neon for cloud-hosted instances on Replit.
- **React**: Frontend UI library.
- **Vite**: Frontend build tool.
- **TypeScript**: Typed superset of JavaScript for frontend development.
- **FastAPI**: Python web framework for the backend API.
- **LangGraph**: The agent framework being observed.
- **Alembic**: Database migration tool for PostgreSQL.
- **react-grid-layout**: Library for customizable, draggable, and resizable grid layouts on the dashboard.