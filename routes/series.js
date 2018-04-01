// Required packages
var express                 = require("express"),
    router                  = express.Router();

// Models
var User                    = require("../models/user"),
    Series                  = require("../models/series"),
    Episode                 = require("../models/episode");

// Utilities
var utilities               = require("../utilities/utilities"),
    hsScraper               = require("../utilities/hsscraper");

// Middleware
var middleware              = require("../middleware");

// INDEX
router.get("/", middleware.isLoggedIn, function(req, res) {
  // Get currently logged in user
  User.findById(req.user._id, function(error, user) {
    if (error) {
      console.log(error);
    } else {
      if (user) {
        var allAvailable = []
        // Grab all episodes from user's series
        Series.find({_id: user.series}).populate("episodes").exec(function(error, allSeries) {
          allSeries.forEach(function(series) {
            allAvailable = allAvailable.concat(series.episodes);
          });
          // Get a list of all bot commands from obtained episodes
          var commands = utilities.getAllPackagesForDL(allAvailable);
          res.render("./series/index", {allAvailable: allAvailable, commands: commands});
        });
      }
    }
  });
});

// Check for updates
router.get("/check", middleware.isLoggedIn, function(req, res) {
  // Get all the series the user has stored
  User.findById(req.user._id).populate("series").exec(function(error, user) {
    if (error) {
      console.log(error);
    } else {
      if (user) {
        // Check for new episodes, if episodes exist; save it
        utilities.saveEpisodes(user.series);
        setTimeout(function() {
          res.redirect("/series")
        }, 10000);
      }
    }
  });
});

// CREATE
router.post("/", middleware.isLoggedIn, function(req, res) {
  // Check if series name is empty
  var seriesNameTrimmed = req.body.series.name.trim();
  if (seriesNameTrimmed.length == 0) {
    res.redirect("/series/new");
    return;
  }

  // Create a user object to use for series
  var user = {
    id: req.user._id,
    username: req.user.username
  }
  // Get information on series being created
  var newSeries = req.body.series;
  newSeries.user = user;

  // Find the user
  User.findById(req.user._id, function(error, user) {
    if (error) {
      console.log(error);
      res.redirect("/");
    } else {
      // Create the series with input information
      Series.create(newSeries, function(error, createdSeries) {
        if (error) {
          console.log(error);
        } else {
          // Associate series with current user
          createdSeries.user = req.user;
          createdSeries.save();
          // Add series to user's series list
          user.series.push(createdSeries);
          user.save();
          // Check for episodes and if exist save it
          utilities.saveEpisodes([createdSeries]);
          setTimeout(function() {
            res.redirect("/series");
          }, 6000);
        }
      })
    }
  });
});

// NEW
router.get("/new", middleware.isLoggedIn, function(req, res) {
  // Check site for currently available bots
  hsScraper.getBotList(function(bots) {
    res.render("./series/new", {bots: bots});
  });
});

// DELETE
router.delete("/packs/delete", middleware.isLoggedIn, function(req, res) {
  // Check if any packs have been selected for removal
  if (req.body.check) {
    // If only a single pack was selected, turn the pack into a list
    if (!Array.isArray(req.body.check)) {
      req.body.check = [req.body.check];
    }
    // Split the returned info to get the id of the episode and series of the pack
    var returnedParts = utilities.splitDeleteToParts(req.body.check)
    var seriesIds = returnedParts[1];
    var episodeIds = returnedParts[0];
    // Find all the series needed to do removal on
    Series.find({_id: seriesIds}, function(error, foundSeries) {
      if (error) {
        console.log(error);
      } else {
        foundSeries.forEach(function(series) {
          episodeIds.forEach(function(episodeId) {
            // Check if episode exists in the series tracking list
            if (series.episodes.indexOf(episodeId) != -1) {
              // Remove episode from series
              series.episodes.splice(series.episodes.indexOf(episodeId), 1);
            }
          });
          series.save();
        });
        // Remove all episodes
        Episode.remove({_id: episodeIds}, function(error) {
          if (error) {
            console.log(error);
          } else {
            console.log("Removed episodes");
          }
        });
      }
    });
  }
  res.redirect("/series");
});

module.exports = router;
