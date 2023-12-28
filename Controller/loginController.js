const User = require("../models/chatschema");
var jwt = require("jsonwebtoken");
var CryptoJS = require("crypto-js");
const helper = require("../middleware/helper");
const secret = "testingEncription123@";

module.exports = {
  postlogin: async (req, res) => {
    const { email, password } = req.body;

    try {
      let user = await User.findOne({ email: email });

      if (!user) {
        return helper.failed(res, "user not found");
      }

      var bytes = CryptoJS.AES.decrypt(user.password, secret);
      var originalText = bytes.toString(CryptoJS.enc.Utf8);

      if (password !== originalText) {
        return helper.failed(res, "password not matched");
      }
      user = JSON.parse(JSON.stringify(user));

      var token = jwt.sign(user, secret);

      user.token = token;
      res.status(200).json(user);
    } catch (err) {
      res.status(400).json(err.message);
    }
  },
};
