const nodemailer = require("nodemailer");
const { Validator } = require("node-input-validator");
const helper = require("../middleware/helper");
const user = require("../models/chatschema");
var jwt = require("jsonwebtoken");
var CryptoJS = require("crypto-js");

const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "f2090f1a179df5",
    pass: "ee3b7a49d45b1e",
  },
});
const secret = "testingEncription123@";
module.exports = {
  signup: async (req, res) => {
    try {
      if (req.files && req.files.image) {
        var image = req.files.image;

        if (image) {
          image = await helper.fileUpload(image, "profile");
        }
      }
      const v = new Validator(req.body, {
        email: "required|email",
        password: "required|minLength:6|maxLength:6",
        name: "required",
        phonenumber: "required|integer|minLength:10|maxLength:15",
      });
      let errorsResponse = await helper.checkValidation(v);

      if (errorsResponse) {
        return helper.failed(res, errorsResponse);
      }

      const otp = Math.floor(1000 + Math.random() * 9000);
      // const otp = 1111;

      let data = await user.findOne({ email: req.body.email });

      if (data) {
        return res.status(402).send({
          message: "User already registered ",
          success: true,
        });
      }

      const hash = CryptoJS.AES.encrypt(
        req.body.password.toString(),
        secret
      ).toString();

      let add_data = await user.create({
        name: req.body.name,
        email: req.body.email,
        phonenumber: req.body.phonenumber,
        file: image,
        password: hash,
        otp: otp,
      });

      const info = await transporter.sendMail({
        from: '"Fred Foo 👻" <foo@example.com>', // sender address
        to: req.body.email, // list      receivers
        subject: "Hello ✔", // Subject line
        text: "Hello world?", // plain text
        html: `<b>Otp : ${otp}</b>`, // html body
      });

      let userDatails = await user.findOne({ email: req.body.email });
      userDatails = JSON.parse(JSON.stringify(userDatails));
      var token = jwt.sign(userDatails, secret);

      userDatails.token = token;
      const result = await add_data.save();

      return res.status(201).send({
        message: "User created successfully",
        success: true,
        body: userDatails,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        success: false,
        code: 400,
        message: "something went wrong",
        body: {},
      });
    }
  },
  verifyOtp: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        email: "required|email",
        otp: "required|integer|minLength:4|maxLength:4",
      });
      let errorsResponse = await helper.checkValidation(v);

      if (errorsResponse) {
        return helper.failed(res, errorsResponse);
      }

      const isEmailExist = await user.findOne({ email: req.body.email });

      if (!isEmailExist) {
        return helper.failed(res, "email not found");
      }

      if (isEmailExist.otp !== req.body.otp) {
        return helper.failed(res, "otp is not valid");
      }

      const result = await user.findByIdAndUpdate(
        { _id: isEmailExist._id },
        {
          otp: "",
          isVerified: true,
        }
      );

      if (result) {
        return helper.success(res, "otp verified success");
      }
      return helper.failed(res, "Something went wrong");
    } catch (error) {}
  },
  getProfile: async (req, res) => {
    try {
      const userInfo = await user
        .findById({ _id: req.user._id })
        .select("-password -otp");
      if (userInfo) {
        return helper.success(res, "profile get success", userInfo);
      }
      return helper.failed(res, "Something went wrong");
    } catch (error) {
      console.log(error);
    }
  },
  updateprofile: async (req, res) => {
    try {
      if (req.files && req.files.image) {
        var image = req.files.image;

        if (image) {
          image = await helper.fileUpload(image, "profile");
        }
      }
      const v = new Validator(req.body, {
        name: "required",
        email: "required",
        phonenumber: "required",
      });
      let errorsResponse = await helper.checkValidation(v);

      if (errorsResponse) {
        return helper.failed(res, errorsResponse);
      }

      let add_data = await user.findByIdAndUpdate(
        { _id: req.body._id },
        {
          name: req.body.name.trim(),
          email: req.body.email,
          phonenumber: req.body.phonenumber,
          file: image,
        }
      );

      const result = await add_data.save();
      return res.status(201).send({
        message: "Edit successfully",
        success: true,
        add_data: result,
      });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        success: false,
        code: 400,
        message: "something went wrong",
        body: {},
      });
    }
  },
};
