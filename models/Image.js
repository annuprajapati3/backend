//models/Image.js

const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
  patientId: mongoose.Schema.Types.ObjectId,
  doctorId: mongoose.Schema.Types.ObjectId,

  patientName: String,
  reportText: String,

  originalImageUrl: String,
  watermarkedImageUrl: String,

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Image", imageSchema);