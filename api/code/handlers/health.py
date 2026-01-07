import json
import tornado.web

from health.checks import runAllChecks


class HealthHandler(tornado.web.RequestHandler):
    """Health check endpoint."""
    
    def set_default_headers(self):
        # CORS headers for frontend access
        self.set_header("Access-Control-Allow-Origin", "*")
        self.set_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.set_header("Access-Control-Allow-Headers", "Content-Type")
    
    def options(self):
        self.set_status(204)
        self.finish()
    
    def get(self):
        result = runAllChecks()
        self.set_header("Content-Type", "application/json")
        self.set_status(200)
        self.write(json.dumps(result))

