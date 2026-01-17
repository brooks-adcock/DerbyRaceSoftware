"""Pydantic models for the Track Controller API."""

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class HeatSetup(BaseModel):
    """Configuration for starting a race heat."""
    heat_id: str
    occupied_lanes: List[int]


class LaneResult(BaseModel):
    """Result for a single lane in a heat."""
    lane_number: int
    finish_time_ms: Optional[float] = None  # None if lane was unoccupied or DNF
    place: Optional[int] = None
    is_dnf: bool = False


class HeatResult(BaseModel):
    """Complete result for a heat."""
    heat_id: str
    started_at: datetime
    finished_at: Optional[datetime] = None
    lane_results: List[LaneResult]
    is_complete: bool = False


class GatePosition(BaseModel):
    """Request to set gate position."""
    is_down: bool


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    num_tracks: int
    is_gate_down: bool
    current_heat_id: Optional[str] = None
