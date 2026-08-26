SELECT 'hero_slides' AS tbl, image_path FROM hero_slides WHERE image_path LIKE '%66dfb6%' OR image_path LIKE '%7a403a%' OR image_path LIKE '%caa427%' OR image_path LIKE '%fabb3e%'
UNION ALL
SELECT 'products', image_path FROM products WHERE image_path LIKE '%66dfb6%' OR image_path LIKE '%7a403a%' OR image_path LIKE '%caa427%' OR image_path LIKE '%fabb3e%'
UNION ALL
SELECT 'users', profile_image FROM users WHERE profile_image LIKE '%66dfb6%' OR profile_image LIKE '%7a403a%' OR profile_image LIKE '%caa427%' OR profile_image LIKE '%fabb3e%';
SELECT '--- users with profile image ---';
SELECT COUNT(*) FROM users WHERE profile_image IS NOT NULL AND profile_image <> '';
SELECT '--- coffee-2 refs ---';
SELECT 'products', image_path FROM products WHERE image_path LIKE '%coffee-2%'
UNION ALL SELECT 'hero', image_path FROM hero_slides WHERE image_path LIKE '%coffee-2%';
