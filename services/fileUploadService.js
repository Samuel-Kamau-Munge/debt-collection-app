const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../config/config');
const logger = require('../utils/logger');

class FileUploadService {
  constructor() {
    this.ensureUploadDirectory();
    this.setupMulter();
  }

  ensureUploadDirectory() {
    if (!fs.existsSync(config.upload.uploadPath)) {
      fs.mkdirSync(config.upload.uploadPath, { recursive: true });
    }

    // Create subdirectories
    const subdirs = ['documents', 'receipts', 'attachments'];
    subdirs.forEach(subdir => {
      const subdirPath = path.join(config.upload.uploadPath, subdir);
      if (!fs.existsSync(subdirPath)) {
        fs.mkdirSync(subdirPath, { recursive: true });
      }
    });
  }

  setupMulter() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        let uploadPath = config.upload.uploadPath;
        
        // Determine subdirectory based on file type or request
        if (file.fieldname === 'receipt') {
          uploadPath = path.join(uploadPath, 'receipts');
        } else if (file.fieldname === 'document') {
          uploadPath = path.join(uploadPath, 'documents');
        } else {
          uploadPath = path.join(uploadPath, 'attachments');
        }
        
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = crypto.randomBytes(16).toString('hex');
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_');
        cb(null, `${sanitizedName}_${uniqueSuffix}${ext}`);
      }
    });

    const fileFilter = (req, file, cb) => {
      if (config.upload.allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`File type ${file.mimetype} not allowed`), false);
      }
    };

    this.upload = multer({
      storage,
      fileFilter,
      limits: {
        fileSize: config.upload.maxFileSize
      }
    });
  }

  // Get multer middleware for single file upload
  single(fieldName) {
    return this.upload.single(fieldName);
  }

  // Get multer middleware for multiple file upload
  array(fieldName, maxCount = 5) {
    return this.upload.array(fieldName, maxCount);
  }

  // Get multer middleware for multiple fields
  fields(fields) {
    return this.upload.fields(fields);
  }

  // Save file information to database
  async saveFileInfo(userId, file, relatedId = null, relatedType = null, description = null) {
    try {
      const db = require('../config/database');
      const connection = await db;
      
      const [result] = await connection.execute(
        `INSERT INTO file_attachments (user_id, original_name, file_name, file_path, file_size, mime_type, related_id, related_type, description, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          file.originalname,
          file.filename,
          file.path,
          file.size,
          file.mimetype,
          relatedId,
          relatedType,
          description
        ]
      );

      logger.info('File info saved to database', {
        fileId: result.insertId,
        userId,
        originalName: file.originalname,
        fileName: file.filename
      });

      return result.insertId;
    } catch (error) {
      logger.error('Failed to save file info to database', {
        error: error.message,
        userId,
        fileName: file.filename
      });
      throw error;
    }
  }

  // Get file by ID
  async getFile(fileId, userId) {
    try {
      const db = require('../config/database');
      const connection = await db;
      
      const [files] = await connection.execute(
        'SELECT * FROM file_attachments WHERE id = ? AND user_id = ?',
        [fileId, userId]
      );

      return files.length > 0 ? files[0] : null;
    } catch (error) {
      logger.error('Failed to get file', { error: error.message, fileId, userId });
      throw error;
    }
  }

  // Get files by related entity
  async getFilesByRelated(relatedId, relatedType, userId) {
    try {
      const db = require('../config/database');
      const connection = await db;
      
      const [files] = await connection.execute(
        'SELECT * FROM file_attachments WHERE related_id = ? AND related_type = ? AND user_id = ? ORDER BY created_at DESC',
        [relatedId, relatedType, userId]
      );

      return files;
    } catch (error) {
      logger.error('Failed to get files by related entity', {
        error: error.message,
        relatedId,
        relatedType,
        userId
      });
      throw error;
    }
  }

  // Delete file
  async deleteFile(fileId, userId) {
    try {
      const db = require('../config/database');
      const connection = await db;
      
      // Get file info first
      const file = await this.getFile(fileId, userId);
      if (!file) {
        throw new Error('File not found');
      }

      // Delete from database
      await connection.execute(
        'DELETE FROM file_attachments WHERE id = ? AND user_id = ?',
        [fileId, userId]
      );

      // Delete physical file
      if (fs.existsSync(file.file_path)) {
        fs.unlinkSync(file.file_path);
      }

      logger.info('File deleted', { fileId, userId, fileName: file.file_name });
      return true;
    } catch (error) {
      logger.error('Failed to delete file', { error: error.message, fileId, userId });
      throw error;
    }
  }

  // Get file statistics
  async getFileStats(userId) {
    try {
      const db = require('../config/database');
      const connection = await db;
      
      const [stats] = await connection.execute(
        `SELECT 
          COUNT(*) as total_files,
          SUM(file_size) as total_size,
          AVG(file_size) as avg_size,
          MAX(file_size) as max_size,
          MIN(file_size) as min_size
         FROM file_attachments 
         WHERE user_id = ?`,
        [userId]
      );

      return stats[0];
    } catch (error) {
      logger.error('Failed to get file stats', { error: error.message, userId });
      throw error;
    }
  }

  // Clean up orphaned files
  async cleanupOrphanedFiles() {
    try {
      const db = require('../config/database');
      const connection = await db;
      
      // Get files that don't have corresponding records in related tables
      const [orphanedFiles] = await connection.execute(
        `SELECT fa.* FROM file_attachments fa
         LEFT JOIN debts d ON fa.related_id = d.id AND fa.related_type = 'debt'
         LEFT JOIN credits c ON fa.related_id = c.id AND fa.related_type = 'credit'
         LEFT JOIN transactions t ON fa.related_id = t.id AND fa.related_type = 'transaction'
         WHERE d.id IS NULL AND c.id IS NULL AND t.id IS NULL
         AND fa.created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)`
      );

      let deletedCount = 0;
      for (const file of orphanedFiles) {
        try {
          // Delete physical file
          if (fs.existsSync(file.file_path)) {
            fs.unlinkSync(file.file_path);
          }

          // Delete database record
          await connection.execute(
            'DELETE FROM file_attachments WHERE id = ?',
            [file.id]
          );

          deletedCount++;
        } catch (error) {
          logger.error('Failed to delete orphaned file', {
            error: error.message,
            fileId: file.id,
            filePath: file.file_path
          });
        }
      }

      logger.info('Orphaned files cleaned up', { deletedCount });
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup orphaned files', { error: error.message });
      throw error;
    }
  }

  // Validate file type
  isValidFileType(mimetype) {
    return config.upload.allowedTypes.includes(mimetype);
  }

  // Get file size in human readable format
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Create singleton instance
const fileUploadService = new FileUploadService();

module.exports = fileUploadService;
