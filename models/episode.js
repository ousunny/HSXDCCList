// Required packages
var mongoose                = require("mongoose");

// Schema
var episodeSchema = new mongoose.Schema({
  title: String,
  episode: Number,
  pack: Number,
  group: String,
  bot: String,
  tracking: Boolean,
  series: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Series"
  }
});

module.exports = mongoose.model("Episode", episodeSchema);
