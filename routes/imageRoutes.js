const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  uploadMedicalImage,
  getDoctorImages,
  verifyImage,
} = require("../controllers/imageController");

const authMiddleware = require("../middleware/authMiddleware");

const storage = multer.diskStorage({});
const upload = multer({ storage });

router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  uploadMedicalImage
);

router.get(
  "/list",
  authMiddleware,
  getDoctorImages
);

router.post(
  "/verify/:id",
  authMiddleware,
  verifyImage
);

module.exports = router;