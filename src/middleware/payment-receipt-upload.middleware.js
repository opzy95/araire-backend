const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    if (!file.mimetype.startsWith('image/')) {
      const error = new Error('Only image files are allowed for payment receipts');
      error.status = 400;
      callback(error);
      return;
    }
    callback(null, true);
  },
});

function uploadPaymentReceipt(req, res, next) {
  upload.single('receipt')(req, res, (error) => {
    if (error?.code === 'LIMIT_FILE_SIZE') {
      error.status = 413;
    }
    next(error);
  });
}

module.exports = uploadPaymentReceipt;
