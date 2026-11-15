import { v2 as cloudinary } from "cloudinary";

function getRequiredEnvironmentVariable(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for Cloudinary uploads`);
  }

  return value;
}

export function getCloudinaryClient() {
  cloudinary.config({
    cloud_name: getRequiredEnvironmentVariable("CLOUDINARY_CLOUD_NAME"),
    api_key: getRequiredEnvironmentVariable("CLOUDINARY_API_KEY"),
    api_secret: getRequiredEnvironmentVariable("CLOUDINARY_API_SECRET")
  });

  return cloudinary;
}
