import multer from "multer";

const memoryStorage = multer.memoryStorage();

// File filter to accept images only
const imageFilter = function (req, file, cb) {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed!"), false);
  }
  cb(null, true);
};

// Configure multer with custom Supabase storage
const upload = multer({
  storage: memoryStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export default upload;
