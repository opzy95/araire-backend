const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    if (!file.mimetype.startsWith('image/')) {
      const error = new Error('Only image files are allowed');
      error.status = 400;
      callback(error);
      return;
    }
    callback(null, true);
  },
});

function uploadProductImage(req, res, next) {
  upload.single('image')(req, res, (error) => {
    if (error?.code === 'LIMIT_FILE_SIZE') {
      error.status = 413;
    }
    next(error);
  });
}

module.exports = uploadProductImage;