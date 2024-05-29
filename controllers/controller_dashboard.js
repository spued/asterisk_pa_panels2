
//For Register Page
const dotenv = require("dotenv").config();
var ami = new require('asterisk-manager')( 
     process.env.ASTERISK_MANAGER_PORT,
     'astrapa.nt-acs.net',
     process.env.ASTERISK_MANAGER_USER,
     process.env.ASTERISK_MANAGER_PASSWORD
     , true);

ami.keepConnected();

const dashboardView = (req, res, next) => {
  console.log("Controller: Dashboard: Get dashboard from username = " + req.user.name);
  let msg = [];
  let html ='';
  res.render("dashboard", {
    user: req.user,
    table_content: html
  });
};
module.exports = {
  dashboardView
};
