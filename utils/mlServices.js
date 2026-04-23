const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const ML_BASE = "https://watermarking-1-oi51.onrender.com";

exports.callExtractAPI = async (originalPath, watermarkedPath) => {
  try {
    const formData = new FormData();

    // ✅ Correct fields
    formData.append(
      "original_file",
      fs.createReadStream(originalPath)
    );

    formData.append(
      "watermarked_file",
      fs.createReadStream(watermarkedPath)
    );

    const res = await axios.post(
      `${ML_BASE}/extract`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 60000
      }
    );

    return res.data;

  } catch (error) {
    console.error("Extract ERROR MESSAGE:", error.message);
    console.error("Extract FULL ERROR:", error);

    throw new Error("Extract API failed");
  }
};