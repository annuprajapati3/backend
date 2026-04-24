const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const cloudinary = require("cloudinary").v2;

const Image = require("../models/Image");

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

    // patientId from logged-in user token
    const patientId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        error: "Image file is required",
      });
    }
    console.log(cloudinary.config());

    // Upload Original Image to Cloudinary
    const originalUpload = await cloudinary.uploader.upload(
      req.file.path,
      {
        folder: "medical-images/original",
      }
    );

    // Send image to ML API for watermark embedding
    const form = new FormData();
    form.append("file", fs.createReadStream(req.file.path));
    form.append("text", text);

    const embedResponse = await axios.post(
      "https://watermarking-1-oi51.onrender.com/embed",
      form,
      {
        headers: form.getHeaders(),
        responseType: "arraybuffer",
      }
    );

    // temp file for returned watermarked image
    const watermarkedPath = `uploads/watermarked-${Date.now()}.png`;

    fs.writeFileSync(
      watermarkedPath,
      embedResponse.data
    );

    // Upload Watermarked Image to Cloudinary
    const watermarkedUpload = await cloudinary.uploader.upload(
      watermarkedPath,
      {
        folder: "medical-images/watermarked",
      }
    );

    // Save to MongoDB
    const savedImage = await Image.create({
      patientName,
      patientId, // from token
      doctorId,
      uploadedBy: req.user.id,
      originalImage: originalUpload.secure_url,
      watermarkedImage: watermarkedUpload.secure_url,
      status: "Uploaded",
    });

    // cleanup temp files
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (fs.existsSync(watermarkedPath)) {
      fs.unlinkSync(watermarkedPath);
    }

    res.status(200).json({
      message: "Upload successful",
      data: savedImage,
    });

  } catch (error) {
    console.log("UPLOAD ERROR:", error.message);

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

    res.status(200).json(images);
  } catch (error) {
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

    const image = await Image.findById(imageId);

    if (!image) {
      return res.status(404).json({
        error: "Image not found",
      });
    }

    const form = new FormData();

    form.append(
      "original_file",
      await axios.get(image.originalImage, {
        responseType: "stream",
      }).then(res => res.data)
    );

    form.append(
      "watermarked_file",
      await axios.get(image.watermarkedImage, {
        responseType: "stream",
      }).then(res => res.data)
    );

    const extractResponse = await axios.post(
      "https://watermarking-1-oi51.onrender.com/extract",
      form,
      {
        headers: form.getHeaders(),
      }
    );

    image.verificationResult = extractResponse.data;
    image.status = "Verified";

    await image.save();

    res.status(200).json({
      message: "Verification successful",
      result: extractResponse.data,
    });
  } catch (error) {
    console.log("VERIFY ERROR:", error.message);

    res.status(500).json({
      error: error.message,
    });
  }
};