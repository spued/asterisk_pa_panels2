const express = require("express");
const https = require("https");
const fs = require("fs");

const app = express();
const mongoose = require("mongoose");

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const cron = require("node-cron");
// Importing file-store module

var winston = require("winston"); // for transports.Console
var expressWinston = require("express-winston");
const { loginCheck } = require("./utils/passport");
const passport = require("passport");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// cookie parser middleware
app.use(cookieParser());
// add timestamps in front of log messages
require("console-stamp")(console, "yyyymmdd HH:MM:ss.l");

const session = require("express-session");
const filestore = require("session-file-store")(session);
const oneDay = 1000 * 60 * 60 * 24;
app.use(
  session({
    secret: "pa_panels_my_body_ok_good",
    cookie: { maxAge: oneDay, secure: false },
    saveUninitialized: true,
    resave: true,
    store: new filestore({ logFn: function () {} }),
    retries: 0,
  })
);

// Mongo DB conncetion
const database = process.env.MONGODB_URI;
mongoose
  .connect(database + "/users", {
    useUnifiedTopology: true,
    useNewUrlParser: true,
  })
  .then(() => console.log("DB connected."))
  .catch((err) => console.log(err));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use("/adminlte", express.static("./node_modules/admin-lte"));
app.use("/public", express.static("./public"));
app.use("/public/js", express.static("./node_modules/select2/dist/js"));
app.use("/public/css", express.static("./node_modules/select2/dist/css"));

app.use(express.static(__dirname));
app.use(passport.initialize());
app.use(passport.session());
loginCheck(passport);

app.use(
  expressWinston.logger({
    level: process.env === "development" ? "debug" : "info",
    transports: [new winston.transports.Console()],
    format: winston.format.combine(
      //winston.format.colorize(),
      winston.format.timestamp({
        format: "YYYY-MM-DD HH:mm:ss",
      }),
      winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
      )
      // winston.format.json()
    ),
    meta: false,
    msg: "HTTP  ",
    expressFormat: true,
    colorize: false,
    ignoreRoute: function (req, res) {
      return false;
    },
  })
);

//Routes
app.use("/", require("./routes/main"));

/* app.use(expressWinston.errorLogger({

  transports: [
    new winston.transports.Console()
  ],
  format: winston.format.combine(
    //winston.format.colorize(),
    winston.format.json()
  )
})); */
// Schedule tasks to be run on the server.
const {
  api_device_update_status,
} = require("./controllers/controller_device_manager");
const {
  local_check_schedules,
} = require("./controllers/controller_schedule_player");
const {
  auto_pa_radio_schedule,
} = require("./controllers/controller_auto_radio");
cron.schedule("* * * * *", function () {
  console.log("running a task 1 minutes");
  /* function randomInteger(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
  } */
  if (process.env.NODE_ENV == "development") {
    /* api_device_rrd_log({
      total_device: randomInteger(0,100),
      online_device: randomInteger(0,100),
      offline_device: randomInteger(0,80),
      using_device: randomInteger(0,50)
    }); */
    //console.log("-- Scheduler : start auto PA Radio");
    //auto_pa_radio_schedule();
  }
  if (process.env.NODE_ENV == "production") {
    local_check_schedules();
    //console.log("-- Scheduler : start auto PA Radio");
    auto_pa_radio_schedule();
  }
});
cron.schedule("*/15 * * * * *", function () {
  //console.log('running a task 15 seconds');
  if (process.env.NODE_ENV == "development") {
  }
  if (process.env.NODE_ENV == "production") {
    api_device_update_status();
  }
});
var https_options = {
  key: fs.readFileSync("./utils/certificate/star.nt-acs.net.key"),
  cert: fs.readFileSync("./utils/certificate/star_nt-acs_net_cert.pem"),
  ca: fs.readFileSync("./utils/certificate/ChainCA2.crt"),
};
var PORT = process.env.PORT || 4001;
if (process.env.NODE_ENV == "staging") PORT = 4101;
console.log("Server environment using : " + process.env.NODE_ENV);
https
  .createServer(https_options, app)
  .listen(PORT, console.log("Server has started at port " + PORT));
