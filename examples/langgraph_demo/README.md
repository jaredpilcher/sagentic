
# Sagentic LangGraph Demo

This example shows how to use the "Plug and Play" `SagenticTracer` to automatically log your LangGraph agent execution to the Sagentic platform.

## Prerequisites
1.  **Sagentic Running**: `docker-compose up` (available at http://localhost:8000).
2.  **OpenAI API Key**: Set `OPENAI_API_KEY`.
3.  **Dependencies**: `pip install langgraph langchain-openai requests`

## Usage

1.  Copy `sagentic_tracer.py` into your project.
2.  Import `SagenticTracer`.
3.  Add it to your graph invocation:

```python
from sagentic_tracer import SagenticTracer

tracer = SagenticTracer(graph_id="my-agent")
graph.invoke(inputs, config={"callbacks": [tracer]})
```

## Running this Example

```bash
# From project root
export OPENAI_API_KEY=sk-...
python examples/langgraph_demo/example_agent.py
```
