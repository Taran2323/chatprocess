var express = require('express');
const signupController = require('../Controller/signupController');
const loginController = require('../Controller/loginController');
var router = express.Router();
const authenticateJWT = require("../middleware/helper").authenticateJWT;

/* GET home page. */
router.post("/signup", signupController.signup)
router.post("/login", authenticateJWT, loginController.postlogin);
router.get("/get", authenticateJWT,signupController.getProfile);



module.exports = router;
