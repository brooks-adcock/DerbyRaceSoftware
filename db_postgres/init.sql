-- Initialize races table
CREATE TABLE IF NOT EXISTS races (
    id VARCHAR(64) PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
    name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE
);
