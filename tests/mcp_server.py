
import sys
import json
import logging

# Simple MCP Server that echoes input
# Implements basic handshake and one tool: "echo"

logging.basicConfig(stream=sys.stderr, level=logging.INFO)
logger = logging.getLogger("echo-server")

def handle_request(req):
    req_id = req.get("id")
    method = req.get("method")
    params = req.get("params", {})
    
    response = {
        "jsonrpc": "2.0",
        "id": req_id
    }
    
    if method == "initialize":
        response["result"] = {
            "protocolVersion": "0.1.0",
            "capabilities": {
                "tools": {}
            },
            "serverInfo": {
                "name": "echo-server",
                "version": "1.0.0"
            }
        }
    elif method == "notifications/initialized":
        # No response needed for notification
        return None
    elif method == "tools/list":
        response["result"] = {
            "tools": [
                {
                    "name": "echo",
                    "description": "Echo back the input",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "message": {"type": "string"}
                        }
                    }
                }
            ]
        }
    elif method == "tools/call":
        name = params.get("name")
        args = params.get("arguments", {})
        if name == "echo":
            response["result"] = {
                "content": [
                    {
                        "type": "text",
                        "text": f"Echo: {args.get('message', '')}"
                    }
                ]
            }
        else:
            response["error"] = {"code": -32601, "message": "Method not found"}
    else:
        # Ignore other methods for simplicity
        return None
        
    return response

def main():
    logger.info("Starting Echo Server...")
    for line in sys.stdin:
        try:
            line = line.strip()
            if not line:
                continue
                
            req = json.loads(line)
            resp = handle_request(req)
            
            if resp:
                print(json.dumps(resp))
                sys.stdout.flush()
                
        except Exception as e:
            logger.error(f"Error processing line: {e}")

if __name__ == "__main__":
    main()
