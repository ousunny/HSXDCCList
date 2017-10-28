// Required packages
var express               = require("express"),
    app                   = express(),
    bodyParser            = require("body-parser"),
    mongoose              = require("mongoose"),
    passport              = require("passport"),
    LocalStrategy         = require("passport-local"),
    methodOverride        = require("method-override");

// Routes
var indexRoutes           = require("./routes/index"),
    seriesRoutes          = require("./routes/series"),
    seriesAllRoutes       = require("./routes/all");

// Models
var User                  = require("./models/user");

// Port
var port                  = process.env.PORT || 3000;

// Setup MongoDB
mongoose.connect(process.env.MONGODB);

// Setup express
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));

// Authentication
app.use(require("express-session")({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Variables
app.use(function(req, res, next) {
  res.locals.currentUser = req.user;
  next();
});

// Setup routes
app.use("/", indexRoutes);
app.use("/series", seriesRoutes);
app.use("/series/all", seriesAllRoutes);

app.listen(port, function(req, res) {
  console.log("Server started on port " + port);
});
