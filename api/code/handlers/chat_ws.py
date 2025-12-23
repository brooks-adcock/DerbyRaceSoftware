import json
import tornado.websocket

from agents.orchestrator import AgentOrchestrator


class ChatWebSocketHandler(tornado.websocket.WebSocketHandler):
    """WebSocket handler for chat messages."""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.orchestrator = AgentOrchestrator()
    
    def check_origin(self, origin):
        # Allow connections from any origin in development
        return True
    
    def open(self):
        print("WebSocket connection opened")
    
    async def on_message(self, message):
        try:
            data = json.loads(message)
            msg_type = data.get("type")
            
            if msg_type == "chat":
                content = data.get("content", "")
                await self.handleChatMessage(content)
            else:
                await self.sendError(f"Unknown message type: {msg_type}")
                
        except json.JSONDecodeError:
            await self.sendError("Invalid JSON")
        except Exception as e:
            await self.sendError(str(e))
    
    async def handleChatMessage(self, content: str):
        """Process a chat message through the agent and stream the response."""
        try:
            async for event in self.orchestrator.run(content):
                await self.write_message(json.dumps(event))
            
            await self.write_message(json.dumps({"type": "done"}))
            
        except Exception as e:
            await self.sendError(str(e))
    
    async def sendError(self, error_message: str):
        await self.write_message(json.dumps({
            "type": "error",
            "content": error_message
        }))
    
    def on_close(self):
        print("WebSocket connection closed")

