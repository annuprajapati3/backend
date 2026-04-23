//routes/imageRoutes.js

const express = require("express");
const multer = require("multer");

const {
  uploadImage,
  getImages,
  verifyImage
} = require("../controllers/imageController");

const protect = require("../middleware/authMiddleware"); // ✅ your existing style
console.log("Auth Middleware Loaded:", protect); // ✅ debug log
const router = express.Router();
const upload = multer();

router.post("/upload", protect, upload.single("file"), uploadImage);
router.get("/list", protect, getImages);
router.post("/verify", protect, verifyImage);

module.exports = router;