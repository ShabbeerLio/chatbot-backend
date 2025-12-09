import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.js";

// For profile picture
const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "Nikha-e-muslim/profile_pictures",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

// For gallery images
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "Nikha-e-muslim/gallery_images",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

export const uploadProfile = multer({ storage: profileStorage });
export const uploadImages = multer({
  storage: imageStorage,
  limits: { files: 6 }, // max 6 images
});