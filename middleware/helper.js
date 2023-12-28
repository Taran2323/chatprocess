const jwt = require("jsonwebtoken");
const secret = "testingEncription123@";
const User = require("../models/chatschema");

module.exports = {
  // userId: () => {
  //   return "65097965bb8ecec67f5959f5";
  // },
  checkValidation: async (v) => {
    var errorsResponse;

    await v.check().then(function (matched) {
      if (!matched) {
        var valdErrors = v.errors;
        var respErrors = [];
        Object.keys(valdErrors).forEach(function (key) {
          if (valdErrors && valdErrors[key] && valdErrors[key].message) {
            respErrors.push(valdErrors[key].message);
          }
        });
        errorsResponse = respErrors.join(", ");
      }
    });
    return errorsResponse;
  },

  failed: (res, message = "") => {
    message =
      typeof message === "object"
        ? message.message
          ? message.message
          : ""
        : message;
    return res.status(400).json({
      success: false,
      code: 400,
      message: message,
      body: {},
    });
  },
  success: (res, message = "", body = {}) => {
    return res.status(200).json({
      success: true,
      code: 200,
      message: message,
      body: body,
    });
    node;
  },
  async fileUpload(files, folder = "users") {
    const file_name_string = files.name;
    const file_name_array = file_name_string.split(".");
    const file_ext = file_name_array[file_name_array.length - 1];

    const letters = "ABCDE1234567890FGHJK1234567890MNPQRSTUXY";
    let result = "";

    while (result.length < 28) {
      const rand_int = Math.floor(Math.random() * 19 + 1);
      const rand_chr = letters[rand_int];
      if (result.substr(-1, 1) !== rand_chr) result += rand_chr;
    }

    const resultExt = `${result}.${file_ext}`;

    console.log("🚀 ~ file: file.js:2--1 ~ fileUpload ~ resultExt:", resultExt);
    await files.mv(`public/images/${folder}/${resultExt}`, function (err) {
      if (err) {
        throw err;
      }
    });

    return resultExt;
  },
  verifyToken: async (req, res, next) => {
    let token;
    const { authorization } = req.headers;
    if (authorization && authorization.startsWith("Bearer")) {
      try {
        token = authorization.split(" ")[1];

        req.user = await User.findById({ _id: data._id }).select("-password");

        next();
      } catch (error) {
        console.log("what error.....", error);
      }
    }
    if (!token) {
      res
        .status(401)
        .send({ status: "failed", message: "Unauthorized User, No Token" });
    }
  },
  authenticateJWT: async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = authHeader.split(" ")[1];
      jwt.verify(token, secret, async (err, user) => {
        if (err) {
          return res.sendStatus(403);
        }
        let userInfo = await User.findOne({
          _id: user._id,
        });

        if (userInfo) {
          userInfo = JSON.parse(JSON.stringify(userInfo));
          req.user = userInfo;
          console.log(req.user);
          next();
        } else {
          return helper.error(res, "Please Login First");
        }
      });
    } else {
      res.sendStatus(401);
    }
  },
};
