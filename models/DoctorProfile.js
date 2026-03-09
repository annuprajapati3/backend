const mongoose = require("mongoose");

const doctorProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  qualification: String,
  specialization: String,
  registrationNo: String,
  experience: Number,
  hospital: String
});

module.exports = mongoose.model("DoctorProfile", doctorProfileSchema);