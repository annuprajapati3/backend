const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
  {
    patientName: {
      type: String,
      required: true,
    },

    patientId: {
      type: String,
      required: true,
    },

    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    originalImage: {
      type: String,
      required: true,
    },

    watermarkedImage: {
      type: String,
      required: true,
    },

    restoredImage: {
      type: String,
      default: "",
    },

    verificationResult: {
  geometric_check: {
    type: String,
    default: "",
  },
  integrity_check: {
    type: String,
    default: "",
  },
  psnr: {
    type: Number,
    default: 0,
  },
  mse: {
    type: Number,
    default: 0,
  },
  ssim: {
    type: Number,
    default: 0,
  },
},

    status: {
      type: String,
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Image", imageSchema);