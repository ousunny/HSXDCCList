// Required packages
var mongoose              = require("mongoose");

// Schema
var seriesSchema = new mongoose.Schema({
  name: String,
  bot: String,
  group: String,
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
}, {usePushEach: true});

module.exports = mongoose.model("Series", seriesSchema);
