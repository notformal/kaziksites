ALTER TABLE game_rounds
  ADD CONSTRAINT game_rounds_state_shape CHECK (
    (
      status = 'open'
      AND outcome IS NULL
      AND multiplier_milli IS NULL
      AND win IS NULL
      AND settled_at IS NULL
    )
    OR
    (
      status = 'settled'
      AND outcome IS NOT NULL
      AND multiplier_milli IS NOT NULL
      AND multiplier_milli >= 0
      AND win IS NOT NULL
      AND win >= 0
      AND settled_at IS NOT NULL
    )
  );
