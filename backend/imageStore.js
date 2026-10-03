// backend/imageStore.js
// Saves an image and returns its address.
// - If CLOUDINARY_URL is set (production): uploads to Cloudinary (free, permanent).
// - Otherwise (local development): saves in backend/uploads.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');

async function saveImage(buffer, ext = '.jpg') {
  if (process.env.CLOUDINARY_URL) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: 'utsnova-blog', resource_type: 'image' }, (err, result) => {
          if (err) return reject(err);
          resolve(result.secure_url); // full https:// address
        })
        .end(buffer);
    });
  }

  // Local fallback
  const dir = path.join(__dirname, 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  fs.writeFileSync(path.join(dir, fileName), buffer);
  return `/uploads/${fileName}`;
}

module.exports = { saveImage };