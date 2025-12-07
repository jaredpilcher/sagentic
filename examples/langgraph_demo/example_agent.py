
import os
import sys

# Ensure we can import the tracer (if running from examples root)
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from examples.langgraph_demo.sagentic_tracer import SagenticTracer

# 1. Define Tools
@tool
def multiply(a: int, b: int) -> int:
    """Multiplies two numbers."""
    return a * b

@tool
def add(a: int, b: int) -> int:
    """Adds two numbers."""
    return a + b

tools = [multiply, add]

# 2. Setup Agent
# Note: You need OPENAI_API_KEY env var set
model = ChatOpenAI(model="gpt-3.5-turbo")
graph = create_react_agent(model, tools)

# 3. Initialize Sagentic Tracer
# Ensure Sagentic is running on localhost:8000
tracer = SagenticTracer(graph_id="calculator-agent")

# 4. Run Agent with Tracer
def main():
    print("Running Agent with Sagentic Tracer...")
    try:
        inputs = {"messages": [("user", "What is 5 times 8 plus 3?")]}
        
        # Invoke with config callback
        result = graph.invoke(inputs, config={"callbacks": [tracer]})
        
        print("\nAgent Finished!")
        print(f"Result: {result['messages'][-1].content}")
        print("\nCheck http://localhost:3000 to see the trace!")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if not os.environ.get("OPENAI_API_KEY"):
        print("Please set OPENAI_API_KEY environment variable.")
    else:
        main()
