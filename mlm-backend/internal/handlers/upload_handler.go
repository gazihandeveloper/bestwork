package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

// UploadHandler dosya yükleme endpoint'ini yönetir (dekont vb.).
type UploadHandler struct{}

// NewUploadHandler yeni bir UploadHandler örneği döndürür.
func NewUploadHandler() *UploadHandler {
	return &UploadHandler{}
}

// allowedExtensions yüklenebilecek dosya uzantılarıdır.
var allowedUploadTypes = map[string]map[string]bool{
	".jpg":  {"image/jpeg": true},
	".jpeg": {"image/jpeg": true},
	".png":  {"image/png": true},
	".pdf":  {"application/pdf": true},
}

// Upload multipart dosyayı uploads/ klasörüne kaydeder ve yolunu döndürür (JWT korumalı).
func (h *UploadHandler) Upload(c *gin.Context) {
	// Maksimum 5MB
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 5<<20)

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dosya okunamadı (alan adı: file, max 5MB)"})
		return
	}
	defer file.Close()

	ext, err := validateUploadType(header.Filename, file)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Desteklenmeyen dosya türü (jpg, jpeg, png, pdf)"})
		return
	}

	if err := os.MkdirAll("uploads", 0o700); err != nil {
		log.WithError(err).Error("uploads klasörü oluşturulamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Dosya kaydedilemedi"})
		return
	}

	randomName := make([]byte, 16)
	if _, err := rand.Read(randomName); err != nil {
		log.WithError(err).Error("Dosya adı üretilemedi")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Dosya kaydedilemedi"})
		return
	}
	filename := filepath.Join("uploads", hex.EncodeToString(randomName)+ext)
	out, err := os.OpenFile(filename, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		log.WithError(err).Error("Dosya oluşturulamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Dosya kaydedilemedi"})
		return
	}
	defer out.Close()

	if _, err := io.Copy(out, file); err != nil {
		_ = os.Remove(filename)
		log.WithError(err).Error("Dosya yazılamadı")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Dosya kaydedilemedi"})
		return
	}

	log.WithField("file_path", filename).Info("Dosya yüklendi")
	c.JSON(http.StatusOK, gin.H{"file_path": filename})
}

func validateUploadType(filename string, file io.ReadSeeker) (string, error) {
	ext := strings.ToLower(filepath.Ext(filename))
	allowedMIMEs, ok := allowedUploadTypes[ext]
	if !ok {
		return "", errors.New("desteklenmeyen uzantı")
	}

	header := make([]byte, 512)
	n, err := io.ReadFull(file, header)
	if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) {
		return "", fmt.Errorf("dosya imzası okunamadı: %w", err)
	}
	if n == 0 || !allowedMIMEs[http.DetectContentType(header[:n])] {
		return "", errors.New("dosya içeriği uzantıyla eşleşmiyor")
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return "", fmt.Errorf("dosya başına dönülemedi: %w", err)
	}
	return ext, nil
}
