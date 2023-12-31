var createError = require("http-errors");
var express = require("express");

var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const config = require("./Config/dbCon");
var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
const fileUpload = require("express-fileupload");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
let PORT = 3000;
// const socketIO = require("socket.io");

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(fileUpload());
app.use(express.static(path.join(__dirname, "public")));
config();
app.use("/", indexRouter);
app.use("/users", usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

console.log(io, ">>>>>>>>>>>>>>>>>>>>");
io.on("connection", (socket) => {});
// App listening on the below port
http.listen(PORT, function (err) {
  if (err) console.log(err);
  console.log("Server listening on PORT", PORT);
});

// module.exports = app;
