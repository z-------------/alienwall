var FRONT_PAGE = "*FRONT PAGE";

var xhr = function(url, callback, headers) {
    console.log("XHR request for " + url);
    var oXHR = new XMLHttpRequest();  
    oXHR.open("GET", url, true);  
    oXHR.onreadystatechange = function (oEvent) {
        if (oXHR.readyState === 4) {  
            if (oXHR.status === 200) {
                callback(oXHR.responseText)  
            } else {  
                callback(false);
            }  
        }  
    };
    if (headers) {
        var headerKeys = Object.keys(headers);
        headerKeys.forEach(function(headerKey){
            oXHR.setRequestHeader(headerKey, headers[headerKey]);
        });
    }
    oXHR.send(null); 
};

var reddit = function(endpoint, params, token, callback, post) {
    var paramsStr = "?";
    
    var paramsArray = [];
    var paramsKeys = Object.keys(params);
    paramsKeys.forEach(function(paramsKey){
        paramsArray.push(encodeURIComponent(paramsKey) + "=" + encodeURIComponent(params[paramsKey]));
    });
    paramsStr += paramsArray.join("&");
    
    if (post) {
        var req = new XMLHttpRequest();
        req.open("POST", endpoint, true);
        
        req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        if (token) req.setRequestHeader("Authorization", "bearer " + token);
        
        req.onreadystatechange = function() {
            if (req.readyState == 4 && req.status == 200) {
                callback(req.responseText);
            }
        };
        
        req.send(paramsStr.substring("1"));
    } else {
        var headers = {};
        if (token) headers.Authorization = "bearer " + token;
        xhr(endpoint + paramsStr, callback, headers);
    }
};

var parseURL = function(url, target) {
    var parser = document.createElement("a");
    parser.href = url;
    switch (target) {
        case "protocol":
            return parser.protocol; break;
        case "hostname":
            return parser.hostname; break;
        case "port":
            return parser.port; break;
        case "path":
            return parser.pathname; break;
        case "patharray":
            var _pathstring = parser.pathname.substring(1,this.length-1); // cut off leading and ending slashes (/)
            return _pathstring.split("/"); break;
        case "paramsstring":
            return parser.search; break;
        case "params":
            var _urlparams = parser.search.substring(1,parser.search.length).split("&"); // ["foo=bar","bax=qux","waffles=pie"]
            var _paramsobject = {};
            for (i=0;i<_urlparams.length;i++) {
                var _key = _urlparams[i].split("=")[0];
                var _val = _urlparams[i].split("=")[1];
                _paramsobject[_key] = _val;
            };
            return _paramsobject;
            break;
        case "hash":
            return parser.hash; break;
        case "host":
            return parser.host; break;
        default:
            return parser.href; break;
    }
};

var sortInput = document.querySelector("#sort-input");
var timeInput = document.querySelector("#time-input");
var goBtn = document.querySelector("#go-btn");
var streamElem = document.querySelector("#stream");
var subsListElem = document.querySelector("#subreddit-list");

var streamMasonry;

var timeFilter;
var sortOrder;
var afterID = null;
var sub = subsListElem.querySelectorAll("li")[0].dataset.subreddit;

var allSubs = [];

var scrollLoadInterval;

var errorFunc = function(){
    var errorLI = document.createElement("li");
    errorLI.innerHTML = "<p>Couldn't load posts from /r/" + sub + "</p>";
    streamElem.appendChild(errorLI);
    layoutMasonry();
}

function layoutMasonry(){
    streamMasonry = new Masonry(document.querySelector("#stream"), {
        columnWidth: 480,
        itemSelector: "li",
        gutter: 40,
        isFitWidth: true,
        transitionDuration: 0
    });
}

function getMore() {
    clearInterval(scrollLoadInterval);
    
    var limit = 50;
    var oat = null;
    
    var endpoint = "http://www.reddit.com/r/" + encodeURIComponent(sub) + "/" + encodeURIComponent(sortOrder) + ".json";
    if (sub === FRONT_PAGE) {
        endpoint = "https://oauth.reddit.com/" + encodeURIComponent(sortOrder) + ".json";
        oat = readCookie("oat")
    }
    
    var params = {
        limit: limit
    };
    
    if (afterID) params.after = afterID;
    if (timeFilter) params.t = timeFilter;
    
    reddit(endpoint, params, oat, function(r){
        r = JSON.parse(r);
        
        console.log(r);
        
        if (r && r.data.children && r.data.children.length !== 0) {
            var posts = r.data.children;
            posts.forEach(function(post){
                var postElem = document.createElement("li");
                
                var hrTime = new HRTime(new Date(post.data.created_utc * 1000));
                var timeString = hrTime.time + " " + hrTime.unit + ((Math.abs(hrTime.time) !== 1) ? "s" : "") + " ago";

                var postElemHtml = 
"<a href='" + post.data.url + "'><h3>" + post.data.title + "</h3></a>\
<div class='preview'></div>\
<div class='post-info'>\
<a href='//www.reddit.com/u/" + post.data.author + "' rel='author'>" + post.data.author + "</a>\
<a href='//www.reddit.com/r/" + post.data.subreddit + "'>" + post.data.subreddit + "</a>\
<a href='//www.reddit.com" + post.data.permalink + "'>" + timeString + "</a>\
</div>\
<div class='vote-container'>\
<button class='vote up'></button><span class='post-score'>" + post.data.score + "</span><button class='vote down'></button>\
</div>";
                
                postElem.innerHTML = postElemHtml;
                postElem.href = post.data.url;
                postElem.dataset.fullname = post.kind + "_" + post.data.id;
                
                var likes = post.data.likes;
                var upvoteBtn = postElem.querySelector(".vote.up");
                var downvoteBtn = postElem.querySelector(".vote.down");
                
                if (likes === true) upvoteBtn.classList.add("yes");
                if (likes === false) downvoteBtn.classList.add("yes");
                
                var voteListener = function(e){
                    e.preventDefault();
                    e.stopPropagation();
                    
                    var dir;
                    var cList = this.classList;
                    var scoreElem = this.parentElement.querySelector(".post-score");
                    
                    if (cList.contains("up") && cList.contains("yes")) {
                        dir = 0;
                        scoreElem.textContent -= 1;
                    } else if (cList.contains("down") && cList.contains("yes")) {
                        dir = 0;
                        scoreElem.textContent = parseInt(scoreElem.textContent) + 1;
                    } else if (cList.contains("up")) {
                        dir = 1;
                        scoreElem.textContent = parseInt(scoreElem.textContent) + 1;
                    } else if (cList.contains("down")) {
                        dir = -1;
                        scoreElem.textContent -= 1;
                    }
                    
                    this.classList.toggle("yes");
                    
                    var oat = readCookie("oat");
                    reddit("https://oauth.reddit.com/api/vote", {
                        dir: dir,
                        id: this.parentElement.parentElement.dataset.fullname
                    }, oat, function(r){
                        console.log(r);
                    }, true);
                };
                
                postElem.querySelector(".vote.up").addEventListener("click", voteListener);
                postElem.querySelector(".vote.down").addEventListener("click", voteListener);
                
                var previewElem = postElem.querySelector(".preview");
                var onLoad = "streamMasonry.layout()";
                
                if (parseURL(post.data.url, "hostname") === "gfycat.com" || parseURL(post.data.url, "hostname") === "www.gfycat.com") {
                    var url = post.data.url;
                    var path = parseURL(url, "path");
                    var webmURL = "http://fat.gfycat.com" + path + ".webm";
                    var mp4URL = "http://giant.gfycat.com" + path + ".mp4";
                    
                    previewElem.classList.add("visible");
                    previewElem.innerHTML = "<video autoplay loop muted onloadeddata='" + onLoad + "'><source src='" + webmURL + "' type='video/webm'><source src='" + mp4URL + "' type='video/mp4'></video>";
                    postElem.dataset.preview = "gfycat";
                }
                
                if ((new RegExp("(.gif|.gifv|.jpg|.jpeg|.webp|.png|.tiff)$", "gi")).test(post.data.url)) {
                    var url = post.data.url;
                    if ((new RegExp(".gifv$", "gi")).test(post.data.url)) url = url.substring(0, url.length - 1);
                    
                    previewElem.classList.add("visible");
                    previewElem.innerHTML = "<img src='" + url + "' onload='" + onLoad + "'>";
                    postElem.dataset.preview = "image";
                }
                
                if (post.data.is_self) {
                    previewElem.classList.add("visible");
                    previewElem.innerHTML = "<p>" + post.data.selftext.substring(0, 500) + "...</p>";
                    postElem.dataset.preview = "self";
                }

                streamElem.appendChild(postElem);
                
                layoutMasonry();
            });

            var lastPost = posts[posts.length - 1];
            afterID = lastPost.kind + "_" + lastPost.data.id;

            scrollLoadInterval = setInterval(function(){
                var bodyHeight = Math.max(document.body.scrollHeight, document.body.offsetHeight, document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight);
                if (window.scrollY + window.innerHeight >= bodyHeight) {
                    getMore();
                }
            }, 100);
            
            layoutMasonry();
        } else {
            errorFunc();
        }
    });
}

function prepareGetMore() {
    timeFilter = timeInput.value;
    sortOrder = sortInput.value;
    afterID = null;
    streamElem.innerHTML = "";
}

sortInput.addEventListener("change", function(){
    if (this.value === "top" || this.value === "controversial") {
        timeInput.classList.add("visible");
    } else {
        timeInput.classList.remove("visible");
    }
    prepareGetMore();
    getMore();
});

timeInput.addEventListener("change", function(){
    prepareGetMore();
    getMore();
});

function createCookie(name,value,days) {
	if (days) {
		var date = new Date();
		date.setTime(date.getTime()+(days*24*60*60*1000));
		var expires = "; expires="+date.toGMTString();
	}
	else var expires = "";
	document.cookie = name+"="+value+expires+"; path=/";
}

function readCookie(name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
}

function eraseCookie(name) {
	createCookie(name,"",-1);
}

function getUserSubreddits(){
    var oat = readCookie("oat");
    reddit("https://oauth.reddit.com/subreddits/mine/subscriber", {
        limit: "100"
    }, oat, function(r){
        r = JSON.parse(r);

        subs = r.data.children.sort(function(a, b){
            var aName = a.data.display_name.toLowerCase();
            var bName = b.data.display_name.toLowerCase();
            if (aName > bName) return 1;
            if (bName > aName) return -1;
            return 0;
        });

        subs.forEach(function(sub){
            allSubs.push(sub.data.display_name);

            var subsListItem = document.createElement("li");
            subsListItem.dataset.subreddit = sub.data.display_name;
            subsListItem.textContent = sub.data.display_name;
            subsListElem.appendChild(subsListItem);
        });

        [].slice.call(subsListElem.querySelectorAll("li[data-subreddit]")).forEach(function(subsListItem){
            subsListItem.addEventListener("click", function(){
                changeSubreddit(this.dataset.subreddit);
            });
        });
    });
}

function changeSubreddit(subName){
    sub = subName;
    
    prepareGetMore();
    getMore();
    
    [].slice.call(document.querySelectorAll("header #subreddit-list li[data-subreddit]")).forEach(function(subsListItem){
        subsListItem.classList.remove("current");
    });
    document.querySelector("header #subreddit-list li[data-subreddit='" + sub + "']").classList.add("current");
    
    window.scrollTo(0, 0);
}

if (!readCookie("oat")) {
    window.location = "/";
}

setInterval(function(){
    if (!readCookie("oat")) {
        alert("Your session has expired. Please sign in again.");
        window.location = "/";
    }
}, 1000);

changeSubreddit(FRONT_PAGE);
getUserSubreddits();