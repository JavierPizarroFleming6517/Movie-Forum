-- ===========================================================================
-- Demo metrics seed
--
-- Fills the moderation + engagement history that `GET /api/v1/metrics` plots.
-- The regular prisma seed only creates same-day reviews and no moderation
-- activity at all, which makes every chart on /metricas render empty.
--
-- Run it AFTER `npx prisma db seed` (it needs the users, titles and reviews).
-- Copy the file in and run it there so the accents survive the shell:
--   docker cp backend/prisma/demo-metrics.sql movie-forum-db:/tmp/demo.sql
--   docker exec -u root movie-forum-db psql -U foro -d foro_peliculas -f /tmp/demo.sql
--
-- Re-running it is safe: demo rows (id >= 9000) are removed and rebuilt, so the
-- result is always the same. Original seeded reviews are only re-dated, never
-- deleted or duplicated.
-- ===========================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Clear previous demo data.
--    reports has to go first: it references moderation_actions.
--    Every row inserted below uses an explicit id >= 9000, so this is
--    deterministic and does not depend on encoding of the reason text.
--    Reports created through the app keep their ids below that range.
-- ---------------------------------------------------------------------------
DELETE FROM reports WHERE id >= 9000;
DELETE FROM moderation_actions WHERE id >= 9000;

-- ---------------------------------------------------------------------------
-- 2. Spread the seeded reviews over ~300 days.
--    Without this the engagement timeline is a single day, and the all-time
--    view can never show its monthly bucket behaviour.
-- ---------------------------------------------------------------------------
UPDATE reviews
   SET created_at = now() - ((id * 7) % 300) * interval '1 day'
                          - ((id * 13) % 24) * interval '1 hour';

UPDATE review_replies
   SET created_at = reviews.created_at + interval '6 hours'
  FROM reviews
 WHERE review_replies.review_id = reviews.id;

-- ---------------------------------------------------------------------------
-- 3. Moderation actions: warnings, deletions and temporary/permanent bans.
--    TargetType is 'user' and targetId points at the sanctioned author, which
--    is what the moderation service itself writes.
--    expires_at is backdated together with created_at so only genuinely
--    unrexpired bans count as "active".
-- ---------------------------------------------------------------------------
INSERT INTO moderation_actions
  (id, type, "targetId", "targetType", "moderatorId", reason, "durationDays", "expires_at", "created_at")
SELECT
  9000 + row_number() OVER (ORDER BY m.idx),
  m.action_type::"ActionType",
  m.target_id,
  'user',
  1,
  m.reason,
  m.duration_days,
  CASE WHEN m.duration_days IS NULL
       THEN NULL
       ELSE m.created_at + (m.duration_days || ' days')::interval END,
  m.created_at
FROM (
  SELECT
    row_number() OVER (ORDER BY i) AS idx,
    now()
      - (i * 17 || ' days')::interval
      - ((i * 5) % 19 || ' hours')::interval
      - ((i * 7) % 55 || ' minutes')::interval            AS created_at,
    (ARRAY['warn','warn','delete_content','delete_content','ban_temp','warn',
           'delete_content','ban_temp','warn','ban_perm','warn','delete_content',
           'ban_temp','warn','delete_content','ban_perm','warn','warn'])[1 + i] AS action_type,
    (ARRAY[3,4,5,6,7,8,9,10,11,12,13,14,15,3,5,7,9,11])[1 + i]  AS target_id,
    (ARRAY[7,30,NULL,14,NULL,90])[1 + (i % 6)]                  AS duration_days,
    'Acción de demostración'                                     AS reason
  FROM generate_series(0, 17) AS i
) AS m;

-- ---------------------------------------------------------------------------
-- 4. Reports, targeting real review ids.
--    The three most recent stay pending so the moderation queue is populated
--    when the page is opened and the 7 day range is not empty either.
-- ---------------------------------------------------------------------------
INSERT INTO reports
  (id, type, reason, status, "targetId", "targetType", "reporterId", "resolvedById", "created_at", "resolved_at")
SELECT
  9000 + row_number() OVER (ORDER BY m.idx),
  m.report_type::"ReportType",
  m.reason,
  m.report_status::"ReportStatus",
  r.id,
  'review',
  m.reporter_id,
  m.resolved_by,
  m.created_at,
  m.resolved_at
FROM (
  SELECT
    row_number() OVER (ORDER BY i) AS idx,
    now()
      - (i * 11 || ' days')::interval
      - ((i * 3) % 17 || ' hours')::interval
      - ((i * 11) % 47 || ' minutes')::interval            AS created_at,
    (ARRAY['spam','offensive','spoiler','other'])[1 + (i % 4)] AS report_type,
    CASE WHEN i < 3 THEN 'pending'
         WHEN i % 3 = 0 THEN 'action_taken'
         ELSE 'dismissed' END                                AS report_status,
    (ARRAY[2,3,4,5,6,7,8,9,10,11,12,13,14,15])[1 + (i % 14)] AS reporter_id,
    CASE WHEN i < 3 THEN NULL ELSE 1 END                     AS resolved_by,
    CASE WHEN i < 3 THEN NULL
         ELSE now()
              - (i * 11 || ' days')::interval
              + ((2 + (i % 9)) || ' hours')::interval END      AS resolved_at,
    'Reporte de demostración'                                AS reason
  FROM generate_series(0, 27) AS i
) AS m
CROSS JOIN LATERAL (
  SELECT id FROM reviews ORDER BY (id * 7) % 193 LIMIT 1 OFFSET (m.idx % 150)
) AS r;

-- Link each action_taken report to a real action so the queue shows history.
WITH paired AS (
  SELECT r.id AS report_id,
         row_number() OVER (ORDER BY r.created_at) AS rn
  FROM reports r
  WHERE r.status = 'action_taken'
)
UPDATE reports r
   SET "moderationActionId" = (
     SELECT a.id FROM moderation_actions a ORDER BY a.created_at OFFSET (p.rn - 1) LIMIT 1
   )
  FROM paired p
 WHERE r.id = p.report_id;

COMMIT;

-- ---------------------------------------------------------------------------
-- Summary
-- ---------------------------------------------------------------------------
SELECT (SELECT count(*) FROM reports)                          AS reports,
       (SELECT count(*) FROM reports WHERE status = 'pending')  AS pending,
       (SELECT count(*) FROM reports WHERE status = 'dismissed') AS dismissed,
       (SELECT count(*) FROM reports WHERE status = 'action_taken') AS actioned,
       (SELECT count(*) FROM moderation_actions)               AS actions,
       (SELECT count(*) FROM reviews)                          AS reviews,
       (SELECT count(*) FROM review_replies)                   AS replies,
       (SELECT count(DISTINCT date(created_at)) FROM reviews)   AS review_days;