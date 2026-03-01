-- Copy and paste this entire block into the Neon SQL Editor and run it.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS h2h_films (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id     INTEGER       NOT NULL,
  title       TEXT          NOT NULL,
  year        SMALLINT,
  poster_path TEXT,
  genre_ids   INTEGER[]     NOT NULL DEFAULT '{}',
  elo_rating  NUMERIC(8,2)  NOT NULL DEFAULT 1000.00,
  vote_count  INTEGER       NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT h2h_films_tmdb_id_unique UNIQUE (tmdb_id),
  CONSTRAINT h2h_films_elo_rating_positive CHECK (elo_rating > 0),
  CONSTRAINT h2h_films_vote_count_non_negative CHECK (vote_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_h2h_films_elo_rating ON h2h_films (elo_rating DESC);

CREATE TABLE IF NOT EXISTS h2h_matchups (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  film_a_id   UUID          NOT NULL REFERENCES h2h_films(id),
  film_b_id   UUID          NOT NULL REFERENCES h2h_films(id),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT h2h_matchups_no_self_pair CHECK (film_a_id <> film_b_id),
  CONSTRAINT h2h_matchups_ordered_pair_unique UNIQUE (film_a_id, film_b_id)
);

CREATE INDEX IF NOT EXISTS idx_h2h_matchups_film_b_id ON h2h_matchups (film_b_id);

CREATE TABLE IF NOT EXISTS h2h_matchup_votes (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  matchup_id  UUID          NOT NULL REFERENCES h2h_matchups(id) ON DELETE CASCADE,
  user_id     TEXT          NOT NULL,
  winner_id   UUID          NOT NULL REFERENCES h2h_films(id),
  voted_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT h2h_matchup_votes_one_per_user UNIQUE (matchup_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_h2h_matchup_votes_user_id ON h2h_matchup_votes (user_id);

INSERT INTO h2h_films (tmdb_id, title, year, poster_path)
VALUES
  (550,    'Fight Club',                                       1999, '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg'),
  (680,    'Pulp Fiction',                                     1994, '/vQWk5YBFWF4bZaofAbv0tShwBvQ.jpg'),
  (238,    'The Godfather',                                    1972, '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg'),
  (155,    'The Dark Knight',                                  2008, '/qJ2tW6WMUDux911r6m7haRef0WH.jpg'),
  (278,    'The Shawshank Redemption',                         1994, '/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg'),
  (13,     'Forrest Gump',                                     1994, '/saHP97rTPS5eLmrLQEcANmKrsFl.jpg'),
  (120,    'The Lord of the Rings: The Fellowship of the Ring', 2001, '/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg'),
  (603,    'The Matrix',                                       1999, '/p96dm7sCMn4VYAStA6siNz30G1r.jpg'),
  (27205,  'Inception',                                        2010, '/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg'),
  (244786, 'Whiplash',                                         2014, '/7fn624j5lj3xTme2SgiLCeuedmO.jpg'),
  (569094, 'Spider-Man: Across the Spider-Verse',              2023, '/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg'),
  (346698, 'Barbie',                                           2023, '/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg'),
  (872585, 'Oppenheimer',                                      2023, '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg'),
  (122,    'The Lord of the Rings: The Return of the King',    2003, '/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg'),
  (497,    'The Green Mile',                                   1999, '/8VG8fDNiy50H4FedGwdSVUPoaJe.jpg'),
  (769,    'GoodFellas',                                       1990, '/9OkCLM73MIU2CrKZbqiT8Ln1wY2.jpg')
ON CONFLICT (tmdb_id) DO UPDATE SET
  poster_path = EXCLUDED.poster_path,
  updated_at = now();

INSERT INTO h2h_matchups (film_a_id, film_b_id)
SELECT a.id, b.id
FROM h2h_films a
JOIN h2h_films b ON a.id < b.id
ON CONFLICT (film_a_id, film_b_id) DO NOTHING;

SELECT 'h2h_films' AS "table", count(*) AS rows FROM h2h_films
UNION ALL
SELECT 'h2h_matchups', count(*) FROM h2h_matchups
UNION ALL
SELECT 'h2h_matchup_votes', count(*) FROM h2h_matchup_votes;
