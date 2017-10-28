// Required packages
var mongoose              = require("mongoose");

// Schema
var seriesSchema = new mongoose.Schema({
  name: String,
  bot: String,
  quality: String,
  current: String,
  tracking: Boolean,
  individual: Boolean,
  user: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    username: String
  },
  episodes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Episode"
  }]
});

module.exports = mongoose.model("Series", seriesSchema);
