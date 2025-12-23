import os
from typing import Dict, Any, List


def checkGeminiKey() -> Dict[str, Any]:
    """Check if GEMINI_API_KEY environment variable is set."""
    api_key = os.environ.get("GEMINI_API_KEY", "")
    is_ok = bool(api_key and api_key.strip())
    
    return {
        "id": "gemini_key",
        "label": "Gemini API Key",
        "is_ok": is_ok,
        "message": "Configured" if is_ok else "GEMINI_API_KEY environment variable not set",
        "help_url": "/.helper/gemini_setup.md"
    }


def runAllChecks() -> Dict[str, Any]:
    """Run all health checks and return aggregated status."""
    checks: List[Dict[str, Any]] = [
        checkGeminiKey(),
    ]
    
    is_healthy = all(check["is_ok"] for check in checks)
    
    return {
        "is_healthy": is_healthy,
        "checks": checks
    }

