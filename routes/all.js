// Required packages
var express                 = require("express"),
    router                  = express.Router();

// Models
var User                    = require("../models/user"),
    Series                  = require("../models/series"),
    Episode                 = require("../models/episode");

// Middleware
var middleware              = require("../middleware");

// INDEX
router.get("/", middleware.isLoggedIn, function(req, res) {
  User.findById(req.user._id).populate("series").exec(function(error, user) {
    if (error) {
      console.log(error);
    } else {
      console.log(user);
      res.render("./series/all/index", {allSeries: user.series});
    }
  });
});

// DELETE
router.delete("/delete", middleware.isLoggedIn, function(req, res) {
  var seriesIds = req.body.delete;
  // Check if any series has been selected for removal
  if (seriesIds) {
    // If only a single series was selected, turn the series into a list
    if (!Array.isArray(seriesIds)) {
      seriesIds = [seriesIds];
    }
    // Remove all selected series
    Series.findByIdAndRemove(seriesIds, function(error) {
      if (error) {
        console.log(error);
      } else {
        console.log("Series removed");
      }
    });

    // Remove series from user's series list
    User.findById(req.user._id).populate("series").exec(function(error, user) {
      if (user) {
        seriesIds.forEach(function(seriesId) {
          // Check if selected series is in user's series list
          if (user.series.indexOf(seriesId) != -1) {
            user.series.splice(user.series.indexOf(seriesId), 1);
          }
        });
        user.markModified("series");
        user.save();
      }
    });

    // Remove all episodes from removed series
    Episode.remove({series: seriesIds}, function(error) {
      if (error) {
        console.log(error);
      }
    });
  }
  res.redirect("/series/all");
});

module.exports = router;
