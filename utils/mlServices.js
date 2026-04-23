const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

// ✅ FIXED ML BASE
const ML_BASE = "https://watermarking-1-oi51.onrender.com";


// 🔹 EMBED API
exports.callEmbedAPI = async (file, report) => {
  try {
    const uploadDir = path.join(process.cwd(), "uploads");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }

    const tempPath = path.join(
      uploadDir,
      "temp_" + Date.now() + "_" + file.originalname
    );

    fs.writeFileSync(tempPath, file.buffer);

    const formData = new FormData();

    // ✅ correct fields
    formData.append("file", fs.createReadStream(tempPath));
    formData.append("text", report);

    const res = await axios.post(
      `${ML_BASE}/embed`,   // ✅ CORRECT
      formData,
      {
        headers: formData.getHeaders(),
        responseType: "arraybuffer",
        timeout: 60000
      }
    );

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


// 🔹 EXTRACT API
exports.callExtractAPI = async (originalPath, watermarkedPath) => {
  try {
    const formData = new FormData();

    // ✅ correct fields (from your docs)
    formData.append(
      "original_file",
      fs.createReadStream(originalPath)
    );

    formData.append(
      "watermarked_file",
      fs.createReadStream(watermarkedPath)
    );

    const res = await axios.post(
      `${ML_BASE}/extract`,   // ✅ CORRECT
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