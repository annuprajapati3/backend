const DoctorProfile = require("../models/DoctorProfile");
const User = require("../models/User");
const express = require("express");
const router = express.Router();
router.post("/doctor-profile", async (req, res) => {
  try {
    const {
      email,
      qualification,
      specialization,
      registrationNo,
      experience,
      hospital
    } = req.body;

    // find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // check if doctor profile already exists
    const existingDoctor = await DoctorProfile.findOne({ userId: user._id });

    if (existingDoctor) {
      return res.status(400).json({
        message: "Doctor profile already exists for this user"
      });
    }

    // create doctor profile
    const profile = await DoctorProfile.create({
      userId: user._id,
      qualification,
      specialization,
      registrationNo,
      experience,
      hospital
    });

    res.json({
      message: "Doctor profile created"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get("/doctors", async (req, res) => {
  try {

    const doctors = await DoctorProfile.find()
      .populate("userId", "name email");

    const formattedDoctors = doctors.map((doc) => ({
      dr_id: doc.userId._id,
      name: doc.userId?.name,
      email: doc.userId?.email,
      qualification: doc.qualification,
      specialization: doc.specialization,
      registrationNo: doc.registrationNo,
      experience: doc.experience,
      hospital: doc.hospital
    }));

    res.json(formattedDoctors);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;