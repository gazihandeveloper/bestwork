package models

import (
	"encoding/json"
	"time"
)

// AuditLog audit_logs tablosunun Go karşılığıdır. Admin panelinden yapılan
// her kritik hareket (bakiye değişimi, düğüm taşıma, rütbe güncelleme vb.)
// aktör + eylem + hedef + gerekçe ile buraya yazılır ve silinmez.
type AuditLog struct {
	ID         int64           `json:"id"`
	AdminID    *int64          `json:"admin_id"`
	AdminName  *string         `json:"admin_name"`
	Action     string          `json:"action"`
	TargetType string          `json:"target_type"`
	TargetID   *int64          `json:"target_id"`
	Reason     *string         `json:"reason"`
	Meta       json.RawMessage `json:"meta"`
	CreatedAt  time.Time       `json:"created_at"`
}
