const locationModel = require('../models/locations');

const monitor_view = (req, res) => {
    console.log("Controller: pa_plan : Get monitor view from username = " + req.user.name);
    var query = req.params.query;
    if(query == undefined) query = '-';
   
    res.render("monitor", {
      user: req.user,
      location: query
    });
};
const device_check_view = (req, res) => {
  console.log("Controller: pa_plan : Get device check view from username = " + req.user.name);
  var query = req.params.query;
  if(query == undefined) query = '-';
 
  res.render("device_check", {
    user: req.user,
    location: query
  });
};
module.exports = {
    monitor_view,
    device_check_view
}