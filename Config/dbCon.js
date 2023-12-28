const mongoose = require("mongoose");
module.exports = async () => {
  mongoose
    .connect("mongodb://127.0.0.1:27017/chatprocess", {
      //   useUnifiedTopology: true,
      //   usenewurlparser: true,
    })
    .then(() => {
      console.log("connect");
    })
    .catch((err) => {
      console.log(err);
      console.log("disconnect");
    });
};
