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
    const doctorIdRaw = req.user.id || req.user._id;

    if (!imageId) {
      return res.status(400).json({ msg: "Image ID required" });
    }

    const doctorId = new mongoose.Types.ObjectId(doctorIdRaw);

    const image = await Image.findOne({
      _id: imageId,
      doctorId
    });

    if (!image) {
      return res.status(403).json({
        msg: "Unauthorized or image not found"
      });
    }

    // 🔥 Call ML extract
    const mlRes = await callExtractAPI(
      image.originalImageUrl,
      image.watermarkedImageUrl
    );

    const status =
      mlRes.integrity_check === "Authentic"
        ? "SAFE"
        : "TAMPERED";

    res.json({
      status,
      details: mlRes
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};