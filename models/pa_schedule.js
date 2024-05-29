const mongoose = require("mongoose");
const PAScheduleSchema = new mongoose.Schema({
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
  hostname: {
     type: String,
     default: "0",
   },
  filename: {
    type: String,
    default: "",
  },
  file_id: {
    type: String,
    default: "",
  },
  pa_plan_id: {
    type: String,
    default: "0",
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
const PASchedule = mongoose.model("PASchedule", PAScheduleSchema);
module.exports = PASchedule;
