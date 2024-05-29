const mongoose = require("mongoose");
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  uuid: {
    type: String,
    default: "-",
    required: true
  },
  location: {
   type: String,
   default: "default",
  },
  group: {
    type: String,
    default: "default",
  },
  message: {
    type: String,
    default: "-",
  },
  note: {
    type: String,
    default: "-",
  },
  selection_start: {
    type: String,
    default: "0",
  },
  selection_end: {
    type: String,
    default: "0",
  },
  prefix: {
    type: String,
    default: "0",
  },
  logo_url: {
    type: String,
    default: "-",
  },
  sip_account: {
    type: String,
    default: "-",
  },
  sip_password: {
    type: String,
    default: "-",
  },
  api_key: {
    type: String,
    default: "-",
  },
  type: {
    type: String,
    default: "user",
  },
  status: {
    type: String,
    default: "disable",
  },
  date: {
    type: Date,
    default: Date.now,
  },
});
const User = mongoose.model("User", UserSchema);
module.exports = User;
