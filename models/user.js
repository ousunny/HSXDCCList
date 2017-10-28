// Required packages
var mongoose              = require("mongoose"),
    passportLocalMongoose = require("passport-local-mongoose");

// Schema
var userSchema = new mongoose.Schema({
    username: String,
    password: String,
    series: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Series"
    }]
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
