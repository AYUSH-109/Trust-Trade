import multer from "multer";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const listingImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 5,
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_request, file, callback) => {
    if (!allowedImageTypes.has(file.mimetype)) {
      callback(new Error("Only JPEG, PNG, and WebP images are allowed"));
      return;
    }

    callback(null, true);
  }
});

export default listingImageUpload;
