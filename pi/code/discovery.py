"""Zeroconf/mDNS service discovery for automatic network detection."""

import socket
from zeroconf import ServiceInfo
from zeroconf.asyncio import AsyncZeroconf

# Constants
SERVICE_TYPE = "_track-api._tcp.local."
SERVICE_NAME = "Pinewood Derby Track Controller._track-api._tcp.local."

_zeroconf: AsyncZeroconf = None
_service_info: ServiceInfo = None


def getLocalIp() -> str:
    """Get the local IP address of this machine."""
    try:
        # Create a socket to determine local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


async def registerService(num_tracks: int, port: int = 8000):
    """Register the track controller service for network discovery."""
    global _zeroconf, _service_info
    
    local_ip = getLocalIp()
    
    _service_info = ServiceInfo(
        SERVICE_TYPE,
        SERVICE_NAME,
        addresses=[socket.inet_aton(local_ip)],
        port=port,
        properties={
            "num_tracks": str(num_tracks),
            "version": "1.0.0",
        },
        server="track-controller.local.",
    )
    
    try:
        _zeroconf = AsyncZeroconf()
        await _zeroconf.async_register_service(_service_info)
        print(f"Registered mDNS service: {SERVICE_NAME} at {local_ip}:{port}")
    except Exception as e:
        print(f"Warning: mDNS registration failed (non-fatal): {e}")
        _zeroconf = None


async def unregisterService():
    """Unregister the service on shutdown."""
    global _zeroconf, _service_info
    
    if _zeroconf and _service_info:
        try:
            await _zeroconf.async_unregister_service(_service_info)
            await _zeroconf.async_close()
            print("Unregistered mDNS service")
        except Exception as e:
            print(f"Warning: mDNS unregister failed: {e}")
