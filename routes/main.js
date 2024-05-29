const express = require("express");
const {
  registerView,
  loginView,
  profileView,
  registerUser,
  loginUser,
  api_list_user,
  api_get_user,
  api_set_user,
  api_set_user_note,
  api_get_user_note,
  api_set_user_password,
  api_delete_user,
  api_upload_logo_file,
  userView,
} = require("../controllers/controller_login");
const { protectRoute } = require("../utils/protect");
const { dashboardView } = require("../controllers/controller_dashboard");
const { pa_radio_view, pa_radio_prd_list } = require("../controllers/controller_pa_radio");
const {
  pa_plan_view,
  api_pa_plan_add,
  api_pa_plan_edit,
  api_pa_plan_list,
  api_pa_plan_save,
  api_pa_plan_delete,
  api_pa_plan_id,
} = require("../controllers/controller_pa_plan");
const {
  auto_pa_view,
  api_auto_pa_list,
  api_auto_pa_id,
  api_auto_pa_save,
  api_auto_pa_delete,
  api_auto_pa_edit_save,
  api_auto_pa_update_file,
  api_auto_pa_count_location,
} = require("../controllers/controller_auto_pa");

const {
  auto_pa_radio_view,
  auto_pa_radio_add,
  auto_pa_radio_edit,
  auto_pa_radio_delete,
  auto_pa_radio_list,
  auto_pa_radio_get,
  auto_pa_radio_pause,
  auto_pa_radio_play,
} = require("../controllers/controller_auto_radio");

const {
  local_player_play,
  local_player_register,
  local_player_unregister,
  local_player_view,
  save_schedule,
  load_schedule,
} = require("../controllers/controller_local_player");
const {
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
  api_device_rrd_get_data,
  api_device_volume,
  api_location_adjust_volume,
} = require("../controllers/controller_device_manager");
const {
  api_upload_file,
  fileManageView,
  api_file_list,
  api_update_file,
  api_delete_file,
} = require("../controllers/controller_file_manage");
const { logoutUser } = require("../controllers/controller_logout");
const {
  monitor_view,
  device_check_view,
} = require("../controllers/controller_monitor");

const {
  api_player_location_id,
  api_player_key,
} = require("../controllers/controller_api_player");
const path = require("path");
const router = express.Router();

// SET STORAGE
const multer = require("multer");

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now());
  },
});
var upload = multer({
  storage: storage,
  fileFilter: function (req, file, callback) {
    var ext = path.extname(file.originalname);
    if (
      ext !== ".wav" &&
      ext !== ".gsm" &&
      ext !== ".mp3" &&
      ext !== ".ogg" &&
      ext !== ".opus"
    ) {
      return callback(new Error("Only voice are allowed"));
    }
    callback(null, true);
  },
  limits: {
    fileSize: 20480000,
  },
});

var img_storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/img");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now());
  },
});
var img_upload = multer({
  storage: img_storage,
  fileFilter: function (req, file, callback) {
    var ext = path.extname(file.originalname);
    if (ext !== ".jpg" && ext !== ".gif" && ext !== ".jpeg" && ext !== ".png") {
      return callback(new Error("Only image are allowed"));
    }
    callback(null, true);
  },
  limits: {
    fileSize: 3096000,
  },
});

router.get("/", protectRoute, dashboardView);

router.get("/monitor", protectRoute, monitor_view);
router.get("/device_check", protectRoute, device_check_view);

router.get("/register", registerView);
router.post("/register", registerUser);
router.post("/list_user", protectRoute, api_list_user);
router.post("/get_user_id", protectRoute, api_get_user);
router.post("/set_user_id", protectRoute, api_set_user);
router.post("/set_user_note", protectRoute, api_set_user_note);
router.post("/get_user_note", protectRoute, api_get_user_note);
router.post("/delete_user_id", protectRoute, api_delete_user);
router.get("/user_manager", protectRoute, userView);
router.get("/profile_manager", protectRoute, profileView);
router.post("/profile_pass_update", protectRoute, api_set_user_password);
router.post(
  "/upload_logo",
  protectRoute,
  img_upload.single("imgfile"),
  api_upload_logo_file
);

router.get("/login", loginView);
router.post("/login", loginUser);

router.get("/dashboard", protectRoute, dashboardView);

router.get("/pa_radio", protectRoute, pa_radio_view);
router.get("/pa_prd_radio_list", protectRoute, pa_radio_prd_list);

router.get("/pa_auto_radio", protectRoute, auto_pa_radio_view);
router.post("/pa_auto_radio_add", protectRoute, auto_pa_radio_add);
router.post("/pa_auto_radio_edit", protectRoute, auto_pa_radio_edit);
router.post("/pa_auto_radio_delete", protectRoute, auto_pa_radio_delete);
router.post("/pa_auto_radio_list", protectRoute, auto_pa_radio_list);
router.post("/pa_auto_radio_get", protectRoute, auto_pa_radio_get);
router.post("/pa_auto_radio_play", protectRoute, auto_pa_radio_play);
router.post("/pa_auto_radio_pause", protectRoute, auto_pa_radio_pause);

router.get("/file_manage", protectRoute, fileManageView);
router.post(
  "/file_manage",
  protectRoute,
  upload.single("voicefile"),
  api_upload_file
);
router.post("/file_list", protectRoute, api_file_list);
router.post("/file_delete", protectRoute, api_delete_file);
router.post("/file_update", protectRoute, api_update_file);

router.get("/device_manager", protectRoute, device_manager_view);
router.get("/device_manager/:query", protectRoute, device_manager_view);
router.post("/device_list", protectRoute, api_list_device);
router.post("/device_list_all", protectRoute, api_list_device_all);
router.post("/device_list_prefix", protectRoute, api_list_device_prefix);
router.post("/device_add", protectRoute, api_add_device);
router.post("/device_delete", protectRoute, api_delete_device);
router.post("/device_save", protectRoute, api_save_device);
router.post("/device_id", protectRoute, api_device_id);
router.post("/device_graph_data", protectRoute, api_device_rrd_get_data);
router.post("/device_volume", protectRoute, api_device_volume);

router.post("/location_add", protectRoute, api_add_location);
router.post("/location_save", protectRoute, api_save_location);
router.post("/location_delete", protectRoute, api_delete_location);
router.post("/location_list", protectRoute, api_list_location);
router.post("/location_list_id", protectRoute, api_list_location_id);
router.post("/location_id", protectRoute, api_location_id);
router.post("/location_name", protectRoute, api_location_name);
router.post(
  "/location_adjust_volume",
  protectRoute,
  api_location_adjust_volume
);

router.get("/daily", protectRoute, local_player_view);
router.post("/local_register", protectRoute, local_player_register);
router.post("/local_play", protectRoute, local_player_play);
router.post("/local_unregister", protectRoute, local_player_unregister);
router.post("/save_schedule", protectRoute, save_schedule);
router.post("/load_schedule", protectRoute, load_schedule);

router.get("/pa_plan", protectRoute, pa_plan_view);
router.post("/pa_plan_add", protectRoute, api_pa_plan_add);
router.post("/pa_plan_edit", protectRoute, api_pa_plan_edit);
router.post("/pa_plan_list", protectRoute, api_pa_plan_list);
router.post("/pa_plan_id", protectRoute, api_pa_plan_id);
router.post("/pa_plan_save", protectRoute, api_pa_plan_save);
router.post("/pa_plan_delete", protectRoute, api_pa_plan_delete);

router.get("/auto_pa", protectRoute, auto_pa_view);
router.post("/auto_pa_list", protectRoute, api_auto_pa_list);
router.post("/auto_pa_id", protectRoute, api_auto_pa_id);
router.post("/auto_pa_save", protectRoute, api_auto_pa_save);
router.post("/auto_pa_edit", protectRoute, api_auto_pa_edit_save);
router.post("/auto_pa_count", protectRoute, api_auto_pa_count_location);
router.post("/auto_pa_delete", protectRoute, api_auto_pa_delete);
router.post("/auto_pa_update_file", protectRoute, api_auto_pa_update_file);

router.post("/api_play", api_player_location_id);
router.post("/api_player", api_player_key);

router.get("/logout", protectRoute, logoutUser);

module.exports = router;
