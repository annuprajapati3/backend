//controllers/imageController.js

const Image = require("../models/Image");
const { callEmbedAPI, callExtractAPI } = require("../utils/mlServices");

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const UPLOAD_DIR = "uploads/";

// 🔹 Helper: convert file path → URL
const formatImageUrl = (filePath) => {
  return "/" + filePath.replace(/\\/g, "/");
};


// 🔹 UPLOAD IMAGE (PATIENT)
exports.uploadImage = async (req, res) => {
  try {
    const { patientName, report, doctorId } = req.body;
    const patientId = req.user.id || req.user._id;

    if (!req.file) {
      return res.status(400).json({ msg: "Image required" });
    }

    if (!doctorId) {
      return res.status(400).json({ msg: "Doctor ID required" });
    }

    // ✅ Save original image
    const originalFileName =
      Date.now() + "_original_" + req.file.originalname;

    const originalPath = path.join(UPLOAD_DIR, originalFileName);
    fs.writeFileSync(originalPath, req.file.buffer);

    // 🔥 Call ML embed
    const watermarkedBuffer = await callEmbedAPI(req.file, report);

    // ✅ Save watermarked image
    const watermarkedFileName = Date.now() + "_wm.png";
    const watermarkedPath = path.join(UPLOAD_DIR, watermarkedFileName);

    fs.writeFileSync(watermarkedPath, watermarkedBuffer);

    // ✅ Save in DB
    const newImage = await Image.create({
      patientId,
      doctorId,
      patientName,
      reportText: report,
      originalImageUrl: originalPath,
      watermarkedImageUrl: watermarkedPath
    });

    res.json({
      message: "Upload successful",
      data: {
        _id: newImage._id,
        patientName: newImage.patientName,
        reportText: newImage.reportText,

        originalImageUrl: formatImageUrl(newImage.originalImageUrl),
        watermarkedImageUrl: formatImageUrl(newImage.watermarkedImageUrl),

        createdAt: newImage.createdAt
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// 🔹 GET IMAGES (DOCTOR)
exports.getImages = async (req, res) => {
  try {
    // ✅ FIX: handle id / _id + ObjectId
    const doctorIdRaw = req.user.id || req.user._id;

    if (!doctorIdRaw) {
      return res.status(400).json({ msg: "Doctor ID missing in token" });
    }

    const doctorId = new mongoose.Types.ObjectId(doctorIdRaw);

    console.log("Doctor ID from token:", doctorId.toString());

    const images = await Image.find({ doctorId })
      .sort({ createdAt: -1 });

    // ✅ convert to URLs
    const formatted = images.map(img => ({
      _id: img._id,
      patientName: img.patientName,
      reportText: img.reportText,

      originalImageUrl: formatImageUrl(img.originalImageUrl),
      watermarkedImageUrl: formatImageUrl(img.watermarkedImageUrl),

      createdAt: img.createdAt
    }));

    res.json(formatted);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// 🔹 VERIFY IMAGE (DOCTOR)

exports.verifyImage = async (req, res) => {
  try {
    const { imageId } = req.body;
    const doctorId = req.user.id || req.user._id;

    // 🔹 Get image
    const image = await Image.findOne({
      _id: imageId,
      doctorId
    });

    if (!image) {
      return res.status(403).json({ msg: "Unauthorized" });
    }

    // ✅ IMPORTANT FIX: extract only filename (safe fallback)
    const originalFileName = path.basename(image.originalImageUrl);
    const watermarkedFileName = path.basename(image.watermarkedImageUrl);

    // ✅ Build correct absolute path (NO duplication, NO URL confusion)
    const uploadDir = path.join(process.cwd(), "uploads");

    const originalPath = path.join(uploadDir, originalFileName);
    const watermarkedPath = path.join(uploadDir, watermarkedFileName);

    // 🔍 DEBUG
    console.log("UPLOAD DIR:", uploadDir);
    console.log("Original Path:", originalPath);
    console.log("Watermarked Path:", watermarkedPath);

    const originalExists = fs.existsSync(originalPath);
    const watermarkedExists = fs.existsSync(watermarkedPath);

    console.log("Original Exists:", originalExists);
    console.log("Watermarked Exists:", watermarkedExists);

    if (!originalExists || !watermarkedExists) {
      return res.status(400).json({
        error: "File missing on server (Render ephemeral storage issue)"
      });
    }

    // 🔥 Call ML API
    const mlRes = await callExtractAPI(originalPath, watermarkedPath);

    const status =
      mlRes.integrity_check === "Authentic"
        ? "SAFE"
        : "TAMPERED";

    return res.json({
      status,
      details: mlRes
    });

  } catch (err) {
    console.error("VERIFY ERROR:", err.message);
    return res.status(500).json({ error: err.message });
  }
};