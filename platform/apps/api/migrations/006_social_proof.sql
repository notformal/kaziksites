-- Read-optimized indexes for privacy-thresholded aggregate social activity.
CREATE INDEX rounds_settled_social ON game_rounds(settled_at DESC, user_id) WHERE status = 'settled';
CREATE INDEX rounds_settled_game_social ON game_rounds(game_id, settled_at DESC) WHERE status = 'settled';
