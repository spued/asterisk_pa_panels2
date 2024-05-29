const path = require("path");
const autoPAModel = require("../models/pa_schedule");
const uuid = require("uuid");
const dotenv = require("dotenv").config();

const auto_pa_view = (req, res) => {
  console.log(
    "Controller: pa_plan : Get auto pa view from username = " + req.user.name
  );
  var query = req.params.query;
  if (query == undefined) query = "-";

  res.render("auto_pa", {
    user: req.user,
    location: query,
  });
};
const api_auto_pa_list = (req, res) => {
  console.log(
    "Controller: auto pa : Get auto pa view from username = " + req.user.name
  );
  //console.log(req.body);
  var resData = {
    code: 1,
    message: "default",
    data: null,
  };

  autoPAModel
    .find({ location_id: req.body._id })
    .sort({ name: "asc" })
    .exec((err, doc) => {
      if (err) {
        console.log(err);
      } else {
        resData.code = 0;
        resData.message = "ok";
        resData.data = doc;
      }
      //console.log(resData);
      res.json(resData);
    });
};
const api_auto_pa_save = (req, res) => {
  console.log(
    "Controller: auto pa : Get auto pa SAVE from username = " + req.user.name
  );
  var resData = {
    code: 1,
    message: "default",
  };
  //console.log(req.user);
  let _save_data = {
    name: req.body.plan_name,
    uuid: uuid.v1().replace("/-/g", ""),
    location_id: req.body.location_id,
    location_number: req.body.location_number,
    pa_plan_id: req.body.plan_id,
    play_time: req.body.play_time,
    type: req.body.plan_type,
    play_duration: req.body.play_duration,
    file_id: req.body.file_id,
    filename: req.body.file_name,
    owner: req.user._id,
    owner_id: req.user._id,
    sip_username: req.user.sip_account,
    sip_password: req.user.sip_password,
    hostname: "astrapa.nt-acs.net",
    priority: req.body.plan_priority,
    status: "enable",
  };
  //console.log(_save_data);
  autoPAModel.create(_save_data).then((result) => {
    //console.log(result)
    resData.code = 0;
    resData.msg = "OK";
    resData.data = result;
    res.json(resData);
  });
};
const api_auto_pa_edit_save = (req, res) => {
  console.log(
    "Controller: Auto PA : Get edit from username = " + req.user.name
  );
  //console.log(req.body);
  var resData = {
    code: 1,
    message: "default",
  };
  autoPAModel.updateOne(
    { _id: req.body._id },
    {
      play_duration: req.body._duration,
      play_time: req.body._time,
    },
    { upsert: false },
    function (err, res) {
      if (err) console.log(err);
      //console.log(res);
    }
  );
  res.json(resData);
};
const api_auto_pa_id = (req, res) => {
  console.log(
    "Controller: auto pa : Get auto pa ID from username = " + req.user.name
  );
  //console.log(req.body);
  var resData = {
    code: 1,
    message: "default",
  };
  autoPAModel
    .findOne({
      _id: req.body._id,
      location_id: req.body.location_id,
    })
    .exec(function (err, doc) {
      if (err) {
        resData.message = err;
        res.json(resData);
      }
      resData.data = doc;
      resData.code = 0;
      resData.message = "ok";
      res.json(resData);
    });
};
const api_auto_pa_update_file = (req, res) => {
  console.log(
    "Controller: auto pa : Get auto pa UPDATE file from username = " +
      req.user.name
  );
  var resData = {
    code: 0,
    message: "ok",
  };

  let _update_data = {
    file_id: req.body.file_id,
    filename: req.body.file_name,
  };
  //console.log(_save_data);
  autoPAModel.updateMany(
    {
      pa_plan_id: req.body.plan_id,
    },
    _update_data,
    function (res) {}
  );
  res.json(resData);
};
const api_auto_pa_delete = (req, res) => {
  console.log("- Delete Auto PA for  for id = " + req.body._id);
  var resData = {
    code: 0,
    message: "ok",
  };
  autoPAModel.deleteOne(
    {
      _id: req.body._id,
      location_id: req.body.location_id,
    },
    (err, _res) => {
      if (err) {
        throw err;
      }
      res.json(resData);
    }
  );
};
const api_auto_pa_count_location = (req, res) => {
  console.log("Controller: Auto PA : count for  for id = " + req.body._id);
  var resData = {
    code: 1,
    message: "default",
  };
  autoPAModel.find({ location_id: req.body._id }).exec(function (err, doc) {
    resData.count = doc.length;
    resData.code = 0;
    resData.message = "ok";
    res.json(resData);
  });
};
module.exports = {
  auto_pa_view,
  api_auto_pa_id,
  api_auto_pa_list,
  api_auto_pa_save,
  api_auto_pa_count_location,
  api_auto_pa_delete,
  api_auto_pa_edit_save,
  api_auto_pa_update_file,
};
