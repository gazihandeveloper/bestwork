package models

import "time"

// KYCDocument kyc_documents tablosunun (üye bilgileriyle join'li) Go karşılığıdır.
type KYCDocument struct {
	ID           int64      `json:"id"`
	UserID       int64      `json:"user_id"`
	UserName     string     `json:"user_name"`
	MemberCode   string     `json:"member_code"`
	DocumentType string     `json:"document_type"`
	FilePath     string     `json:"file_path"`
	Status       string     `json:"status"`
	AdminNote    *string    `json:"admin_note"`
	SubmittedAt  time.Time  `json:"submitted_at"`
	ProcessedAt  *time.Time `json:"processed_at"`
}
