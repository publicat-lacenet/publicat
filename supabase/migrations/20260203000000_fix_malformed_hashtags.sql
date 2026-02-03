-- Migration: Fix malformed hashtags
-- Date: 2026-02-03
-- Description: Split concatenated hashtags (e.g. "calgravat #egipte #tutankamon")
--              into individual entries, update video_hashtags references,
--              and delete orphaned hashtags.

-- Step 1: Create a temporary table with the split results
CREATE TEMP TABLE hashtag_splits AS
WITH malformed AS (
  -- Find hashtags containing # or @ in their name (malformed)
  SELECT id, name, center_id
  FROM hashtags
  WHERE name ~ '[#@]' OR name ~ '\s+#'
),
split_parts AS (
  -- Split each malformed hashtag into individual parts
  -- Replace # and @ with commas, then split by comma
  SELECT
    m.id AS original_id,
    m.center_id,
    trim(lower(part)) AS clean_name
  FROM malformed m,
    LATERAL unnest(
      string_to_array(
        regexp_replace(
          regexp_replace(m.name, '[#@]', ',', 'g'),
          '\s*,\s*', ',', 'g'
        ),
        ','
      )
    ) AS part
  WHERE trim(part) <> ''
)
SELECT DISTINCT original_id, center_id, clean_name
FROM split_parts;

-- Step 2: Insert new individual hashtags that don't already exist
INSERT INTO hashtags (name, center_id, is_active)
SELECT DISTINCT s.clean_name, s.center_id, true
FROM hashtag_splits s
WHERE NOT EXISTS (
  SELECT 1 FROM hashtags h
  WHERE h.name = s.clean_name
    AND h.center_id = s.center_id
);

-- Step 3: For each video linked to a malformed hashtag,
--         create links to the new individual hashtags
INSERT INTO video_hashtags (video_id, hashtag_id)
SELECT DISTINCT vh.video_id, h_new.id
FROM video_hashtags vh
JOIN hashtag_splits s ON s.original_id = vh.hashtag_id
JOIN hashtags h_new ON h_new.name = s.clean_name AND h_new.center_id = s.center_id
WHERE NOT EXISTS (
  SELECT 1 FROM video_hashtags vh2
  WHERE vh2.video_id = vh.video_id
    AND vh2.hashtag_id = h_new.id
);

-- Step 4: Delete video_hashtags references to the old malformed hashtags
DELETE FROM video_hashtags
WHERE hashtag_id IN (SELECT original_id FROM hashtag_splits);

-- Step 5: Delete the old malformed hashtags
DELETE FROM hashtags
WHERE id IN (SELECT original_id FROM hashtag_splits);

-- Step 6: Delete orphaned hashtags (no videos linked)
DELETE FROM hashtags
WHERE id NOT IN (SELECT DISTINCT hashtag_id FROM video_hashtags);

-- Step 7: Clean up
DROP TABLE hashtag_splits;
