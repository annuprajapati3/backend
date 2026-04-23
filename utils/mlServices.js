const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

const ML_BASE = process.env.ML_BASE || "https://watermarking-byiy.onrender.com";


// 🔹 EMBED API (already correct)
exports.callEmbedAPI = async (file, report) => {
  try {
    const tempPath = path.join(
      __dirname,
      "../uploads/temp_" + Date.now() + "_" + file.originalname
    );

    fs.writeFileSync(tempPath, file.buffer);

    const formData = new FormData();

    formData.append("file", fs.createReadStream(tempPath));
    formData.append("text", report);

    const res = await axios.post(
      `${ML_BASE}/embed`,
      formData,
      {
        headers: formData.getHeaders(),
        responseType: "arraybuffer"
      }
    );

    fs.unlinkSync(tempPath);

    return res.data;

  } catch (error) {
    console.error("Embed API Error:", error.response?.data || error.message);
    throw new Error("Embed API failed");
  }
};


// 🔹 EXTRACT API (FINAL FIX HERE)
exports.callExtractAPI = async (originalPath, watermarkedPath) => {
  try {
    const formData = new FormData();

    // ✅ EXACT FIELD NAMES (FROM YOUR SWAGGER)
    formData.append("original_file", fs.createReadStream(originalPath));
    formData.append("watermarked_file", fs.createReadStream(watermarkedPath));

    const res = await axios.post(
      `${ML_BASE}/extract`,
      formData,
      {
        headers: formData.getHeaders()
      }
    );

    return res.data;

  } catch (error) {
    console.error(
      "Extract API Error:",
      JSON.stringify(error.response?.data, null, 2)
    );

    throw new Error("Extract API failed");
  }
};