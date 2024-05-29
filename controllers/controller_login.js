//js
const passport = require("passport");
const User = require("../models/users");
const mm = require("music-metadata");
const bcrypt = require("bcryptjs");
const uuidv1 = require("uuidv1");

//For Register Page
const registerView = (req, res) => {
  res.render("register", {});
};
// For View
const loginView = (req, res) => {
  //console.log(req.session);
  if (req.session.error != undefined) {
    res.render("login", { error: req.session.error });
    delete res.session.error; // remove from further requests
  } else {
    res.render("login", {});
  }
};
const userView = (req, res) => {
  res.render("user_manager", {
    user: req.user,
  });
};
const profileView = (req, res) => {
  //console.log(req.user);
  res.render("profile_manager", {
    user: req.user,
  });
};
const api_list_user = (req, res) => {
  //console.log(req.user);
  var resData = {
    code: 1,
    message: "default",
  };
  User.find({}).then((users) => {
    resData.code = 0;
    resData.message = "ok";
    resData.data = users;
    res.json(resData);
  });
};
const api_get_user = (req, res) => {
  //console.log(req.body);
  User.find({ _id: req.body.userid }).then((users) => {
    res.json(users);
  });
};
const api_set_user_password = (req, res) => {
  //console.log(req.body);
  if (req.body.password_1 != "" || req.body.password_2 != "") {
    if (req.body.password_1 == req.body.password_2) {
      bcrypt.genSalt(10, (err, salt) =>
        bcrypt.hash(req.body.password_1, salt, (err, hash) => {
          if (err) throw err;
          req.body.password = hash;
          //console.log(req.body);
          User.updateOne({ _id: req.user._id }, req.body).then(() => {
            res.json({
              code: 0,
              message: "ok",
            });
          });
        })
      );
    } else {
      res.json({
        code: 1,
        message: "พาสเวิร์ดไม่ตรงกัน",
      });
    }
  } else {
    res.json({
      code: 1,
      message: "ต้องมีพาสเวิร์ด",
    });
  }
};
const api_set_user_note = (req, res) => {
  //console.log(req.body);
  console.log("Controller: User: save note = " + req.body._user_id);
  User.updateOne(
    { _id: req.body._user_id },
    {
      note: req.body._user_note,
      selection_start: req.body._user_select_start,
      selection_end: req.body._user_select_end,
    }
  ).then(() => {
    res.json({
      status: 0,
      message: "ok",
    });
  });
};
const api_get_user_note = (req, res) => {
  //console.log(req.body);
  console.log("Contrller: User: get note = " + req.body._user_id);
  User.findOne({ _id: req.body._user_id })
    .select("note selection_start selection_end")
    .then((_data) => {
      res.json({
        status: 0,
        data: _data,
        message: "ok",
      });
    });
};
const api_set_user = (req, res) => {
  //console.log(req.body);
  if (req.body.password != "") {
    bcrypt.genSalt(10, (err, salt) =>
      bcrypt.hash(req.body.password, salt, (err, hash) => {
        if (err) throw err;
        req.body.password = hash;
        //console.log(req.body);
        User.updateOne({ _id: req.body.user_id }, req.body).then(() => {
          res.json({
            status: 0,
            message: "ok",
          });
        });
      })
    );
  } else {
    delete req.body.password;
    //console.log(req.body);
    User.updateOne({ _id: req.body.user_id }, req.body).then(() => {
      res.json({
        status: 0,
        message: "ok",
      });
    });
  }
};
const api_delete_user = (req, res) => {
  User.deleteOne({ _id: req.body.user_id }, req.body).then(() => {
    res.json({
      status: 0,
      message: "ok",
    });
  });
};
const api_upload_logo_file = async (req, res) => {
  console.log(
    "Controller: User manage: File upload logo file name = " +
      req.file.originalname
  );
  // console.log(req.file)

  if (req.file.size > 1000) {
    User.updateOne(
      { _id: req.body.user_id },
      { logo_url: req.file.filename }
    ).then((_res) => {});
    /* res.json({ 
        code: 0, 
        message: 'ok',
        fn: req.file.filename
      }); */
    res.status(200).send({
      message:
        "The following file was uploaded successfully: " +
        req.file.originalname,
    });
  } else {
    res.json({
      code: 1,
      message: "failed",
    });
  }
};
//Post Request that handles Register
const registerUser = (req, res) => {
  const { name, email, location, password, confirm } = req.body;
  const uuid = uuidv1();
  if (!name || !email || !password || !confirm) {
    console.log("Fill empty fields");
  }
  //Confirm Passwords
  if (password !== confirm) {
    console.log("Password must match");
  } else {
    //Validation
    User.findOne({ email: email }).then((user) => {
      if (user) {
        console.log("email exists");
        res.render("register", {
          name,
          email,
          password,
          confirm,
        });
      } else {
        //Validation
        const newUser = new User({
          name,
          email,
          location,
          password,
          uuid,
        });
        //Password Hashing
        bcrypt.genSalt(10, (err, salt) =>
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            newUser.password = hash;
            newUser
              .save()
              .then(function () {
                let _m = {
                  message_header: "ผลการลงทะเบียน",
                  message_body:
                    "ลงทะเรียนสำเร็จ โปรดรอการอนุมัติจากผู้ดูแลระบบ",
                };
                res.render("post_register", {
                  user: req.user,
                  message: _m,
                });
              })
              .catch((err) => {
                console.log(err);
                let _m = {
                  message_header: "ผลการลงทะเบียน",
                  message_body:
                    "ลงทะเรียนไม่สำเร็จ โปรดลองใหม่หรือติดต่อผู้ดูแลระบบ",
                };
                res.render("post_register", {
                  user: req.user,
                  message: _m,
                });
              });
          })
        );
      }
    });
  }
};
const loginUser = (req, res) => {
  const { email, password } = req.body;
  //Required
  if (!email || !password) {
    console.log("Please fill in all the fields");
    res.render("login", { error: "Please enter username or passsword!" });
  } else {
    passport.authenticate("local", (err, user) => {
      if (err) {
        console.log("error on userController.js post /login err", err);
        return err;
      }
      console.log("user = ", user);
      /* if (!user) {
        req.session.error = '';
        res.redirect('/login');
      } */
      req.logIn(user, (login_error) => {
        if (login_error) {
          console.log("error : Controller post login : Login error.");
          res.render("login", {
            error: "Login failed : wrong username or password.",
          });
        }
        // return res.status(200).json(user[0]);
        else req.session.save(() => res.redirect("/dashboard"));
      });
    })(req, res);
  }
};
module.exports = {
  registerView,
  loginView,
  profileView,
  registerUser,
  loginUser,
  userView,
  api_list_user,
  api_get_user,
  api_set_user,
  api_set_user_note,
  api_get_user_note,
  api_set_user_password,
  api_delete_user,
  api_upload_logo_file,
};
