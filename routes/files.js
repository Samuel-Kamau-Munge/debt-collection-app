const express = require('express');
const router = express.Router();
const fileUploadService = require('../services/fileUploadService');
const { validate, schemas } = require('../middleware/validation');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const path = require('path');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(new AppError('Access token required', 401));
  }

  const jwt = require('jsonwebtoken');
  const config = require('../config/config');

  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) {
      return next(new AppError('Invalid or expired token', 403));
    }
    req.user = user;
    next();
  });
};

// Apply authentication to all routes
router.use(authenticateToken);

// Upload single file
router.post('/upload', fileUploadService.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    const { relatedId, relatedType, description } = req.body;
    
    // Save file info to database
    const fileId = await fileUploadService.saveFileInfo(
      req.user.id,
      req.file,
      relatedId ? parseInt(relatedId) : null,
      relatedType || null,
      description || null
    );

    logger.info('File uploaded successfully', {
      fileId,
      userId: req.user.id,
      originalName: req.file.originalname,
      fileName: req.file.filename,
      fileSize: fileUploadService.formatFileSize(req.file.size)
    });

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: fileId,
        originalName: req.file.originalname,
        fileName: req.file.filename,
        fileSize: req.file.size,
        fileSizeFormatted: fileUploadService.formatFileSize(req.file.size),
        mimeType: req.file.mimetype,
        uploadedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('File upload failed', { 
      error: error.message, 
      userId: req.user.id,
      originalName: req.file?.originalname 
    });
    next(error);
  }
});

// Upload multiple files
router.post('/upload-multiple', fileUploadService.array('files', 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next(new AppError('No files uploaded', 400));
    }

    const { relatedId, relatedType, description } = req.body;
    const uploadedFiles = [];

    for (const file of req.files) {
      try {
        const fileId = await fileUploadService.saveFileInfo(
          req.user.id,
          file,
          relatedId ? parseInt(relatedId) : null,
          relatedType || null,
          description || null
        );

        uploadedFiles.push({
          id: fileId,
          originalName: file.originalname,
          fileName: file.filename,
          fileSize: file.size,
          fileSizeFormatted: fileUploadService.formatFileSize(file.size),
          mimeType: file.mimetype,
          uploadedAt: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Failed to save file info', { 
          error: error.message, 
          fileName: file.originalname 
        });
        // Continue with other files
      }
    }

    logger.info('Multiple files uploaded', {
      userId: req.user.id,
      fileCount: uploadedFiles.length,
      totalSize: uploadedFiles.reduce((sum, file) => sum + file.fileSize, 0)
    });

    res.status(201).json({
      message: `${uploadedFiles.length} files uploaded successfully`,
      files: uploadedFiles
    });
  } catch (error) {
    logger.error('Multiple file upload failed', { 
      error: error.message, 
      userId: req.user.id 
    });
    next(error);
  }
});

// Get file by ID
router.get('/file/:id', validate(schemas.idParam, 'params'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = await fileUploadService.getFile(id, req.user.id);
    
    if (!file) {
      return next(new AppError('File not found', 404));
    }
    
    res.json({ file });
  } catch (error) {
    logger.error('Failed to get file', { 
      error: error.message, 
      fileId: req.params.id, 
      userId: req.user.id 
    });
    next(error);
  }
});

// Download file
router.get('/:id/download', validate(schemas.idParam, 'params'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = await fileUploadService.getFile(id, req.user.id);
    
    if (!file) {
      return next(new AppError('File not found', 404));
    }
    
    const filePath = path.resolve(file.file_path);
    
    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      return next(new AppError('File not found on disk', 404));
    }
    
    res.download(filePath, file.original_name, (err) => {
      if (err) {
        logger.error('File download failed', { 
          error: err.message, 
          fileId: id, 
          userId: req.user.id 
        });
        if (!res.headersSent) {
          next(err);
        }
      } else {
        logger.info('File downloaded successfully', { 
          fileId: id, 
          userId: req.user.id,
          fileName: file.original_name 
        });
      }
    });
  } catch (error) {
    logger.error('Failed to download file', { 
      error: error.message, 
      fileId: req.params.id, 
      userId: req.user.id 
    });
    next(error);
  }
});

// Get files by related entity
router.get('/related/:relatedType/:relatedId', async (req, res, next) => {
  try {
    const { relatedType, relatedId } = req.params;
    
    const validTypes = ['debt', 'credit', 'transaction', 'payment_schedule', 'user'];
    if (!validTypes.includes(relatedType)) {
      return next(new AppError('Invalid related type', 400));
    }
    
    const files = await fileUploadService.getFilesByRelated(
      parseInt(relatedId), 
      relatedType, 
      req.user.id
    );
    
    res.json({ files });
  } catch (error) {
    logger.error('Failed to get files by related entity', { 
      error: error.message, 
      relatedType: req.params.relatedType,
      relatedId: req.params.relatedId,
      userId: req.user.id 
    });
    next(error);
  }
});

// Delete file
router.delete('/:id', validate(schemas.idParam, 'params'), async (req, res, next) => {
  try {
    const { id } = req.params;
    await fileUploadService.deleteFile(id, req.user.id);
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    if (error.message === 'File not found') {
      return next(new AppError('File not found', 404));
    }
    
    logger.error('Failed to delete file', { 
      error: error.message, 
      fileId: req.params.id, 
      userId: req.user.id 
    });
    next(error);
  }
});

// Get file statistics
router.get('/stats/summary', async (req, res, next) => {
  try {
    const stats = await fileUploadService.getFileStats(req.user.id);
    
    res.json({
      ...stats,
      totalSizeFormatted: fileUploadService.formatFileSize(stats.total_size || 0),
      avgSizeFormatted: fileUploadService.formatFileSize(stats.avg_size || 0),
      maxSizeFormatted: fileUploadService.formatFileSize(stats.max_size || 0),
      minSizeFormatted: fileUploadService.formatFileSize(stats.min_size || 0)
    });
  } catch (error) {
    logger.error('Failed to get file stats', { 
      error: error.message, 
      userId: req.user.id 
    });
    next(error);
  }
});

// Get all user files with pagination
router.get('/', validate(schemas.pagination, 'query'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, relatedType } = req.query;
    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);
    const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
    const safePage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const offset = (safePage - 1) * safeLimit;
    
    const db = require('../config/database');
    const connection = await db;
    
    let query = `
      SELECT * FROM file_attachments 
      WHERE user_id = ?
    `;
    let params = [req.user.id];
    
    if (type) {
      query += ' AND mime_type LIKE ?';
      params.push(`%${type}%`);
    }
    
    if (relatedType) {
      query += ' AND related_type = ?';
      params.push(relatedType);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ${safeLimit} OFFSET ${offset}`;
    
    const [files] = await connection.execute(query, params);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total FROM file_attachments 
      WHERE user_id = ?
    `;
    let countParams = [req.user.id];
    
    if (type) {
      countQuery += ' AND mime_type LIKE ?';
      countParams.push(`%${type}%`);
    }
    
    if (relatedType) {
      countQuery += ' AND related_type = ?';
      countParams.push(relatedType);
    }
    
    const [countResult] = await connection.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    // Format file sizes
    const formattedFiles = files.map(file => ({
      ...file,
      file_size_formatted: fileUploadService.formatFileSize(file.file_size)
    }));
    
    res.json({
      files: formattedFiles,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit)
      }
    });
  } catch (error) {
    logger.error('Failed to get user files', { 
      error: error.message, 
      userId: req.user.id 
    });
    next(error);
  }
});

// Cleanup orphaned files (admin/system use)
router.delete('/cleanup/orphaned', async (req, res, next) => {
  try {
    const deletedCount = await fileUploadService.cleanupOrphanedFiles();
    
    res.json({ 
      message: 'Orphaned files cleaned up successfully',
      deletedCount 
    });
  } catch (error) {
    logger.error('Failed to cleanup orphaned files', { 
      error: error.message 
    });
    next(error);
  }
});

module.exports = router;
