INSERT INTO users (
  id, name, email, member_code, role, password_hash,
  sponsor_id, parent_id, position, package_id,
  is_active, is_in_pending_pool, current_rank_id,
  profile, created_at, updated_at
) VALUES (
  90001,
  'Mahmut Gazihan Arslan',
  'mahmut@mahmutgazihanarslan.com.tr',
  'TR90848719',
  'admin',
  '$2a$10$tNwK.zw0WObZZ51gktdbS.Fd24EXBoEAOe.ylq.c76Zw8MUdWFUBK',
  NULL, NULL, NULL, NULL,
  true, false, NULL,
  '{}'::jsonb,
  now(), now()
)
ON CONFLICT (id) DO NOTHING;

-- sequence'i güncelle (elle verilen id'den sonra çakışma olmasın)
SELECT setval('users_id_seq', GREATEST((SELECT MAX(id) FROM users), 90001));

SELECT id, name, email, member_code, role, is_active, is_in_pending_pool, sponsor_id, parent_id, created_at
FROM users WHERE id = 90001;
