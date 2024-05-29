const mongoose = require("mongoose");
const PAAutoRadioSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  uuid: {
    type: String,
    required: true
  },
  location_id: {
    type: String,
    default: "0",
  },
  location_name: {
    type: String,
    default: "",
  },
  location_number: {
    type: String,
    default: "0",
  },
  sip_username: {
    type: String,
    default: "",
  },
  sip_password: {
     type: String,
     default: "",
   },
  station_name: {
     type: String,
     default: "",
   },
   station_url: {
    type: String,
    default: "",
  },
  play_day: {
    type: String,
    default: "0",
  },
  play_start: {
    type: String,
    default: "0",
  },
  play_length: {
    type: String,
    default: "0",
  },
  last_status: {
    type: String,
    default: "0",
  },
  owner: {
    type: String,
    default: "0",
  },
  owner_id: {
    type: String,
    default: "-",
  },
  priority: {
    type: String,
    default: "0",
  },
  type: {
    type: String,
    default: "default",
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
const PAAutoRadio = mongoose.model("PAAutoRadio", PAAutoRadioSchema);
module.exports = PAAutoRadio;
