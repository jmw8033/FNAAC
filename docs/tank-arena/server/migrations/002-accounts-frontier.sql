CREATE TABLE accounts (
 profile_id TEXT PRIMARY KEY REFERENCES profiles(id),
 username TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL,
 recovery_hash TEXT NOT NULL UNIQUE,
 created_at INTEGER NOT NULL
) STRICT;
CREATE TABLE sessions (
 token_hash TEXT PRIMARY KEY,
 profile_id TEXT NOT NULL REFERENCES accounts(profile_id),
 expires_at INTEGER NOT NULL,
 last_seen INTEGER NOT NULL
) STRICT;
CREATE INDEX idx_sessions_profile ON sessions(profile_id);
CREATE TABLE characters (
 profile_id TEXT PRIMARY KEY REFERENCES accounts(profile_id),
 state_json TEXT NOT NULL,
 updated_at INTEGER NOT NULL
) STRICT;
CREATE TABLE world_state (id INTEGER PRIMARY KEY CHECK(id=1),state_json TEXT NOT NULL) STRICT;
