const mongoose = require("mongoose");
const device_status_schema = new mongoose.Schema({
    number: String,
    status : {
        type: String,
        default: 'none'
    },
    state : {
        type: String,
        default: '0'
    }
    },
    { timestamps: true }
);
 
//Image is a model which has a schema imageSchema
const device_status = mongoose.model('device_status', device_status_schema);
module.exports = device_status;