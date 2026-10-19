const { v2: cloudinary } = require('cloudinary');

function getCloudinary() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    const error = new Error('Cloudinary credentials must be configured');
    error.status = 503;
    throw error;
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

function uploadImage(file) {
  const client = getCloudinary();
  return new Promise((resolve, reject) => {
    const upload = client.uploader.upload_stream(
      { folder: 'araire/products', resource_type: 'image' },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    upload.end(file.buffer);
  });
}

async function deleteImage(publicId) {
  if (publicId) {
    await getCloudinary().uploader.destroy(publicId, { resource_type: 'image' });
  }
}

module.exports = { uploadImage, deleteImage };