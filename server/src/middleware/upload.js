const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Storage configuration for host application documents
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/documents');
    ensureDirectoryExists(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename: userId_documentType_timestamp.ext
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    const documentType = req.params.documentType || 'document';
    const userId = req.user?._id || 'user';
    cb(null, `${userId}_${documentType}_${uniqueSuffix}${ext}`);
  }
});

// ✅ FIXED: Storage configuration for listing images
const listingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/listings');
    ensureDirectoryExists(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // ✅ FIXED: Generate truly unique filenames using userId + timestamp + random
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    
    // ✅ Use userId if available, or listingId, or fallback to unique identifier
    let prefix = 'listing';
    if (req.user?.id || req.user?._id) {
      prefix = `${req.user.id || req.user._id}`;
    } else if (req.params.id) {
      prefix = `${req.params.id}`;
    }
    
    // ✅ Format: userId_timestamp-random.ext OR listingId_timestamp-random.ext
    cb(null, `${prefix}_${uniqueSuffix}${ext}`);
  }
});

// Storage configuration for user avatars
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/users');
    ensureDirectoryExists(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    const userId = req.user?._id || 'user';
    cb(null, `avatar_${userId}_${uniqueSuffix}${ext}`);
  }
});

// File filter for documents (PDF, JPG, PNG, JPEG)
const documentFileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|jpg|jpeg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF, JPG, JPEG, and PNG files are allowed for documents!'));
  }
};

// File filter for images (JPG, PNG, JPEG, WebP)
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpg|jpeg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only JPG, JPEG, PNG, and WebP files are allowed for images!'));
  }
};

// Upload middleware for host application documents
const uploadDocument = multer({
  storage: documentStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for documents
  }
});

// Upload middleware for listing images
const uploadListingImage = multer({
  storage: listingStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for listing images
  }
});

// Upload middleware for user avatars
const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for avatars
  }
});

// General upload middleware (backwards compatibility)
const upload = multer({
  storage: listingStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  }
});

// Magic bytes signatures for file type validation
const MAGIC_BYTES = {
  jpg:  [0xFF, 0xD8, 0xFF],
  png:  [0x89, 0x50, 0x4E, 0x47],
  webp: [0x52, 0x49, 0x46, 0x46], // RIFF header (WebP starts with RIFF)
  pdf:  [0x25, 0x50, 0x44, 0x46]  // %PDF
};

/**
 * Post-upload middleware: validates file magic bytes match declared type.
 * Deletes spoofed files from disk and returns 400.
 */
const validateFileContent = (req, res, next) => {
  const files = req.files || (req.file ? [req.file] : []);
  if (files.length === 0) return next();

  for (const file of files) {
    if (!file.path || !fs.existsSync(file.path)) continue;

    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const normalizedExt = (ext === 'jpeg') ? 'jpg' : ext;
    const expectedBytes = MAGIC_BYTES[normalizedExt];

    if (!expectedBytes) continue; // Skip unknown extensions

    try {
      const fd = fs.openSync(file.path, 'r');
      const buffer = Buffer.alloc(expectedBytes.length);
      fs.readSync(fd, buffer, 0, expectedBytes.length, 0);
      fs.closeSync(fd);

      const matches = expectedBytes.every((byte, i) => buffer[i] === byte);
      if (!matches) {
        // Delete the spoofed file
        fs.unlinkSync(file.path);
        return res.status(400).json({
          status: 'error',
          message: `File "${file.originalname}" content does not match its extension. Upload rejected.`
        });
      }
    } catch (err) {
      console.error('[Upload] Magic bytes check error:', err.message);
      // Don't block on read errors, let the request proceed
    }
  }

  next();
};

// Error handling middleware for multer errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'File is too large. Maximum size allowed is 10MB.'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        status: 'error',
        message: 'Unexpected field name in file upload.'
      });
    }
    return res.status(400).json({
      status: 'error',
      message: err.message
    });
  } else if (err) {
    return res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
  next();
};

module.exports = upload;
module.exports.uploadDocument = uploadDocument;
module.exports.uploadListingImage = uploadListingImage;
module.exports.uploadAvatar = uploadAvatar;
module.exports.handleUploadError = handleUploadError;
module.exports.validateFileContent = validateFileContent;
