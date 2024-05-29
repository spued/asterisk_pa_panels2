const mongoose = require("mongoose");
const PAPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  uuid: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    default: "",
  },
  file_id: {
    type: String,
    default: "0",
  },
  file_lock: {
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
const PAPlan = mongoose.model("PAPlan", PAPlanSchema);
module.exports = PAPlan;
