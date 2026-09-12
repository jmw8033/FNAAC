CREATE TABLE profiles (
 id TEXT PRIMARY KEY,
 token_hash TEXT NOT NULL UNIQUE,
 name TEXT NOT NULL,
 kills INTEGER NOT NULL DEFAULT 0 CHECK(kills >= 0),
 deaths INTEGER NOT NULL DEFAULT 0 CHECK(deaths >= 0),
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
) STRICT;
CREATE TABLE kill_events (
 id TEXT PRIMARY KEY,
 attacker_id TEXT NOT NULL REFERENCES profiles(id),
 victim_id TEXT NOT NULL REFERENCES profiles(id),
 created_at INTEGER NOT NULL,
 CHECK(attacker_id <> victim_id)
) STRICT;
