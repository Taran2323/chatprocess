const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
  },
  phonenumber: {
    type: String,
  },
  password: {
    type: String,
  },
  passwordconfirm: {
    type: String,
  },
  otp: {
    type: String,
  },
  isVerified: {
    type: String,
  },
  address: {
    type: String,
  },
  idproof: {
    type: Number,
    enum: [0, 1, 2, 3],
  },
  file: {
    type: String,
  },
  experince: {
    type: String,
  },
  decription: {
    type: String,
  },
  skill: {
    type: String,
  },
  eduction: {
    type: String,
  },
  stream: {
    type: String,
  },
  fulltime: {
    type: Number,
    enum: [0],
  },
  parttime: {
    type: Number,
    enum: [1],
  },

  gender: {
    type: String,
    enum: ["Male", "Female"],
  },
  birthday: {
    type: Date,
  },
  about: {
    type: String,
  },
});
const user = mongoose.model("user", userSchema);
module.exports = user;
