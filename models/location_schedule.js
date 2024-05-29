const mongoose = require("mongoose");
const LocationScheduleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  uuid: {
    type: String,
    required: true
  },
  location_list: {
    type: String,
    default: "0",
  },
  number_list: {
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
  hostname: {
     type: String,
     default: "0",
   },
  filename: {
    type: String,
    default: "",
  },
  play_time: {
    type: String,
    default: "0",
   },
  play_duration: {
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
const LocationSchedule = mongoose.model("LocationSchedule", LocationScheduleSchema);
module.exports = LocationSchedule;
