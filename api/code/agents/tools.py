from datetime import datetime
from typing import Dict, Any, Callable


def getCurrentTime() -> str:
    """Returns the current server time in ISO format. Use this when the user asks about the current time or date."""
    return datetime.now().isoformat()


# List of tool functions for Gemini
TOOL_FUNCTIONS = [getCurrentTime]


# Registry mapping tool names to their execution functions
TOOL_REGISTRY: Dict[str, Callable[..., str]] = {
    "getCurrentTime": getCurrentTime
}


def executeTool(tool_name: str, args: Dict[str, Any]) -> str:
    """
    Execute a tool by name with the given arguments.
    
    Returns the tool result as a string.
    """
    if tool_name not in TOOL_REGISTRY:
        return f"Error: Unknown tool '{tool_name}'"
    
    try:
        return TOOL_REGISTRY[tool_name](**args)
    except Exception as e:
        return f"Error executing {tool_name}: {str(e)}"
