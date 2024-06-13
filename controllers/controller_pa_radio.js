//For Register Page
const dotenv = require("dotenv").config();
const axios = require("axios");
const pa_radio_view = (req, res, next) => {
  console.log(
    "Controller: pa_radio: Get PA radio view from username = " + req.user.name
  );
  let html = "";
  res.render("pa_radio_v2", {
    user: req.user,
    table_content: html,
  });
};

const pa_radio_prd_list = (req, res, next) => {
  console.log(
    "Controller: pa_radio: Get PA radio view from PRD by username = " +
      req.user.name
  );
  axios.get("https://api-ott.prd.go.th/api/v1/epg/channel").then((_res) => {
    console.log(_res.data);
    res.json({
      code: 0,
      mesg: "ok",
      data: _res.data,
    });
  });
};
module.exports = {
  pa_radio_view,
  pa_radio_prd_list,
};
