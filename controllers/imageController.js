const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const cloudinary = require("cloudinary").v2;

const Image = require("../models/Image");

// =========================
// Cloudinary Config
// =========================
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});


// =========================
// Upload + Embed Watermark
// =========================
exports.uploadMedicalImage = async (req, res) => {
  try {
    const { patientName, doctorId, text } = req.body;

    // patientId from JWT token
    const patientId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        error: "Image file is required",
      });
    }

    // =========================
    // Upload Original Image to Cloudinary
    // =========================
    const originalUpload = await cloudinary.uploader.upload(
      req.file.path,
      {
        folder: "medical-images/original",
      }
    );

    // =========================
    // Send Image to ML API (/embed)
    // =========================
    const form = new FormData();

    form.append(
      "file",
      fs.createReadStream(req.file.path)
    );

    form.append("text", text);

    const embedResponse = await axios.post(
      "https://watermarking-1-oi51.onrender.com/embed",
      form,
      {
        headers: form.getHeaders(),
        responseType: "arraybuffer",
      }
    );

    // =========================
    // Create uploads folder safely
    // =========================
    const uploadDir = path.join(__dirname, "../uploads");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // =========================
    // Save returned watermarked image
    // =========================
    const watermarkedPath = path.join(
      uploadDir,
      `watermarked-${Date.now()}.png`
    );

    fs.writeFileSync(
      watermarkedPath,
      embedResponse.data
    );

    // =========================
    // Upload Watermarked Image to Cloudinary
    // =========================
    const watermarkedUpload = await cloudinary.uploader.upload(
      watermarkedPath,
      {
        folder: "medical-images/watermarked",
      }
    );

    // =========================
    // Save to MongoDB
    // =========================
    const savedImage = await Image.create({
      patientName,
      patientId,
      doctorId,
      uploadedBy: req.user.id,
      originalImage: originalUpload.secure_url,
      watermarkedImage: watermarkedUpload.secure_url,
      status: "Uploaded",
    });

    // =========================
    // Cleanup temp files safely
    // =========================
    if (req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (fs.existsSync(watermarkedPath)) {
      fs.unlinkSync(watermarkedPath);
    }

    // =========================
    // Success Response
    // =========================
    res.status(200).json({
      message: "Upload successful",
      
      originalImage: originalUpload.secure_url,
      watermarkedImage: watermarkedUpload.secure_url,
    });

  } catch (error) {
    console.log("UPLOAD ERROR:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};


// =========================
// Doctor Dashboard Images
// =========================
exports.getDoctorImages = async (req, res) => {
  try {
    const images = await Image.find({
      doctorId: req.user.id,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      status : images.status,
      image_id : images._id,
      patient_name : images.patientName,
      original_image : images.originalImage,
      watermarked_image : images.watermarkedImage,

    });

  } catch (error) {
    console.log("LIST ERROR:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};


// =========================
// Verify Image
// =========================
exports.verifyImage = async (req, res) => {
  try {
    const imageId = req.params.id;
    const loggedInDoctorId = req.user.id;

    const image = await Image.findById(imageId);

    if (!image) {
      return res.status(404).json({
        error: "Image not found",
      });
    }

    // SECURITY CHECK:
    // Only assigned doctor can verify
    if (image.doctorId.toString() !== loggedInDoctorId) {
      return res.status(403).json({
        error: "Access denied. This image does not belong to you.",
      });
    }

    const form = new FormData();

    // Original image stream
    const originalStream = await axios.get(
      image.originalImage,
      {
        responseType: "stream",
      }
    );

    // Watermarked image stream
    const watermarkedStream = await axios.get(
      image.watermarkedImage,
      {
        responseType: "stream",
      }
    );

    form.append(
      "original_file",
      originalStream.data
    );

    form.append(
      "watermarked_file",
      watermarkedStream.data
    );

    // Call ML API
    const extractResponse = await axios.post(
      "https://watermarking-1-oi51.onrender.com/extract",
      form,
      {
        headers: form.getHeaders(),
      }
    );

    // Save verification result
    image.verificationResult = {
      geometric_check: extractResponse.data.geometric_check,
      integrity_check: extractResponse.data.integrity_check,
      psnr: extractResponse.data.psnr,
      mse: extractResponse.data.mse,
      ssim: extractResponse.data.ssim,
    };

    image.status = "Verified";

    await image.save();

    res.status(200).json({
      message: "Verification successful",
      result: extractResponse.data,
    });

  } catch (error) {
    console.log("VERIFY ERROR:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};