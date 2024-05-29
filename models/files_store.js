const mongoose = require("mongoose");
const imageSchema = new mongoose.Schema({
    name: String,
    desc: String,
    size: String,
    originalname: String,
    owner: {
        type: String,
        default: 'unknow'
    },
    owner_id: {
        type: String,
        default: "-",
    },
    meta_data: {
        type: Object,
        default: null
    },
    status: {
        type: String,
        default: 'default'
    },
    score: {
        type: Number,
        default: 0
    },
    img:{
        data: Buffer,
        contentType: String
    }
    },
    { timestamps: true} 
);
 
//Image is a model which has a schema imageSchema
const imageModel = mongoose.model('voice_file', imageSchema);
module.exports = imageModel;