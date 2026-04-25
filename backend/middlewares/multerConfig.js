const multer = require("multer");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Load Supabase config from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_BUCKET) {
  throw new Error(
    "Missing required Supabase environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET",
  );
}

// Initialize Supabase client with service role for storage access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Custom Multer Storage Engine for Supabase
class SupabaseStorageEngine {
  _handleFile(req, file, cb) {
    // Sanitize filename - remove path separators and null bytes
    const sanitizeFilename = (name) => {
      return name.replace(/[\/\\:\x00]/g, "_");
    };
    // Generate unique file path
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const safeName = sanitizeFilename(file.originalname);
    const ext = path.extname(safeName);
    const basename = path.basename(safeName, ext);
    const fileName = `${basename}-${uniqueSuffix}${ext}`;

    // Collect file buffer from stream
    const chunks = [];

    file.stream.on("data", (chunk) => {
      chunks.push(chunk);
    });

    file.stream.on("error", (err) => {
      cb(err);
    });

    file.stream.on("end", async () => {
      try {
        const buffer = Buffer.concat(chunks);

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from(SUPABASE_BUCKET)
          .upload(fileName, buffer, {
            contentType: file.mimetype,
            upsert: false,
          });

        if (error) {
          return cb(new Error(`Supabase upload failed: ${error.message}`));
        }

        // Get public URL for the uploaded file
        const { data: urlData } = supabase.storage
          .from(SUPABASE_BUCKET)
          .getPublicUrl(fileName);

        // Attach file info to req.file (mimics multer's diskStorage output)
        cb(null, {
          bucket: SUPABASE_BUCKET,
          fileName: fileName,
          path: data.path,
          publicUrl: urlData.publicUrl,
          size: buffer.length,
          mimetype: file.mimetype,
        });
      } catch (err) {
        cb(err);
      }
    });
  }

  _removeFile(req, file, cb) {
    // Delete file from Supabase if needed (e.g., on validation failure)
    if (!file.fileName) return cb(null);

    supabase.storage
      .from(SUPABASE_BUCKET)
      .remove([file.fileName])
      .then(({ error }) => {
        if (error) {
          console.error("Failed to remove file from Supabase:", error.message);
        }
        cb(null);
      })
      .catch((err) => {
        console.error("Failed to remove file from Supabase:", err.message);
        cb(null);
      });
  }
}

// File filter to accept images only
const imageFilter = function (req, file, cb) {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed!"), false);
  }
  cb(null, true);
};

// Configure multer with custom Supabase storage
const upload = multer({
  storage: new SupabaseStorageEngine(),
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

module.exports = upload;
