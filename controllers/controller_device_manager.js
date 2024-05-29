const path = require("path");
const locationModel = require("../models/locations");
const deviceModel = require("../models/device_profile");
const deviceStatus = require("../models/device_status");
const autoPAModel = require("../models/pa_schedule");
const fs = require("fs");
const rrdtool = require("rrdtool");
var rrd_file_path = "./public/data/device_status.rrd";
var mongoose = require("mongoose");

const dotenv = require("dotenv").config();
var ami = new require("asterisk-manager")(
  process.env.ASTERISK_MANAGER_PORT,
  process.env.ASTERISK_MANAGER_HOST,
  process.env.ASTERISK_MANAGER_USER,
  process.env.ASTERISK_MANAGER_PASSWORD,
  true
);

ami.keepConnected();

const device_manager_view = (req, res) => {
  console.log(
    "Controller: device_manager: Get device_manager from username = " +
      req.user.name
  );
  var query = req.params.query;
  if (query == undefined) query = "-";

  res.render("device_manager", {
    user: req.user,
    user_id: query,
  });
};
const api_device_rrd_log = (data) => {
  console.log("Controller : Local log device status to RRD");
  var rrd_db = null;
  var start = rrdtool.now();
  //check for existing rrd file
  try {
    if (fs.existsSync(rrd_file_path)) {
      //file exists
      console.log("-- Insert data to RRD");
      rrd_db = rrdtool.open(rrd_file_path);
      //console.log(data);
      rrd_db.update(start, data, (err) => {
        if (err) console.log(err);
      });
    } else {
      console.log("-- Create new RRD and data to RRD");
      rrd_db = rrdtool.create(
        rrd_file_path,
        { start: start - 60, step: 60, force: true },
        [
          "DS:total_device:GAUGE:120:0:U",
          "DS:online_device:GAUGE:120:0:U",
          "DS:offline_device:GAUGE:120:0:U",
          "DS:using_device:GAUGE:120:0:U",
          "RRA:MAX:0.5:1:1500",
          "RRA:MAX:0.5:15:672",
          "RRA:MAX:0.5:60:744",
          "RRA:MAX:0.5:360:1460",
          "RRA:AVERAGE:0.5:1:1500",
          "RRA:AVERAGE:0.5:15:672",
          "RRA:AVERAGE:0.5:60:744",
          "RRA:AVERAGE:0.5:360:1460",
        ]
      );
      rrd_db.update(start, data);
    }
  } catch (err) {
    console.error(err);
  }

  return 0;
};
const api_device_update_status = () => {
  console.log("Controller : Local check device status begin");
  let _data = {
    total_device: 0,
    online_device: 0,
    offline_device: 0,
    using_device: 0,
  };
  ami.action({ action: "PJSIPShowEndpoints" }, (err, res) => {
    if (err) console.log(err);
  });
  //console.log(req.user.prefix);
  ami.on("managerevent", function (evt) {
    //console.log(evt);
    if (evt.event == "EndpointList") {
      //console.log('-- Device status: ' + evt.aor + '/' + evt.devicestate);
      let state = 0;
      switch (evt.devicestate) {
        case "Unavailable":
          _data.offline_device++;
          state = 0;
          break;
        case "Not in use":
          state = 1;
          _data.online_device++;
          break;
        case "In use":
          state = 2;
          _data.using_device++;
          break;
        case "Busy":
          state = 3;
          break;
        default:
          break;
      }
      deviceStatus.updateOne(
        {
          number: evt.aor,
        },
        {
          number: evt.aor,
          status: evt.devicestate,
          state: state,
        },
        { upsert: true },
        (res) => {
          //console.log(res);
        }
      );

      _data.total_device++;
    }
    if (evt.event == "EndpointListComplete") {
      console.log("- Device status: complete: ");
      ami.removeAllListeners("managerevent");
      api_device_rrd_log(_data);
    }
  });
  return 0;
};
const api_device_rrd_get_data = (req, res) => {
  console.log(
    "Controller: device manager: Get RRD graph data type = " + req.body.type
  );
  var resData = {
    code: 1,
    message: "default",
  };
  var rrd_db = null;
  var start = rrdtool.now();

  var graph_start = start;
  var graph_end = start - 60;
  var graph_resolution = 60;

  switch (req.body.type) {
    case "graph_hour":
      graph_start = start - 3600;
      graph_end = start;
      graph_resolution = 60;
      break;
    case "graph_day":
      graph_start = start - 86400;
      graph_end = start;
      graph_resolution = 60;
      break;
    case "graph_week":
      graph_start = start - 604800;
      graph_end = start;
      graph_resolution = 1800;
      break;
    default:
      break;
  }
  //check for existing rrd file
  try {
    //open rrd file.
    console.log("-- Read data from RRD");
    rrd_db = rrdtool.open(rrd_file_path);
    rrd_db.fetch(
      "MAX",
      graph_start,
      graph_end,
      graph_resolution,
      function (err, data) {
        if (err) {
          throw err;
        } else {
          //console.log(data);
          resData.code = 0;
          resData.message = "ok";
          resData.data = data;
          res.json(resData);
        }
      }
    );
  } catch (err) {
    console.error(err);
    res.json(resData);
  }
};
const api_list_device = (req, res) => {
  let location_id = req.body._id;
  console.log(
    "Controller: Device manager:  List device for location = " + location_id
  );
  var resData = {
    code: 1,
    message: "default",
  };
  let _user_right = {
    parent_id: location_id,
  };
  // if (req.user.type == "admin" || req.user.type == "sub_admin") {
  //   _user_right.parent_id = location_id;
  // } else {
  //   //_user_right.owner = req.user.name;
  //   _user_right.parent_id = location_id;
  // }
  deviceModel
    .aggregate([
      {
        $match: {
          $and: [_user_right],
        },
      },
      {
        $lookup: {
          from: "device_statuses",
          localField: "number",
          foreignField: "number",
          as: "device_state",
        },
      },
    ])
    .sort({ number: "asc" })
    .exec((err, _res) => {
      if (err) {
        throw err;
      }
      //console.log(_res);
      resData.code = 0;
      resData.message = "ok";
      resData.data = _res;
      res.json(resData);
    });
};
const api_list_device_all = (req, res) => {
  console.log("Controller: device manager:  List ALL device status");
  var resData = {
    code: 1,
    message: "default",
  };
  let _user_right = {};
  if (req.user.type == "admin" || req.user.type == "sub_admin") {
  } else {
    _user_right.owner = req.user.name;
    _user_right.parent_id = req.body._id;
  }
  deviceStatus
    .aggregate([
      {
        $match: {
          $and: [_user_right],
        },
      },
      {
        $lookup: {
          from: "device_profiles",
          localField: "name",
          foreignField: "name",
          as: "device_location",
        },
      },
    ])
    .sort({ number: "asc" })
    .exec((err, _res) => {
      if (err) {
        throw err;
      }
      //console.log(_res);
      resData.code = 0;
      resData.message = "ok";
      resData.data = _res;
      res.json(resData);
    });
};
const api_list_device_prefix = (req, res) => {
  console.log(
    "Controller: device manager:  List prefix [" +
      req.body.prefix +
      "] device status"
  );
  var resData = {
    code: 1,
    message: "default",
  };
  let regex_prefix = new RegExp("^" + req.body.prefix + ".*", "i");

  let _user_right = {};
  if (req.user.type == "admin" || req.user.type == "sub_admin") {
  } else {
    _user_right.owner = req.user.name;
    _user_right.parent_id = req.body._id;
  }
  //const user_id = req.user._id;
  //console.log(user_id);
  deviceStatus
    .aggregate([
      {
        $match: {
          //$and:[{ number: { $regex: regex_prefix , $options: 'im'}}]
          number: regex_prefix,
        },
      },
      {
        $lookup: {
          from: "device_profiles",
          localField: "number",
          foreignField: "number",
          as: "device_location",
        },
      },
    ])
    .sort({ number: "asc" })
    .exec((err, _res) => {
      if (err) {
        throw err;
      }
      //console.log(_res[0].device_location);
      resData.code = 0;
      resData.message = "ok";
      resData.data = _res;
      res.json(resData);
    });
};
const api_add_device = (req, res) => {
  console.log("- Add device for location = " + req.body.location);
  var resData = {
    code: 0,
    message: "ok",
  };
  const {
    name,
    number,
    location,
    parent_id,
    sn,
    device_type,
    desc,
    owner,
    owner_id,
  } = req.body;
  const status = "enable";
  const newDevice = new deviceModel({
    name,
    sn,
    desc,
    number,
    parent_id,
    device_type,
    owner,
    owner_id,
    location,
    status,
  });
  newDevice
    .save()
    .then(() => {})
    .catch((err) => {
      console.log(err);
      console.log("-- can not save device");
      resData.code = 1;
      resData.message = "save failed";
    });
  res.json(resData);
};
const api_delete_device = (req, res) => {
  console.log("- Delete device for id = " + req.body._id);
  var resData = {
    code: 0,
    message: "ok",
  };
  deviceModel.deleteOne({ _id: req.body._id }, (err, _res) => {
    if (err) {
      throw err;
    }
    res.json(resData);
  });
};
const api_save_device = (req, res) => {
  console.log("- Save device for location = " + req.body.id);
  //console.log(req.body);
  var resData = {
    code: 0,
    message: "ok",
  };
  const { name, number, sn, device_type } = req.body;
  const saveDevice = {
    name: name,
    number: number,
    sn: sn,
    device_type: device_type,
  };

  deviceModel.findOneAndUpdate(
    { _id: req.body.id },
    saveDevice,
    { upsert: true },
    function (err, doc) {
      //console.log(doc);
      if (err) {
        resData.code = 1;
        resData.message = err;
      } else return res.json(resData);
    }
  );
};
const api_device_id = (req, res) => {
  console.log(
    "# Controller : Device Manager : Read Device for id = " + req.body._id
  );
  deviceModel.findOne(
    { _id: mongoose.Types.ObjectId(req.body._id) },
    (err, _res) => {
      if (err) {
        throw err;
      }
      //console.log(_res);
      res.json(_res);
    }
  );
};
const api_device_volume = (req, res) => {
  console.log("- Set Volume for device id = " + req.body._id);
  deviceModel.findOneAndUpdate(
    { _id: req.body._id },
    { volume: req.body._volume },
    { upsert: true },
    (err, _res) => {
      if (err) {
        throw err;
      }
      //console.log(_res);
      res.json(_res);
    }
  );
};
const api_location_adjust_volume = (req, res) => {
  console.log("- Set Volume for location id = " + req.body._id);
  var set_volume_list = [];
  const volume_map = [-15, -14, -12, -10, -9, -4, -6, -3, 0, 2, 3, 6, 9];
  function process_volume_ami() {
    ami.action(
      {
        action: "Command",
        command: "core show channels concise",
      },
      (err, __res) => {
        if (err) console.log(err);
        //console.log(__res);
        //success command
        if (__res.response == "Success") {
          //console.log(set_volume_list);
          if (__res.output.length > 2) {
            __res.output.forEach((channel, ind) => {
              //console.log(channels);
              if (channel.startsWith("PJSIP")) {
                //get channel name
                let _channel_name = channel.split("!")[0];
                //console.log('-- index = ' + ind + ' name = ' + _channel_name);
                set_volume_list.forEach((extension) => {
                  if (_channel_name.includes(extension.number)) {
                    console.log(
                      "--- Set Volume for number = " + extension.number
                    );
                    ami.action(
                      {
                        action: "Setvar",
                        channel: _channel_name,
                        variable: "VOLUME(tx)",
                        value: volume_map[extension.volume],
                      },
                      (err, ___res) => {
                        if (err) console.log(err);
                        //console.log(___res);
                      }
                    );
                  }
                });
              }
            });
          }
        }
      }
    );
    //console.log('all done');
  }
  var itemsProcessed = 0;

  if (!req.body._id) {
    return res.json({ code: 1, msg: "-- No location selected" });
  } else {
    deviceModel.find({ parent_id: req.body._id }, function (err, _res) {
      if (err) return err;
      //console.log(_res);
      _res.forEach(function (data, ind) {
        if (data.volume != undefined) {
          //console.log('-- Number = '+ data.number + ' Volume = '+ data.volume);
          if (data.volume < 10) {
            //console.log('-- Number = '+ data.number + ' should set volume');
            set_volume_list.push({
              number: data.number,
              volume: data.volume,
            });
          }
        }
        itemsProcessed++;
        if (itemsProcessed === _res.length) {
          process_volume_ami();
        }
      });
    });
    res.json({ code: 0, msg: "OK" });
  }
};
const api_list_location = (req, res) => {
  let _user_right = {};
  if (req.user.type == "admin" || req.user.type == "sub_admin") {
    if (req.body.user_name) {
      _user_right.owner = req.body.user_name;
    }
  } else {
    _user_right.owner = req.user.name;
  }
  console.log(
    "Controller: List location for owner user = " + _user_right.owner
  );
  //console.log(req.user);
  locationModel.find(_user_right, (err, _res) => {
    if (err) {
      throw err;
    }
    //console.log(_res);
    res.json(_res);
  });
};
const api_list_location_id = (req, res) => {
  //console.log(req.user);
  let _user_right = {};
  if (req.user.type == "admin" || req.user.type == "sub_admin") {
    if (req.body.user_id) {
      _user_right.owner_id = req.body.user_id;
    } else if (
      req.body.from == "dashboard" ||
      req.body.from == "auto_pa" ||
      req.body.from == "auto_radio"
    ) {
      // if come from dashboard
      _user_right.owner_id = req.user._id;
    } else {
    }
  } else {
    _user_right.owner_id = req.user._id;
  }

  console.log(
    "Controller: Device manager: List location for user id = " +
      _user_right.owner_id
  );
  locationModel.find(_user_right, (err, _res) => {
    if (err) {
      throw err;
    }
    //console.log(_res);
    res.json(_res);
  });
};
const api_add_location = (req, res) => {
  console.log("- Add location for user = " + req.user.name);
  var resData = {
    code: 0,
    message: "ok",
  };
  const { name, number, address } = req.body;
  const owner = req.user.name;
  const owner_id = req.body.owner_id;
  locationModel.findOne({ name: req.name }).then((location) => {
    if (location) {
      console.log("-- name exists");
      resData.code = 1;
      resData.message = "name duplicated";
      res.json(resData);
    } else {
      const newLocation = new locationModel({
        name,
        number,
        address,
        owner,
        owner_id,
      });
      newLocation
        .save()
        .then((data) => {
          resData.id = data._id.toString();
          res.json(resData);
        })
        .catch((err) => {
          console.log(err);
          console.log("-- can not save location");
          resData.code = 1;
          resData.message = "save failed";
          res.json(resData);
        });
    }
  });
};
const api_save_location = (req, res) => {
  console.log("- Save location for user = " + req.user.name);
  //console.log(req.body);
  var resData = {
    code: 0,
    message: "ok",
  };
  const { name, number, address, owner, owner_id } = req.body;
  const saveLocation = {
    name: name,
    number: number,
    address: address,
    owner: owner,
    owner_id: owner_id,
  };

  locationModel.findOneAndUpdate(
    { _id: req.body.id },
    saveLocation,
    { upsert: true },
    function (err, doc) {
      //console.log(doc);
      if (err) {
        resData.code = 1;
        resData.message = err;
      } else return res.json(resData);
    }
  );
};
const api_delete_location = (req, res) => {
  console.log("# Delete location for id = " + req.body._id);
  var resData = {
    code: 0,
    message: "ok",
  };
  // Delete all associate location.
  locationModel.deleteOne({ _id: req.body._id }, (err, _res) => {
    if (err) {
      throw err;
    }
    deviceModel.deleteMany({ parent_id: req.body._id }, (err, _res) => {
      if (err) {
        throw err;
      }
      autoPAModel.deleteMany({ location_id: req.body._id }, (err, _res) => {
        if (err) {
          throw err;
        }
      });
    });
    res.json(resData);
  });
};
const api_location_id = (req, res) => {
  console.log("Controller : Location : Get location for id = " + req.body._id);
  var resData = {
    code: 1,
    message: "default",
  };
  let _user_right = {
    _id: req.body._id,
  };
  // if (req.user.type == "admin" || req.user.type == "sub_admin") {
  //   _user_right._id = req.body._id;
  // } else {
  //   _user_right.owner = req.user.name;
  //   _user_right._id = req.body._id;
  // }
  if (req.body._id == "-" || req.body._id == "0" || req.body._id == "") {
    res.json(resData);
  } else {
    locationModel.findOne(_user_right, (err, _res) => {
      if (err) {
        throw err;
      }
      //console.log(_res);
      resData.code = 0;
      resData.message = "ok";
      resData.data = _res;
      res.json(resData);
    });
  }
};
const api_location_name = (req, res) => {
  console.log(
    "#Controller: Device manager: Read location for name = " + req.body.name
  );
  var resData = {
    code: 1,
    message: "default",
  };
  let _user_right = {};
  if (req.user.type == "admin" || req.user.type == "sub_admin") {
    _user_right.name = req.body.name;
  } else {
    _user_right.owner_id = req.user._id;
    _user_right.name = req.body.name;
  }
  if (req.body.name == "0") {
    res.json(resData);
  } else {
    //console.log(req.user);
    locationModel.findOne(_user_right, (err, _res) => {
      if (err) {
        throw err;
      }
      console.log(_res);
      res.json(_res);
    });
  }
};
module.exports = {
  device_manager_view,
  api_list_device,
  api_list_device_all,
  api_list_device_prefix,
  api_add_device,
  api_delete_device,
  api_save_device,
  api_device_id,
  api_add_location,
  api_save_location,
  api_delete_location,
  api_list_location,
  api_list_location_id,
  api_location_id,
  api_location_name,
  api_device_update_status,
  api_device_rrd_log,
  api_device_rrd_get_data,
  api_device_volume,
  api_location_adjust_volume,
};
