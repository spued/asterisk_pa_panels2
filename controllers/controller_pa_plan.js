
const path = require('path');
const paPlanModel = require('../models/pa_plan');
const uuid = require('uuid');
const dotenv = require("dotenv").config();


const pa_plan_view = (req, res) => {
  console.log("Controller: pa_plan : Get pa plan view from username = " + req.user.name);
  var query = req.params.query;
  if(query == undefined) query = '-';
 
  res.render("pa_plan", {
    user: req.user,
    location: query
  });
};
const api_pa_plan_add = (req, res) => {
  console.log("Controller: pa_plan : Add pa plan from username = " + req.user.name);
  //console.log(req.body);

  var resData = {
    code : 1,
    message : 'default'
  };
  const _hour = req.body.hour.replace('.',':');
  var time = {
    hour : _hour,
    day : req.body.day,
    date : req.body.date,
    month : req.body.month
  }
  paPlanModel.create({
    name: req.body.name,
    uuid: uuid.v1().replace('/-/g',''),
    filename: req.body.filename,
    file_id: req.body.file_id,
    play_time: JSON.stringify(time),
    status: 'enable',
    type: req.body.type,
    owner: req.body.owner,
    owner_id: req.user._id
  },(res) => {
    //console.log(res);
  })
  res.json(resData);
};
const api_pa_plan_edit = (req, res) => {
  console.log("Controller: pa_plan : Edit pa plan from username = " + req.user.name);
  //console.log(req.body);

  var resData = {
    code : 1,
    message : 'default'
  };
  const _hour = req.body.hour.replace('.',':');
  var time = {
    hour : _hour,
    day : req.body.day,
    date : req.body.date,
    month : req.body.month
  }
  paPlanModel.updateOne({
    name: req.body.name,
    filename: req.body.filename,
    play_time: JSON.stringify(time),
    status: 'enable'
  },(res) => {
    console.log(res);
  })
  res.json(resData);
};
const api_pa_plan_list = (req, res) => {
  console.log("- List pa plan = " + req.body._id);
  var resData = {
    code : 1,
    message : 'default'
  };
  paPlanModel.find({})
  .sort({ name : 'asc' })
  .exec((err,_res) => {
    if(err) {
      throw err;
    }
    //console.log('-- get final status result = ' + _res);
    resData.data = _res;
    resData.code = 0;
    resData.message = 'ok';
    //console.log(resData);
    res.json(resData);
  });
};
const api_pa_plan_id = (req, res) => {
  console.log("- Read PA Plan for id = " + req.body._id + "by user id = " + req.user._id);
  //console.log(req.user);
  paPlanModel.findOne({ _id : req.body._id  }, (err,_res) => {
    if(err) {
      throw err;
    }
    //console.log(_res);
    res.json(_res);
  })
};
const api_pa_plan_save = (req, res) => {
  console.log('Controller: pa_plan : Save pa plan for id = %s', req.body._id);
  //console.log(req.body);
  var resData = {
    code : 1,
    message : 'default'
  };
  const _hour = req.body.hour.replace('.',':');
  var time = {
    hour : _hour,
    day : req.body.day,
    date : req.body.date,
    month : req.body.month
  }
  var savePAPlan = {
    name: req.body.name,
    type: req.body.type,
    priority: req.body.priority,
    filename: req.body.filename,
    file_lock: req.body.file_lock,
    file_id: req.body.file_id,
    play_time: JSON.stringify(time),
    status: req.body.status
  };
  const _id = req.body._id;
  //console.log(savePAPlan);
  paPlanModel.findOneAndUpdate( { _id: _id } , savePAPlan,{ new: true}, function(err,doc) {
    if (err) {
      //console.log(err);
      resData.code = 1;
      resData.message = err;
    }
    //console.log(doc);
    return res.json(resData);
  });
};
const api_pa_plan_delete = (req, res) => { 
  console.log("- Delete PA Plan for id = " + req.body._id);
  var resData = {
    code : 0,
    message : 'ok'
  };
  paPlanModel.deleteOne({ _id : req.body._id }, (err, _res) => {
    if(err){
      throw err;
    } 
    res.json(resData);
  })
  
};
module.exports = {
  pa_plan_view,
  api_pa_plan_add,
  api_pa_plan_edit,
  api_pa_plan_list,
  api_pa_plan_id,
  api_pa_plan_save,
  api_pa_plan_delete
};
