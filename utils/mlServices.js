const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

// ✅ Use env or fallback
const ML_BASE =
  process.env.ML_BASE || "https://watermarking-byiy.onrender.com";


// 🔹 EMBED API (Image + Text → Watermarked Image)
exports.callEmbedAPI = async (file, report) => {
  try {
    // ✅ Ensure uploads folder exists
    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }

    // ✅ Create temp file
    const tempPath = path.join(
      uploadDir,
      "temp_" + Date.now() + "_" + file.originalname
    );

    fs.writeFileSync(tempPath, file.buffer);

    const formData = new FormData();

    // ✅ Correct fields
    formData.append("file", fs.createReadStream(tempPath));
    formData.append("text", report);

    const res = await axios.post(
      `${ML_BASE}/api/embed`, // ✅ FIXED ENDPOINT
      formData,
      {
        headers: formData.getHeaders(),
        responseType: "arraybuffer",
        timeout: 60000 // important for Render
      }
    );

    // 🧹 delete temp file
    fs.unlinkSync(tempPath);

    return res.data;

  } catch (error) {
    console.error(
      "Embed API FULL ERROR:",
      JSON.stringify(error.response?.data, null, 2)
    );

    throw new Error("Embed API failed");
  }
};


// 🔹 EXTRACT API (Original + Watermarked → Verification)
exports.callExtractAPI = async (originalPath, watermarkedPath) => {
  try {
    const formData = new FormData();

    // ✅ EXACT field names (from your ML Swagger)
    formData.append(
      "original_file",
      fs.createReadStream(originalPath)
    );

    formData.append(
      "watermarked_file",
      fs.createReadStream(watermarkedPath)
    );

    const res = await axios.post(
      `${ML_BASE}/api/extract`, // ✅ FIXED ENDPOINT
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 60000
      }
    );

    return res.data;

  } catch (error) {
    console.error(
      "Extract API FULL ERROR:",
      JSON.stringify(error.response?.data, null, 2)
    );

    throw new Error("Extract API failed");
  }
};