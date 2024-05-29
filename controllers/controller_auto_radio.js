const path = require('path');
const autoPARadioModel = require('../models/pa_auto_radio');
const uuid = require('uuid');
const dotenv = require("dotenv").config();
const api_play = require("./controller_api_player")
var moment = require("moment");
const mongoose = require("mongoose");

const auto_pa_radio_view = (req, res) => {
  console.log("Controller: pa_plan : Get auto PA radio view from username = " + req.user.name);
  var query = req.params.query;
  if(query == undefined) query = '-';
 
  res.render("pa_auto_radio", {
    user: req.user,
    location: query
  });
};

const auto_pa_radio_add = (req, res) => {
    console.log("Controller: auto radio : Get auto PA radio add for location = " + req.body.location_name);
    var resData = {
        code : 1,
        msg : null
    }
    //console.log(req.body);
    let _save_data = {
        name: req.body.station_name,
        uuid: uuid.v1().replace('/-/g',''),
        location_id: req.body.location_id,
        location_name: req.body.location_name,
        location_number: req.body.location_number,
        play_day: req.body.play_day,
        play_start: req.body.play_start,
        play_length: req.body.play_length,
        owner: req.user._id,
        owner_id: req.user._id,
        sip_username: req.body.sip_username,
        sip_password: req.body.sip_password,
        station_name: req.body.station_name,
        station_url: req.body.station_url,
        priority: 0,
        status : 'enable'
      }
      //console.log(_save_data);
    autoPARadioModel.countDocuments({ location_id: req.body.location_id} )
    .then(quantity => {
        if(quantity < 4) {
            autoPARadioModel.create(_save_data)
            .then((result) => {
                //console.log(result)
                resData.code = 0;
                resData.msg = 'OK';
                resData.data = result;
                res.json(resData);
            })
        } else {
            resData.code = 2;
            resData.msg = 'Over limit';
            res.json(resData);
        }
    })
    .catch((err) => {
        resData.msg = 'Can not add: ' + err;
        res.json(resData);
    })
}
const auto_pa_radio_edit = (req, res) => {
    console.log("Controller: auto radio : Edit auto PA radio edit for uuid = " + req.body.uuid);
    var resData = {
        code : 1,
        msg : null
    }
    autoPARadioModel.findOneAndUpdate({ uuid : req.body.uuid}, {
        station_name : req.body.station_name,
        station_url : req.body.station_url,
        play_day: req.body.play_day,
        play_start: req.body.play_start,
        play_length: req.body.play_length
    }, {new: true} ).then((_res) => {
        //console.log(_res);
        resData.code = 0;
        resData.msg = "OK";
        res.json(resData);
    })
    .catch((err) => {
        resData.msg = 'Can not add: ' + err;
        res.json(resData);
    })
}
const auto_pa_radio_delete = (req, res) => {
    console.log("Controller: auto radio : Get auto PA radio delete for uuid = " + req.body.uuid);
    var resData = {
        code : 1,
        msg : null
    }
    autoPARadioModel.deleteOne({uuid : req.body.uuid })
    .then((result) => {
        //console.log(result)
        resData.code = 0;
        resData.msg = 'OK';
        resData.data = result;
        res.json(resData);
    })
    .catch((err) => {
        resData.msg = 'Can not delete: ' + err;
        res.json(resData);
    })
    
}
const auto_pa_radio_list = (req, res) => {
    console.log("Controller: auto radio : Get auto PA radio list for location = " + req.body.location_id);
    var resData = {
        code : 1,
        msg : null
    }
    autoPARadioModel.find({ location_id : req.body.location_id })
    .then((result) => {
        //console.log(result)
        resData.code = 0;
        resData.msg = 'OK';
        resData.data = result;
        res.json(resData);
    })
}
const auto_pa_radio_get = (req, res) => {
    console.log("Controller: auto radio : Get auto PA radio for id = " + req.body.uuid);
    var resData = {
        code : 1,
        msg : null
    }
    autoPARadioModel.findOne({ uuid: req.body.uuid })
    .then((result) => {
        //console.log(result)
        resData.code = 0;
        resData.msg = 'OK';
        resData.data = result;
        res.json(resData);
    })
}
const auto_pa_radio_play = (req, res) => {
    console.log("Controller: auto radio : Auto PA radio play for id = " + req.body.uuid);
    var resData = {
        code : 1,
        msg : null
    }
    autoPARadioModel.findOne({ uuid : req.body.uuid })
    .then((result) => {
        //console.log(result)
        let _play_data = {
            sip_username : result.sip_username,
            sip_password : result.sip_password,
            location_number : result.location_number,
            station_url : result.station_url,
            play_duration : 30 //Play for test only
        }
        //console.log(_play_data)
        api_play.api_radio_play(_play_data);
        resData.code = 0;
        resData.msg = 'OK';
        resData.data = result;
        res.json(resData);
    })
    .catch((err) => {
        console.log(err);
        res.json(resData);
    })
}
const auto_pa_radio_pause = (req, res) => {
    console.log("Controller: auto radio : Auto PA radio pause for id = " + req.body.uuid);
    var resData = {
        code : 1,
        msg : null
    }
    autoPARadioModel.findOne({ uuid : req.body.uuid })
    .then(async (result) => {
        //console.log(result);
        let doc = undefined;
        if(result.status == 'enable') {
            doc = await autoPARadioModel.findOneAndUpdate({ uuid : req.body.uuid }, { status : 'disable'}, {new: true});
            resData.msg = 'Disabled';
        } else {
            doc = await autoPARadioModel.findOneAndUpdate({ uuid : req.body.uuid }, { status : 'enable'}, {new: true});
            resData.msg = 'Enabled';
        }
        resData.code = 0;
        resData.data = doc;
        //console.log(resData);
        res.json(resData);
    })
}
const auto_pa_radio_schedule = () => {
    let date_ob = new Date();
    console.log("Controller: auto radio : Check Auto PA radio schedule at " + date_ob.getTime());
    let day_of_week = ['mon','tue','wed','thu','fri','sat','sun'];
    let day = day_of_week[date_ob.getDay()-1];
    let hour = date_ob.getHours(); //date_now.format('HH'); 
    let minute = date_ob.getMinutes(); //date_now.format('MM');
    //console.log("This time = " + day + " " + hour + " " + minute);
    autoPARadioModel.find({}).then((play_table) => {
        for(let _play_location of play_table) {
            if(_play_location.status == 'enable') {
                //console.log(_play_location.location_id + ":" + _play_location.play_day + ":" + _play_location.play_start + ":" + _play_location.play_length);
                if(_play_location.play_day.includes(day)) {
                    //console.log('Day matched');
                    let _now = hour + ":" + minute;
                    //console.log(_play_location.play_start + " vs " + _now);
                    if(_play_location.play_start == _now) {
                        //console.log('Time matched');
                        let _play_data = {
                            sip_username : _play_location.sip_username,
                            sip_password : _play_location.sip_password,
                            location_number : _play_location.location_number,
                            station_url : _play_location.station_url,
                            play_duration : _play_location.play_length
                        }
                        //console.log(_play_data)
                        api_play.api_radio_play(_play_data);
                    }
                }
            } else {
                console.log('Station disabled.');
            }
        }
        return 0;
    })
    .catch((error) => {
        console.log("Error : " + error);
        return error;
    })
}

module.exports = {
    auto_pa_radio_view,
    auto_pa_radio_add,
    auto_pa_radio_edit,
    auto_pa_radio_delete,
    auto_pa_radio_list,
    auto_pa_radio_get,
    auto_pa_radio_pause,
    auto_pa_radio_play,
    auto_pa_radio_schedule
};