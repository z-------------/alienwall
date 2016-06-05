var express = require("express");
var path = require("path");
var logger = require("morgan");
var bodyParser = require("body-parser");
var favicon = require("serve-favicon");
var http = require("http");
var path = require("path");

var routes = [{
    path: "/auth/auth_callback", router: "auth/authCallback"
}, {
    path: "/auth/refresh_auth", router: "auth/refreshAuth"
}];

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

// app.use(favicon(path.join(__dirname, "/public/assets/img/icon16.png")));
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

for (routeDef of routes) {
    app.use(routeDef.path, require("./routes/" + routeDef.router));
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error("Not Found");
    err.status = 404;
    next(err);
});

// error handlers
if (app.get("env") === "development") {
    // development error handler
    // will print stacktrace
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render("error", {
            message: err.message.toString(),
            error: err
        });
    });
} else {
    // production error handler
    // no stacktraces leaked to user
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render("status", {
            status: err.status,
            message: err.message.toString(),
            error: {}
        });
    });
}

module.exports = app;
