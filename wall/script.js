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

var entity2unicode = function(entStr) {
    var div = document.createElement("div");
    div.innerHTML = entStr;
    return div.textContent;
};

var reddit = function(endpoint, params, token, callback, post) {
    var paramsStr = "?";
    
    var userAgent = "RedditWall/0.1 by thedonkeypie";
    
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
        req.setRequestHeader("User-Agent", userAgent);
        if (token) req.setRequestHeader("Authorization", "bearer " + token);
        
        req.onreadystatechange = function() {
            if (req.readyState == 4 && req.status == 200) {
                callback(req.responseText);
            }
        };
        
        req.send(paramsStr.substring("1"));
    } else {
        var headers = {
            "User-Agent": userAgent
        };
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
var subInfoElem = document.querySelector("#subreddit-info");
var gotoSubInput = document.querySelector("#goto-subreddit");
var subsDatalist = document.querySelector("#subreddits-datalist");
var refreshBtn = document.querySelector("#refresh");

var initialTitle = document.head.querySelector("title").textContent;

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
    streamElem.classList.remove("loading");
    layoutMasonry();
}

function layoutMasonry(){
    streamMasonry = new Masonry(document.querySelector("#stream"), {
        columnWidth: 480,
        itemSelector: ".post",
        gutter: 40,
        isFitWidth: true,
        transitionDuration: 0
    });
}

function getMore() {
    clearInterval(scrollLoadInterval);
    
    var limit = 25;
    var oat = readCookie("oat");
    
    var endpoint = "https://oauth.reddit.com/r/" + encodeURIComponent(sub) + "/" + encodeURIComponent(sortOrder) + ".json";
    if (sub === FRONT_PAGE) {
        endpoint = "https://oauth.reddit.com/" + encodeURIComponent(sortOrder) + ".json";
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
                postElem.classList.add("post");
                
                var hrTime = new HRTime(new Date(post.data.created_utc * 1000));
                var timeString = hrTime.time + " " + hrTime.unit + ((Math.abs(hrTime.time) !== 1) ? "s" : "") + " ago";
                var fullname = post.kind + "_" + post.data.id;
                var postURL = post.data.url;
                var likes = post.data.likes;
                var saved = post.data.saved;
                
                var postElemHtml = 
"<a href='" + postURL + "'><h3>" + post.data.title + "</h3></a>\
<div class='preview'></div>\
<div class='post-info'>\
<a href='//www.reddit.com/u/" + post.data.author + "' rel='author'>" + post.data.author + "</a>\
<a class='post-info-subreddit' href='//www.reddit.com/r/" + post.data.subreddit + "'>" + post.data.subreddit + "</a>\
<a href='//www.reddit.com" + post.data.permalink + "'>" + timeString + "</a>\
<a class='post-info-comments'>" + post.data.num_comments + " comments</a>\
</div>\
<div class='vote-container'>\
<button class='vote up'></button><span class='post-score'>" + post.data.score + "</span><button class='vote down'></button><button class='vote save'></button>\
</div>\
<div class='comments-container'>\
<h4>Comments</h4>\
</div>\
<button class='close-post'></button>";
                
                postElem.innerHTML = postElemHtml;
                postElem.href = postURL;
                postElem.dataset.fullname = fullname;
                
                if (post.data.stickied === true) postElem.classList.add("stickied");
                
                var upvoteBtn = postElem.querySelector(".vote.up");
                var downvoteBtn = postElem.querySelector(".vote.down");
                var saveBtn = postElem.querySelector(".vote.save");
                var commentsElem = postElem.querySelector(".comments-container");
                var commentsBtn = postElem.querySelector(".post-info-comments");
                var closeBtn = postElem.querySelector(".close-post");
                
                if (likes === true) upvoteBtn.classList.add("yes");
                if (likes === false) downvoteBtn.classList.add("yes");
                if (saved === true) saveBtn.classList.add("yes");
                
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
                    
                    var oat = readCookie("oat");
                    reddit("https://oauth.reddit.com/api/vote", {
                        dir: dir,
                        id: this.parentElement.parentElement.dataset.fullname
                    }, oat, function(r){
                        console.log(r);
                    }, true);
                    
                    this.classList.toggle("yes");
                };
                
                upvoteBtn.addEventListener("click", voteListener);
                downvoteBtn.addEventListener("click", voteListener);
                
                saveBtn.addEventListener("click", function(){
                    var endpoint = "https://oauth.reddit.com/api/save";
                    if (this.classList.contains("yes")) endpoint = "https://oauth.reddit.com/api/unsave";
                    
                    var oat = readCookie("oat");
                    reddit(endpoint, {
                        category: "redditwall",
                        id: this.parentElement.parentElement.dataset.fullname
                    }, oat, function(r){
                        console.log(r);
                    }, true);
                    
                    this.classList.toggle("yes");
                });
                
                commentsBtn.addEventListener("click", function(){
                    var parentElem = this.parentElement.parentElement
                    expandPost(parentElem);
                    parentElem.scrollTop = parentElem.querySelector(".comments-container").offsetTop + document.querySelector("header").offsetHeight;
                });
                
                closeBtn.addEventListener("click", function(){
                    unexpandPost(this.parentElement);
                });
                
                var previewElem = postElem.querySelector(".preview");
                var onLoad = "streamMasonry.layout()";
                
                /* make media previews */
                
                if (parseURL(postURL, "hostname") === "www.youtube.com" && parseURL(postURL, "path") === "/watch" && parseURL(postURL, "params").v) {
                    /* youtube video */
                    
                    var id = parseURL(postURL, "params").v;
                    var width = streamMasonry.columnWidth - streamMasonry.gutter;
                    var height = width * 9/16;
                    
                    previewElem.classList.add("visible");
                    previewElem.innerHTML = "<iframe type='text/html' width='" + width + "' height='" + height + "' src='http://www.youtube.com/embed/" + id + "' frameborder='0'/>";
                    postElem.dataset.preview = "youtube";
                }
                
                if (parseURL(postURL, "hostname") === "gfycat.com" || parseURL(postURL, "hostname") === "www.gfycat.com") {
                    /* gfycat "gif" */
                    var id = parseURL(postURL, "path").substring(1);
                    
                    var prefixes = ["giant", "fat", "zippy"];
                    var fileTypes = ["webm", "mp4"];
                    
                    var sourcesHTML = "";
                    prefixes.forEach(function(prefix){
                        fileTypes.forEach(function(fileType){
                            sourcesHTML += "<source type='video/" + fileType + "' src='http://" + prefix + ".gfycat.com/" + id + "." + fileType + "'>";
                        });
                    });
                    
                    previewElem.classList.add("visible");
                    previewElem.innerHTML = "<video controls loop muted onloadeddata='" + onLoad + "'>" + sourcesHTML + "</video>";
                    postElem.dataset.preview = "gfycat";
                }
                
                if (parseURL(postURL, "hostname") === "i.imgur.com" && (new RegExp("\\.gifv$", "gi")).test(postURL)) {
                    /* imgur gifv */

                    var path = parseURL(postURL, "path");
                    var id = path.substring(0, path.lastIndexOf(".gifv"));
                    var webmURL = "http://i.imgur.com" + id + ".webm";
                    var mp4URL = "http://i.imgur.com" + id + ".mp4";
                    
                    previewElem.classList.add("visible");
                    previewElem.innerHTML = "<video controls loop muted onloadeddata='" + onLoad + "'><source src='" + webmURL + "' type='video/webm'><source src='" + mp4URL + "' type='video/mp4'></video>";
                    postElem.dataset.preview = "gifv";
                }
                
                if (parseURL(postURL, "hostname") === "imgur.com" && parseURL(postURL, "path").substring(1).length === 7 && new RegExp("^[a-z0-9]+$", "i").test(parseURL(postURL, "path").substring(1))) {
                    /* imgur */
                    
                    var id = parseURL(postURL, "path").substring(1);
                    var imgURL = "http://i.imgur.com/" + id + ".jpg";
                    
                    previewElem.classList.add("visible");
                    previewElem.innerHTML = "<img src='" + imgURL + "' onload='" + onLoad + "'>";
                    postElem.dataset.preview = "imgur";
                }
                
                if ((new RegExp("(\\.gif|\\.jpg|\\.jpeg|\\.webp|\\.png|\\.tiff)$", "gi")).test(postURL)) {
                    /* image */
                    
                    var url = postURL;
                    
                    previewElem.classList.add("visible");
                    previewElem.innerHTML = "<img src='" + url + "' onload='" + onLoad + "'>";
                    postElem.dataset.preview = "image";
                }
                
                if (post.data.is_self && post.data.selftext_html) {
                    /* self */
                    
                    previewElem.classList.add("visible");
                    previewElem.innerHTML = "<div class='selftext-container'>" + entity2unicode(post.data.selftext_html) + "</div>";
                    
                    postElem.dataset.preview = "self";
                }
                
                if (postElem.dataset.preview === "self" || postElem.dataset.preview === "image" || postElem.dataset.preview === "imgur" || postElem.dataset.preview === "gifv" || postElem.dataset.preview === "gfycat") {
                    previewElem.addEventListener("click", function(){
                        expandPost(this.parentElement);
                    });
                }

                streamElem.appendChild(postElem);
                
                if (postElem.dataset.preview === "self" && previewElem.querySelector(".md").offsetHeight > previewElem.querySelector(".selftext-container").offsetHeight) {
                    document.querySelector(".selftext-container").classList.add("overflow");
                }
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
            streamElem.classList.remove("loading");
        } else {
            errorFunc();
        }
    });
    
    streamElem.classList.add("loading");
}

function displayComments(node, elem, topLevel) {
    var comments = [];
    if (topLevel) {
        comments = node.data.children;
    } else if (node.kind === "t1" && node.data.replies.data && (node.data.replies.data.children.length !== 0)) {
        comments = node.data.replies.data.children;
    }
    
    var voteListener = function(e){
        e.preventDefault();
        e.stopPropagation();

        var dir;
        var cList = this.classList;
        var scoreElem = this.parentElement.querySelector(".comment-score");
        
        var scoreUnit = " points";

        if (cList.contains("up") && cList.contains("yes")) {
            dir = 0;
            scoreElem.textContent = parseInt(scoreElem.textContent) - 1 + scoreUnit;
        } else if (cList.contains("down") && cList.contains("yes")) {
            dir = 0;
            scoreElem.textContent = parseInt(scoreElem.textContent) + 1 + scoreUnit;
        } else if (cList.contains("up")) {
            dir = 1;
            scoreElem.textContent = parseInt(scoreElem.textContent) + 1 + scoreUnit;
        } else if (cList.contains("down")) {
            dir = -1;
            scoreElem.textContent = parseInt(scoreElem.textContent) - 1 + scoreUnit;
        }

        var oat = readCookie("oat");
        reddit("https://oauth.reddit.com/api/vote", {
            dir: dir,
            id: this.parentElement.parentElement.parentElement.dataset.fullname
        }, oat, function(r){
            console.log(r);
        }, true);

        this.classList.toggle("yes");
    };

    comments.forEach(function(comment){
        var commentElem = document.createElement("div");
        commentElem.classList.add("comment-container");
        
        if (comment.kind === "t1") {
            var body = comment.data.body_html;
            var author = comment.data.author;
            var fullname = "t1_" + comment.data.id;

            var hrTime = new HRTime(new Date(comment.data.created_utc * 1000));
            var timeString = hrTime.time + " " + hrTime.unit + ((Math.abs(hrTime.time) !== 1) ? "s" : "");
            var likes = comment.data.likes;
            var score = (comment.data.score_hidden ? "[score hidden]" : comment.data.score + " points");

            commentElem.innerHTML = "<div class='comment-body-container'>\
<div class='comment-body'>" + entity2unicode(body) + "</div>\
<div class='comment-info'>\
<a href='http://www.reddit.com/u/" + author + "'>" + author + "</a>\
<button class='vote up'></button>\
<span class='comment-score'>" + score + "</span>\
<button class='vote down'></button>\
<span>" + timeString + "</span>\
</div>\
</div>";
            commentElem.dataset.fullname = fullname;
            
            var upvoteBtn = commentElem.querySelector(".vote.up");
            var downvoteBtn = commentElem.querySelector(".vote.down");
            
            upvoteBtn.addEventListener("click", voteListener);
            downvoteBtn.addEventListener("click", voteListener);
            
            if (likes === true) upvoteBtn.classList.add("yes");
            if (likes === false) downvoteBtn.classList.add("yes");

            displayComments(comment, commentElem);
        } else if (comment.kind === "more") {
            var parentId = comment.data.id;
            
            var expandedPostElem = document.querySelector("#stream .post.expanded");
            
            commentElem.innerHTML = "<a>continue this thread...</a>";
            
            commentElem.dataset.parentId = parentId;
            commentElem.dataset.subreddit = expandedPostElem.querySelector(".post-info-subreddit").textContent;
            commentElem.dataset.linkId = expandedPostElem.dataset.fullname;
            
            commentElem.addEventListener("click", function(){
                var subreddit = this.dataset.subreddit;
                var fullname = this.dataset.linkId;
                var parentId = this.dataset.parentId;
                
                var that = this;
                
                reddit("https://oauth.reddit.com/r/" + subreddit + "/comments/" + fullname.substring(fullname.indexOf("_") + 1) + ".json", {
                    comment: parentId
                }, readCookie("oat"), function(r){
                    r = JSON.parse(r);
                    displayComments(r[1], that.parentElement, true);
                    
                    that.classList.remove("loading");
                    that.style.display = "none";
                    
                    layoutMasonry();
                });
                
                this.classList.add("loading");
            });
        }
        
        elem.appendChild(commentElem);
    });
}

function expandPost(elem) {
    var subreddit = elem.querySelector(".post-info-subreddit").textContent;
    var commentsElem = elem.querySelector(".comments-container");
    var fullname = elem.dataset.fullname;
    
    if (commentsElem.dataset.loaded !== "true") {
        reddit("https://oauth.reddit.com/r/" + subreddit + "/comments/" + fullname.substring(fullname.indexOf("_") + 1) + ".json", {
            limit: 50
        }, readCookie("oat"), function(r){
            r = JSON.parse(r);
            displayComments(r[1], commentsElem, true);
            commentsElem.dataset.loaded = "true";

            commentsElem.classList.remove("loading");
            layoutMasonry();
        });

        commentsElem.classList.add("loading");
    }
    
    document.body.classList.add("scroll-locked");
    elem.classList.add("expanded");
}

function unexpandPost(elem) {
    document.body.classList.remove("scroll-locked");
    elem.classList.remove("expanded");
    layoutMasonry();
}

function getSubredditInfo(subName) {
    var endpoint = "https://oauth.reddit.com/r/" + encodeURIComponent(subName) + "/about.json";
    var oat = readCookie("oat");
    
    subInfoElem.classList.add("loading");
    
    reddit(endpoint, {}, oat, function(r){
        r = JSON.parse(r);
        var data = r.data;
        
        var title = data.title;
        var displayName = data.display_name;
        
        subInfoElem.dataset.fullname = r.kind + "_" + data.id;
        subInfoElem.querySelector("h2").innerHTML = title;
        
        document.title = title + " (/r/" + displayName + ") - " + initialTitle;
        
        var subscribeBtn = subInfoElem.querySelector("#subscribe-btn");
        if (data.user_is_subscriber === true || subName === FRONT_PAGE || subName.toLowerCase() === "all") {
            document.querySelector("#content").classList.remove("fixed-subreddit-info");
            subscribeBtn.classList.add("subscribed");
        } else {
            document.querySelector("#content").classList.add("fixed-subreddit-info");
            subscribeBtn.classList.remove("subscribed");
        }
        
        subscribeBtn.addEventListener("click", function(){
            var endpoint = "https://oauth.reddit.com/api/subscribe";
            var oat = readCookie("oat");
            
            var action = "sub";
            if (this.classList.contains("subscribed")) action = "unsub";
            
            var that = this;
            
            reddit(endpoint, {
                action: action,
                sr: subInfoElem.dataset.fullname
            }, oat, function(r){
                if (action === "sub") {
                    that.classList.add("subscribed");
                } else {
                    that.classList.remove("subscribed");
                }
                that.classList.remove("loading");
            }, true);
            
            this.classList.add("loading");
        });
        
        subInfoElem.classList.remove("loading");
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
        limit: 100
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
            subsListItem.dataset.subreddit = sub.data.display_name.toUpperCase();
            subsListItem.textContent = sub.data.display_name;
            subsListElem.appendChild(subsListItem);
            
            var datalistItem = document.createElement("option");
            datalistItem.textContent = sub.data.display_name;
            subsDatalist.appendChild(datalistItem);
        });

        [].slice.call(subsListElem.querySelectorAll("li[data-subreddit]")).forEach(function(subsListItem){
            subsListItem.addEventListener("click", function(){
                changeSubreddit(this.dataset.subreddit);
            });
        });
        
        subsListElem.classList.remove("loading");
    });
    
    subsListElem.classList.add("loading");
}

function changeSubreddit(subName){
    sub = subName;
    
    prepareGetMore();
    getMore();
    
    if (subName.toLowerCase() !== FRONT_PAGE.toLowerCase() && subName.toLowerCase() !== "all") {
        getSubredditInfo(subName);
        subInfoElem.classList.remove("hidden");
    } else {
        subInfoElem.classList.add("hidden");
    }
    
    [].slice.call(document.querySelectorAll("#subreddit-list li[data-subreddit]")).forEach(function(subsListItem){
        subsListItem.classList.remove("current");
    });
    
    var currentSubListItem = document.querySelector("#subreddit-list li[data-subreddit='" + sub.toUpperCase() + "']");
    if (currentSubListItem) {
        currentSubListItem.classList.add("current");
    }
    
    document.title = initialTitle;
    document.body.classList.remove("scroll-locked");
    window.scrollTo(0, 0);
}

gotoSubInput.addEventListener("focus", function(){
    this.select();
});

gotoSubInput.addEventListener("keydown", function(e){
    if (e.which === 13) {
        if (this.value) {
            changeSubreddit(this.value);
            this.blur();
        }
    }
});

refreshBtn.addEventListener("click", function(){
    changeSubreddit(sub);
});

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