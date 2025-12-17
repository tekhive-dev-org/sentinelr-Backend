const multer = require('multer')
const path = require('path')
const fs = require('fs')

const isProd = process.env.NODE_ENV === 'production'

let storage

if (!isProd) {
        const uploadPath = path.join(__dirname, '../uploads/profile-pictures')
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true })
        }

        storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'uploads/profile-pictures');
        },
        filename: (req, file, cb) => {
            cb(null, Date.now() + path.extname(file.originalname))
        }
    })
}
else{
        storage = multer.memoryStorage()
}

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Only JPEG, PNG, and WEBP allowed.'));
  }
  cb(null, true);
}



const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } })

module.exports = upload