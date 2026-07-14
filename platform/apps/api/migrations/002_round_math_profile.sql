ALTER TABLE game_rounds ADD COLUMN math_profile_id text;
ALTER TABLE game_rounds ADD COLUMN math_version integer;

UPDATE game_rounds SET math_profile_id = CASE game_id
  WHEN 'slots-classic' THEN 'classic-base'
  WHEN 'crash' THEN 'crash-base'
  WHEN 'plinko' THEN 'plinko-base'
  WHEN 'roulette' THEN 'roulette-european'
  WHEN 'keno' THEN 'keno-base'
  ELSE 'legacy-unknown'
END, math_version = 1;

ALTER TABLE game_rounds ALTER COLUMN math_profile_id SET NOT NULL;
ALTER TABLE game_rounds ALTER COLUMN math_version SET NOT NULL;
ALTER TABLE game_rounds ADD CONSTRAINT game_round_math_version_positive CHECK(math_version > 0);

CREATE INDEX rounds_math_profile ON game_rounds(game_id, math_profile_id, math_version);
