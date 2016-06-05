var express = require("express");
var router = express.Router();

router.get("/", function(req, res, next) {
    var request = require("request");
    var base64 = require("base-64");
    var utf8 = require("utf8");

    var URL = "https://www.reddit.com/api/v1/access_token";

    var code = req.query.code;
    var error = req.query.error;
    if (error) {
        console.log(error);
        res.sendStatus(500);
    }

    var secret = process.env.REDDIT_API_SECRET;
    if (!secret) {
        var err = new Error("No Reddit API app secret defined");
        err.status = 500;
        next(err);
    }
    var passwordB64 = base64.encode(utf8.encode(["jQ9e-THHchxOZg", secret].join(":")));

    var form = {
        grant_type: "authorization_code",
        code: code,
        redirect_uri: "http://localhost:3000/auth/auth_callback"
    };
    var headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + passwordB64,
        "User-Agent": "web alienwall v0.0.1 (by /u/thedonkeypie)"
    };

    request.post({
        url: URL,
        headers: headers,
        form: form
    }, function(error, response, body) {
        if (!error && response.statusCode.toString()[0] === "2") {
            var now = new Date();

            var responseBody = JSON.parse(body);
            console.log(responseBody);

            if (!responseBody.error) {
                var accessToken = responseBody.access_token;
                var tokenExpiry = new Date(now.getTime() + Number(responseBody.expires_in) * 1000);
                var refreshToken = responseBody.refresh_token;

                var tenYearsInTheFuture = new Date(now.getTime() + 315569260000);

                res.cookie("access_token", accessToken, { expires: tokenExpiry });
                res.cookie("refresh_token", refreshToken, { expires: tenYearsInTheFuture });
                res.cookie("authdate", now.getTime(), { expires: tenYearsInTheFuture });

                res.append("Content-Type", "text/html");
                res.redirect("/wall/");
            } else {
                res.sendStatus(500);
            }
        } else {
            res.sendStatus(500);
        }
    });
});

module.exports = router;
