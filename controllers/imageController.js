const Image = require("../models/Image");
const { callEmbedAPI, callExtractAPI } = require("../utils/mlServices");

const fs = require("fs");
const path = require("path");

// ✅ FIXED UPLOAD DIR (IMPORTANT)
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// ensure uploads folder exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// helper for frontend URL
const formatImageUrl = (fileName) => {
  return `/uploads/${fileName}`;
};



// ========================
// 🔹 UPLOAD IMAGE
// ========================
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

    // 🔥 ORIGINAL FILE
    const originalFileName =
      Date.now() + "_original_" + req.file.originalname;

    const originalPath = path.join(UPLOAD_DIR, originalFileName);

    fs.writeFileSync(originalPath, req.file.buffer);

    console.log("UPLOAD SUCCESS:", originalPath);

    // 🔥 CALL ML EMBED
    const watermarkedBuffer = await callEmbedAPI(req.file, report);

    // 🔥 WATERMARKED FILE
    const watermarkedFileName =
      Date.now() + "_wm.png";

    const watermarkedPath = path.join(UPLOAD_DIR, watermarkedFileName);

    fs.writeFileSync(watermarkedPath, watermarkedBuffer);

    // 🔥 SAVE DB (ONLY FILENAMES — IMPORTANT FIX)
    const newImage = await Image.create({
      patientId,
      doctorId,
      patientName,
      reportText: report,

      originalImageUrl: originalFileName,
      watermarkedImageUrl: watermarkedFileName
    });

    res.json({
      message: "Upload successful",
      
    });

  } catch (err) {
    console.error("UPLOAD ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};



// ========================
// 🔹 VERIFY IMAGE (FIXED)
// ========================
exports.verifyImage = async (req, res) => {
  try {
    const { imageId } = req.body;
    const doctorId = req.user.id || req.user._id;

    const image = await Image.findOne({
      _id: imageId,
      doctorId
    });

    if (!image) {
      return res.status(403).json({ msg: "Image not found" });
    }

    // 🔥 CLEAN FILE NAMES (NO PATH BUG)
    const originalFile = image.originalImageUrl;
    const watermarkedFile = image.watermarkedImageUrl;

    // 🔥 BUILD SAFE PATH
    const originalPath = path.join(UPLOAD_DIR, originalFile);
    const watermarkedPath = path.join(UPLOAD_DIR, watermarkedFile);

    console.log(originalPath, watermarkedPath);

    const originalExists = fs.existsSync(originalPath);
    const watermarkedExists = fs.existsSync(watermarkedPath);

    console.log("FILE CHECK:", { originalExists, watermarkedExists });
    if (!originalExists || !watermarkedExists) {
      return res.status(400).json({
        error: "File missing for verification"
      });
    }

    // 🔥 CALL ML API
    const mlRes = await callExtractAPI(originalPath, watermarkedPath);

    const status =
      mlRes.integrity_check === "Authentic"
        ? "SAFE"
        : "TAMPERED";

    res.json({
      status,
      details: mlRes
    });

  } catch (err) {
    console.error("VERIFY ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};



// ========================
// 🔹 GET IMAGES
// ========================
exports.getImages = async (req, res) => {
  try {
    const doctorId = req.user.id || req.user._id;

    const images = await Image.find({ doctorId }).sort({ createdAt: -1 });

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