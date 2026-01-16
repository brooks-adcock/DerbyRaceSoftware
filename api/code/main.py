import tornado.ioloop
import tornado.web
import tornado.websocket
import os

from handlers.chat_ws import ChatWebSocketHandler
from handlers.health import HealthHandler
from handlers.races import RacesHandler


def makeApp():
    return tornado.web.Application([
        (r"/ws/chat", ChatWebSocketHandler),
        (r"/api/health", HealthHandler),
        (r"/v1/health", HealthHandler),
        (r"/api/races", RacesHandler),
    ], debug=True)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8888))
    app = makeApp()
    app.listen(port)
    print(f"Tornado server running on port {port}")
    tornado.ioloop.IOLoop.current().start()

