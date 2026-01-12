import os
import psycopg
from typing import Dict, Any, List


def checkDatabase() -> Dict[str, Any]:
    """Check if the database is reachable and queryable."""
    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        return {
            "id": "database",
            "label": "Database Connection",
            "is_ok": False,
            "message": "DATABASE_URL environment variable not set",
        }

    try:
        # connect_timeout is in seconds
        with psycopg.connect(database_url, connect_timeout=2) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        return {
            "id": "database",
            "label": "Database Connection",
            "is_ok": True,
            "message": "Connected and queried successfully",
        }
    except Exception as e:
        return {
            "id": "database",
            "label": "Database Connection",
            "is_ok": False,
            "message": f"Connection failed: {str(e)}",
        }


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


def checkEnvironment() -> Dict[str, Any]:
    """Check for all required environment variables."""
    required_vars = ["GEMINI_API_KEY", "DATABASE_URL"]
    missing_vars = [var for var in required_vars if not os.environ.get(var)]
    is_ok = len(missing_vars) == 0
    
    return {
        "id": "env_vars",
        "label": "Environment Variables",
        "is_ok": is_ok,
        "message": "All required variables set" if is_ok else f"Missing: {', '.join(missing_vars)}",
        "help_url": "/.helper/gemini_setup.md"
    }


def runAllChecks() -> Dict[str, Any]:
    """Run all health checks and return aggregated status."""
    checks: List[Dict[str, Any]] = [
        checkEnvironment(),
        checkDatabase(),
        checkGeminiKey(),
    ]
    
    is_healthy = all(check["is_ok"] for check in checks)
    
    return {
        "is_healthy": is_healthy,
        "checks": checks
    }

