import os
from typing import AsyncGenerator, List, Dict, Any

from google import genai
from google.genai import types


# Create client with API key
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", ""))

# Default model
DEFAULT_MODEL = "gemini-2.0-flash"


class GeminiClient:
    """Wrapper for Google Gemini API with streaming support."""
    
    def __init__(self, model_name: str = DEFAULT_MODEL):
        self.model_name = model_name
        self.chat_history: List[types.Content] = []
    
    async def generateStream(
        self,
        message: str,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Generate a streaming response from Gemini.
        
        Yields events:
        - {"type": "chunk", "content": "..."}
        """
        try:
            # Build contents with history
            contents = self.chat_history + [
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=message)]
                )
            ]
            
            # Stream response using async client
            full_text = ""
            response = await client.aio.models.generate_content_stream(
                model=self.model_name,
                contents=contents,
            )
            
            async for chunk in response:
                if chunk.text:
                    full_text += chunk.text
                    yield {
                        "type": "chunk",
                        "content": chunk.text
                    }
            
            # Update history
            self.chat_history.append(
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=message)]
                )
            )
            self.chat_history.append(
                types.Content(
                    role="model",
                    parts=[types.Part.from_text(text=full_text)]
                )
            )
            
        except Exception as e:
            yield {
                "type": "error",
                "content": f"Gemini API error: {str(e)}"
            }
    
    def clearHistory(self):
        """Clear the conversation history."""
        self.chat_history = []
