from typing import AsyncGenerator, Dict, Any

from llm.gemini import GeminiClient


MAX_ITERATIONS = 3


class AgentOrchestrator:
    """
    Simple ReAct-style agent orchestrator.
    
    Flow:
    1. Send user message to Gemini
    2. Stream response chunks to client
    
    TODO: Add tool support once basic chat works
    """
    
    def __init__(self):
        self.client = GeminiClient()
        # Tools disabled for now - basic chat first
        # self.client.setTools(TOOL_FUNCTIONS)
    
    async def run(self, user_message: str) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Process a user message and yield response events.
        
        Yields:
        - {"type": "chunk", "content": "..."}
        - {"type": "error", "content": "..."}
        """
        # Stream response from Gemini
        async for event in self.client.generateStream(user_message):
            yield event
