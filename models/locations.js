const mongoose = require("mongoose");
const LocationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  number: {
    type: String,
    required: true,
    default: "0",
  },
  address: {
   type: String,
   default: "default",
  },
  group: {
    type: String,
    default: "default",
  },
  owner: {
    type: String,
    default: "0",
  },
  owner_id: {
    type: String,
    default: "-",
  },
  type: {
    type: String,
    default: "location",
  },
  status: {
    type: String,
    default: "enable",
  },
  date: {
    type: Date,
    default: Date.now,
  },
});
const Location = mongoose.model("Location", LocationSchema);
module.exports = Location;
