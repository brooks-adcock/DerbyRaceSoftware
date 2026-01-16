import json
import os
import psycopg
import tornado.web
from psycopg.rows import dict_row

class RacesHandler(tornado.web.RequestHandler):
    """Races API endpoint."""
    
    def set_default_headers(self):
        # CORS headers for frontend access
        self.set_header("Access-Control-Allow-Origin", "*")
        self.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.set_header("Access-Control-Allow-Headers", "Content-Type")
    
    def options(self):
        self.set_status(204)
        self.finish()
    
    async def get(self):
        database_url = os.environ.get("DATABASE_URL", "")
        try:
            async with await psycopg.AsyncConnection.connect(database_url, row_factory=dict_row) as connection:
                async with connection.cursor() as cursor:
                    # Ensure table exists (in case init.sql didn't run)
                    await cursor.execute("""
                        CREATE TABLE IF NOT EXISTS races (
                            id VARCHAR(64) PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
                            name TEXT NOT NULL,
                            date DATE NOT NULL DEFAULT CURRENT_DATE
                        )
                    """)
                    await cursor.execute("SELECT id, name, date FROM races ORDER BY date DESC")
                    races = await cursor.fetchall()
                    
                    # Convert date objects to strings for JSON serialization
                    for race in races:
                        if race.get("date"):
                            race["date"] = race["date"].isoformat()
                            
                    self.set_header("Content-Type", "application/json")
                    self.set_status(200)
                    self.write(json.dumps(races))
        except Exception as e:
            self.set_status(500)
            self.write(json.dumps({"error": str(e)}))

    async def post(self):
        database_url = os.environ.get("DATABASE_URL", "")
        try:
            body = json.loads(self.request.body)
            race_name = body.get("name")
            race_date = body.get("date") # Optional, defaults to CURRENT_DATE in DB
            
            if not race_name:
                self.set_status(400)
                self.write(json.dumps({"error": "Name is required"}))
                return

            async with await psycopg.AsyncConnection.connect(database_url, row_factory=dict_row) as connection:
                async with connection.cursor() as cursor:
                    # Ensure table exists
                    await cursor.execute("""
                        CREATE TABLE IF NOT EXISTS races (
                            id VARCHAR(64) PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
                            name TEXT NOT NULL,
                            date DATE NOT NULL DEFAULT CURRENT_DATE
                        )
                    """)
                    if race_date:
                        await cursor.execute(
                            "INSERT INTO races (name, date) VALUES (%s, %s) RETURNING id, name, date",
                            (race_name, race_date)
                        )
                    else:
                        await cursor.execute(
                            "INSERT INTO races (name) VALUES (%s) RETURNING id, name, date",
                            (race_name,)
                        )
                    
                    new_race = await cursor.fetchone()
                    await connection.commit()
                    
                    if new_race and new_race.get("date"):
                        new_race["date"] = new_race["date"].isoformat()
                    
                    self.set_header("Content-Type", "application/json")
                    self.set_status(201)
                    self.write(json.dumps(new_race))
        except Exception as e:
            self.set_status(500)
            self.write(json.dumps({"error": str(e)}))
