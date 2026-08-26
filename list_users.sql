SELECT u.id, u.name, u.email, u.phone, u.member_code, u.role,
       u.is_active, u.is_in_pending_pool,
       s.member_code AS sponsor_code,
       u.position, u.created_at
FROM users u
LEFT JOIN users s ON s.id = u.sponsor_id
ORDER BY u.id;
