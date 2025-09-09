import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import { ApiError } from '../utils/apiError.js';
import { statuscode } from '../constants/status.js';

cloudinary.config({
  cloud_name: "dcvx4tnwp",
  api_key: "596258636375658",
  api_secret: "PBWzlNAuSmudhmV7BpGB-KHFk3k"
});

const deleteFileIfExists = (path: string) => {
  if (fs.existsSync(path)) {
    fs.unlinkSync(path);
  }
};

const uploadOnCloudinary = async (localpath: string) => {
  try {
    console.log(localpath);
    
    if (!localpath) throw new ApiError(statuscode.NOTACCEPTABLE, "No file path provided.");

    const stats = fs.statSync(localpath);
    if (stats.size === 0) {
      throw new ApiError(statuscode.NOTACCEPTABLE, "The file is empty.");
    }

    const response = await cloudinary.uploader.upload(localpath, { resource_type: 'auto' });
    deleteFileIfExists(localpath);
    console.log("File uploaded to Cloudinary:", response.url);

    return { success: true, data: response, message: "File uploaded to Cloudinary successfully." };
  } catch (error) {
    console.error(error.message || "Error uploading file:");
    deleteFileIfExists(localpath);
    return { success: false, data: null, message: error.message || "Error uploading file to Cloudinary." };
  }
}

const deleteonCloudinary = async (url: string) => {
  try {
    if (!url) throw new ApiError(statuscode.NOTACCEPTABLE, "No URL provided.");
    const imageName = url.split('/').pop()?.split('.')[0];
    if (!imageName) throw new ApiError(statuscode.NOTACCEPTABLE, "Invalid URL format.");

    const response = await cloudinary.uploader.destroy(imageName);
    console.log("File deleted from Cloudinary:", response);

    return { success: true, data: response, message: "File deleted from Cloudinary successfully." };
  } catch (error) {
    console.error(error.message || "Error deleting image from Cloudinary:");
    return { success: false, message: error.message || "Error deleting image from Cloudinary." };
  }
}

export { uploadOnCloudinary, deleteonCloudinary }