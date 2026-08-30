-- 0010_orders_preparing.sql
-- Sipariş akışına "preparing" (hazırlanıyor) durumu eklenir:
-- onay → hazırlanıyor → kargoya verildi (shipped).
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'paid', 'preparing', 'shipped', 'cancelled'));
