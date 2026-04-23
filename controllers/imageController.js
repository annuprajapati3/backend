const path = require("path");
const fs = require("fs");
const Image = require("../models/Image");
const { callExtractAPI } = require("../utils/mlService");

exports.verifyImage = async (req, res) => {
  try {
    const { imageId } = req.body;
    const doctorId = req.user.id;

    // 🔹 Get image for this doctor
    const image = await Image.findOne({
      _id: imageId,
      doctorId
    });

    if (!image) {
      return res.status(403).json({
        msg: "Unauthorized"
      });
    }

    // 🔥 FIX: Convert URL → REAL PATH
    const originalPath = path.join(process.cwd(), image.originalImageUrl);
    const watermarkedPath = path.join(process.cwd(), image.watermarkedImageUrl);

    // 🔍 DEBUG LOGS (VERY IMPORTANT)
    console.log("Original Path:", originalPath);
    console.log("Watermarked Path:", watermarkedPath);

    const originalExists = fs.existsSync(originalPath);
    const watermarkedExists = fs.existsSync(watermarkedPath);

    console.log("Original Exists:", originalExists);
    console.log("Watermarked Exists:", watermarkedExists);

    // 🚨 HANDLE MISSING FILES
    if (!originalExists || !watermarkedExists) {
      return res.status(400).json({
        error: "Files not found on server (Render deletes uploads). Upload again."
      });
    }

    // 🔹 Call ML Extract API
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
    console.error("Verify Controller Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};