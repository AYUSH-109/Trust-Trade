import { getCloudinaryClient } from "../config/cloudinary.js";

export function uploadListingImage(file) {
  if (!file?.buffer) {
    throw new Error("An image file is required");
  }

  return new Promise((resolve, reject) => {
    const cloudinary = getCloudinaryClient();
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "trust-trade/listings",
        resource_type: "image"
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result?.secure_url || !result.public_id) {
          reject(new Error("Cloudinary returned an incomplete upload result"));
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id
        });
      }
    );

    uploadStream.end(file.buffer);
  });
}

export async function deleteListingImage(publicId) {
  const cloudinary = getCloudinaryClient();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}
