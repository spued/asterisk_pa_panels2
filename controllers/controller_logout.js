//js
const logoutUser = (req, res) => {
  req.logout();
  //res.clearCookie(req.session);
  req.session.destroy();
  res.redirect("/");
};
module.exports = {
  logoutUser,
};
