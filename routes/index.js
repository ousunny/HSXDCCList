// Required packages
var express               = require("express"),
    router                = express.Router(),
    passport              = require("passport");

// Models
var User                  = require("../models/user");

// INDEX
router.get("/", function(req, res) {
  if (req.user) {
    res.redirect("/series");
  } else {
    res.render("index");
  }
});

// REGISTER
router.get("/register", function(req, res) {
  res.render("register");
});

router.post("/register", function(req, res) {
  var newUser = new User({username: req.body.username});
  User.register(newUser, req.body.password, function(error, user) {
    if (error) {
        return res.redirect("/");
    }
    passport.authenticate("local")(req, res, function() {
      res.redirect("/series");
    });
  });
});

// LOGIN
router.get("/login", function(req, res) {
  res.render("login");
});

router.post("/login", passport.authenticate("local", {
  successRedirect: "/series",
  failureRedirect: "/"
}), function(req, res) {});

// LOGOUT
router.get("/logout", function(req, res) {
    req.logout();
    res.redirect("/");
});

module.exports = router;
