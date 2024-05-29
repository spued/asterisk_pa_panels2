const mongoose = require("mongoose");
const device_schema = new mongoose.Schema({
    name: String,
    sn: {
        type: String,
        required: true
    },
    desc: String,
    number: String,
    parent_id: {
        type: String,
        default: 'none'
    },
    device_type : {
        type: String,
        default: 'output'
    },
    owner: String,
    location: {
        type: String,
        default: 'none'
    },
    volume: {
        type: String,
        default: '0'
    },
    owner_id: {
        type: String,
        default: "-",
    },
    status : {
        type: String,
        default: 'none'
    }
    },
    { timestamps: true }
);
 
//Image is a model which has a schema imageSchema
const device_model = mongoose.model('device_profile', device_schema);
module.exports = device_model;