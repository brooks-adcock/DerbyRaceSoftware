"""JSON file-based storage for heat history."""

import json
import os
from typing import List, Optional
from datetime import datetime

# Constants
HISTORY_FILE = "heat_history.json"
MAX_HISTORY = 1000


class HistoryManager:
    """Manages persistent storage of heat results."""
    
    def __init__(self, file_path: str = HISTORY_FILE):
        self.file_path = file_path
        self.heats = self._loadHistory()
    
    def _loadHistory(self) -> list:
        """Load history from disk."""
        if os.path.exists(self.file_path):
            try:
                with open(self.file_path, "r") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                # Corrupted file, start fresh but back up the old one
                backup_path = f"{self.file_path}.backup.{int(datetime.now().timestamp())}"
                os.rename(self.file_path, backup_path)
                return []
        return []
    
    def _saveHistory(self):
        """Persist history to disk."""
        # Write to temp file first, then rename for atomicity
        temp_path = f"{self.file_path}.tmp"
        with open(temp_path, "w") as f:
            json.dump(self.heats, f, indent=2, default=str)
        os.replace(temp_path, self.file_path)
    
    def saveHeat(self, heat_result: dict):
        """Save a heat result, maintaining max history limit."""
        # Remove existing entry with same heat_id if present (update case)
        self.heats = [h for h in self.heats if h.get("heat_id") != heat_result.get("heat_id")]
        
        # Insert at beginning (most recent first)
        self.heats.insert(0, heat_result)
        
        # Trim to max history
        self.heats = self.heats[:MAX_HISTORY]
        
        # Persist to disk
        self._saveHistory()
    
    def getHeats(self, limit: int = 100) -> list:
        """Get most recent heats."""
        return self.heats[:limit]
    
    def getHeatById(self, heat_id: str) -> Optional[dict]:
        """Get a specific heat by ID."""
        for heat in self.heats:
            if heat.get("heat_id") == heat_id:
                return heat
        return None
    
    def getLastHeat(self) -> Optional[dict]:
        """Get the most recent heat."""
        return self.heats[0] if self.heats else None
