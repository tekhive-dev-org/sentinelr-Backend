const cloudinary = require('cloudinary').v2
const streamifier = require('streamifier')


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

cloudinary.uploader.upload('../uploads/profile-pictures/1765054971773.jpg', { folder: 'test' }, (err, result) => {
  if (err) console.error(err);
  else console.log('Uploaded:', result.secure_url);
})

const uploadToCloud = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'profile-pictures',
        public_id: publicId ? publicId : undefined,
        transformation: [
          { width: 500, height: 500, crop: 'thumb', gravity: 'face' }, // auto-crop square
          { fetch_format: 'auto', quality: 'auto' }, // optimize format & quality
        ]
      }, // optional folder in your Cloudinary account
      (error, result) => {
        if (error) return reject(error)
        resolve(result.secure_url); // return URL
      }
    )

    // Convert buffer into a readable stream and pipe to Cloudinary
    streamifier.createReadStream(fileBuffer).pipe(stream)
  })
}

const deleteFromCloud = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Failed to delete old image:', err);
  }
}

module.exports = { uploadToCloud, deleteFromCloud }
