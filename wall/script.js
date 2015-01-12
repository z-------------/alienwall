var ONE_SECOND = 1000;
var TEN_MINUTES = 600000;
var ONE_HOUR = 3600000;

var FRONT_PAGE = "*front page";

NodeList.prototype.addEventListener = HTMLCollection.prototype.addEventListener = function(event, listener, bool){
    [].slice.call(this).forEach(function(elem){
        elem.addEventListener(event, listener, bool);
    });
};

HTMLElement.prototype.prependChild = function(child){
    return this.insertBefore(child, this.children[0]);
};

HTMLElement.prototype.insertAfter = function(newElt, afterElem){
    var children = [].slice.call(this.children);
    var beforeElem = children[children.indexOf(afterElem) + 1];
    
    return this.insertBefore(newElt, beforeElem);
};

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

var jsonp = function(url, callback) {
    console.log("JSONP request for " + url);
    var callbackName = "jsonpCallback"+Math.round(Math.random()*10000000);
    window[callbackName] = callback;
    
    var scriptElem = document.createElement("script");
    
    if (url.indexOf("?") != -1) {
        scriptElem.src = url + "&callback=" + callbackName;
    } else {
        scriptElem.src = url + "?callback=" + callbackName;
    }
    
    document.head.appendChild(scriptElem);
};

var entity2unicode = function(entStr) {
    var div = document.createElement("div");
    div.innerHTML = entStr;
    return div.textContent;
};

var reddit = function(endpoint, params, callback, post) {
    var token = readCookie("access_token");
    if (token) {
        endpoint = "https://oauth.reddit.com/" + endpoint;
        
        var paramsStr = "";
        var paramsArray = [];
        var paramsKeys = Object.keys(params);
        if (paramsKeys.length > 0) paramsStr = "?";
        
        paramsKeys.forEach(function(paramsKey){
            paramsArray.push(encodeURIComponent(paramsKey) + "=" + encodeURIComponent(params[paramsKey]));
        });
        paramsStr += paramsArray.join("&");

        if (post) {
            console.log("XHR request for " + endpoint);
            
            var req = new XMLHttpRequest();
            req.open("POST", endpoint, true);

            req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            req.setRequestHeader("Authorization", "bearer " + token);

            req.onreadystatechange = function() {
                if (req.readyState == 4 && req.status == 200) {
                    callback(req.responseText);
                }
            };

            req.send(paramsStr.substring("1"));
        } else {
            var headers = {
                "Authorization": "bearer " + token
            };
            xhr(endpoint + paramsStr, callback, headers);
        }
    } else {
        return false;
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
var refreshBtns = document.querySelectorAll(".refresh");
var gotoSubmitBtn = document.querySelector("#submit-post");
var navBurgerBtn = document.querySelector(".header-btn.burger");
var sidebarElem = document.querySelector("#sidebar");

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
        /*columnWidth: 480,*/
        itemSelector: ".post",
        columnWidth: 480,
        gutter: 50,
        isFitWidth: true,
        transitionDuration: 0,
        isResizeBound: false
    });
}

function getMore() {
    clearInterval(scrollLoadInterval);
    
    var limit = 25;
    
    var endpoint = "r/" + encodeURIComponent(sub) + "/" + encodeURIComponent(sortOrder) + ".json";
    if (sub === FRONT_PAGE) {
        endpoint = encodeURIComponent(sortOrder) + ".json";
    }
    
    var params = {
        limit: limit
    };
    
    if (afterID) params.after = afterID;
    if (timeFilter) params.t = timeFilter;
    
    reddit(endpoint, params, function(r){
        r = JSON.parse(r);
        
        console.log(r);
        
        if (r && r.data.children && r.data.children.length !== 0) {
            var posts = r.data.children;
            posts.forEach(function(post){
                var postElem = document.createElement("li");
                postElem.classList.add("post", "card");
                
                var hrTime = new HRTime(new Date(post.data.created_utc * 1000));
                var timeString = hrTime.time + " " + hrTime.unit + ((Math.abs(hrTime.time) !== 1) ? "s" : "") + " ago";
                var fullname = post.kind + "_" + post.data.id;
                var postURL = post.data.url;
                var likes = post.data.likes;
                var saved = post.data.saved;
                
                var postElemHtml = 
"<a href='" + postURL + "' target='_blank'><h3>" + post.data.title + "</h3></a>\
<div class='preview'></div>\
<div class='post-info'>\
<a class='post-info-author' href='//www.reddit.com/u/" + post.data.author + "' rel='author'>" + post.data.author + "</a>\
<a class='post-info-subreddit' href='#!/r/" + post.data.subreddit + "'>" + post.data.subreddit + "</a>\
<a class='post-info-permalink post-info-date' title='permalink' href='//www.reddit.com" + post.data.permalink + "'>" + timeString + "</a>\
<a class='post-info-comments'>" + post.data.num_comments + " comments</a>\
</div>\
<div class='vote-container'>\
<button class='vote up'></button><span class='post-score'>" + post.data.score + "</span><button class='vote down'></button><button class='vote save'></button>\
</div>\
<div class='comments-container'>\
<div class='comment-compose-container' data-fullname='" + fullname + "'>\
<textarea class='comment-compose' placeholder='Write a comment'></textarea>\
<button class='comment-submit'></button>\
</div>\
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
                var commentBtn = postElem.querySelector(".comment-submit");
                
                if (likes === true) upvoteBtn.classList.add("yes");
                if (likes === false) downvoteBtn.classList.add("yes");
                if (saved === true) saveBtn.classList.add("yes");
                
                upvoteBtn.addEventListener("click", postVoteListener);
                downvoteBtn.addEventListener("click", postVoteListener);
                
                saveBtn.addEventListener("click", function(){
                    var endpoint = "api/save";
                    if (this.classList.contains("yes")) endpoint = "api/unsave";
                    
                    reddit(endpoint, {
                        category: "redditwall",
                        id: this.parentElement.parentElement.dataset.fullname
                    }, function(r){
                        console.log(r);
                    }, true);
                    
                    this.classList.toggle("yes");
                });
                
                commentsBtn.addEventListener("click", function(){
                    var parentElem = this.parentElement.parentElement
                    expandPost(parentElem);
                    parentElem.scrollTop = parentElem.querySelector(".comments-container").offsetTop - document.querySelector("header").offsetHeight;
                });
                
                closeBtn.addEventListener("click", function(){
                    unexpandPost(this.parentElement);
                });
                
                commentBtn.addEventListener("click", commentListener);
                
                var previewElem = postElem.querySelector(".preview");
                var onLoad = "streamMasonry.layout()";
                
                /* make media previews */
                var urlHostname = parseURL(postURL, "hostname");
                var urlPath = parseURL(postURL, "path");
                var urlParams = parseURL(postURL, "params");
                
                if ((urlHostname === "www.youtube.com" && urlPath === "/watch" && urlParams.v) || (urlHostname === "youtu.be" && urlPath.length > 1)) {
                    /* youtube video */
                    
                    var id;
                    if (urlHostname === "www.youtube.com") {
                        id = urlParams.v;
                    } else if ((urlHostname === "youtu.be")) {
                        id = urlPath.substring(1);
                    }
                    
                    var width = streamMasonry.columnWidth - streamMasonry.gutter;
                    var height = width * 9/16;
                    
                    previewElem.innerHTML = "<iframe type='text/html' width='" + width + "' height='" + height + "' src='https://www.youtube.com/embed/" + id + "' frameborder='0'/>";
                    
                    postElem.dataset.preview = "youtube";
                    previewElem.classList.add("visible");
                }
                
                if (urlHostname === "gfycat.com" || urlHostname === "www.gfycat.com") {
                    /* gfycat gfy */
                    
                    var id = urlPath.substring(1);
                    
                    var prefixes = ["giant", "fat", "zippy"];
                    var fileTypes = ["webm", "mp4"];
                    
                    var sourcesHTML = "";
                    prefixes.forEach(function(prefix){
                        fileTypes.forEach(function(fileType){
                            sourcesHTML += "<source type='video/" + fileType + "' src='http://" + prefix + ".gfycat.com/" + id + "." + fileType + "'>";
                        });
                    });
                    
                    previewElem.innerHTML = "<video loop muted onloadeddata='" + onLoad + "'>" + sourcesHTML + "</video>";
                    
                    postElem.dataset.preview = "gfycat";
                    previewElem.classList.add("visible");
                }
                
                if (urlHostname === "i.imgur.com" && (new RegExp("\\.gifv$", "gi")).test(postURL)) {
                    /* imgur gifv */

                    var id = urlPath.substring(0, urlPath.lastIndexOf(".gifv"));
                    var webmURL = "http://i.imgur.com" + id + ".webm";
                    var mp4URL = "http://i.imgur.com" + id + ".mp4";
                    
                    previewElem.innerHTML = "<video loop muted onloadeddata='" + onLoad + "'><source src='" + webmURL + "' type='video/webm'><source src='" + mp4URL + "' type='video/mp4'></video>";
                    
                    postElem.dataset.preview = "gifv";
                    previewElem.classList.add("visible");
                }
                
                if ((urlHostname === "imgur.com" || urlHostname === "m.imgur.com") && urlPath.substring(1).length <= 7 && new RegExp("^[a-z0-9]+$", "i").test(urlPath.substring(1)) &&
                   urlPath.indexOf("gallery") === -1 && urlPath.indexOf("blog") === -1) {
                    /* imgur */
                    
                    var id = urlPath.substring(1);
                    var imgURL = "http://i.imgur.com/" + id + ".jpg";
                    
                    previewElem.innerHTML = "<img src='" + imgURL + "' onload='" + onLoad + "'>";
                    
                    postElem.dataset.preview = "imgur";
                    previewElem.classList.add("visible");
                }
                
                if (urlHostname === "gyazo.com" && urlPath.length === 33) {
                    /* gyazo */

                    var id = urlPath.substring(1);
                    var imgURL = "http://i.gyazo.com/" + id + ".png";
                    
                    previewElem.innerHTML = "<img src='" + imgURL + "' onload='" + onLoad + "'>";
                    
                    postElem.dataset.preview = "gyazo";
                    previewElem.classList.add("visible");
                }
                
                if (urlHostname === "xkcd.com" && new RegExp("^[0-9]+$", "gi").test(urlPath.replace(/\//gi, ""))) {
                    /* xkcd */
                    var number = urlPath.replace(/\//gi, "");
                    
                    jsonp("http://dynamic.xkcd.com/api-0/jsonp/comic/" + number, function(r){
                        var imgURL = r.img;

                        previewElem.innerHTML = "<img src='" + imgURL + "' onload='" + onLoad + "'>";

                        previewElem.classList.add("visible");
                    });
                    
                    postElem.dataset.preview = "xkcd";
                }
                
                if ((new RegExp("(\\.gif|\\.jpg|\\.jpeg|\\.webp|\\.png|\\.tiff)$", "gi")).test(urlPath.substring(1))) {
                    /* image */
                    
                    previewElem.innerHTML = "<img src='" + postURL + "' onload='" + onLoad + "'>";
                    
                    postElem.dataset.preview = "image";
                    previewElem.classList.add("visible");
                }
                
                if (post.data.is_self && post.data.selftext_html) {
                    /* self */
                    
                    previewElem.innerHTML = "<div class='selftext-container'>" + entity2unicode(post.data.selftext_html) + "</div>";
                    
                    postElem.dataset.preview = "self";
                    previewElem.classList.add("visible");
                    
                    setTimeout(function(){
                        if (previewElem.querySelector(".md").offsetHeight > previewElem.querySelector(".selftext-container").offsetHeight) {
                            postElem.querySelector(".selftext-container").classList.add("overflow");
                        }
                    });
                }
                
                if (postElem.dataset.preview && postElem.dataset.preview !== "youtube") {
                    previewElem.addEventListener("click", function(){
                        expandPost(this.parentElement);
                    });
                }
                
                postElem.addEventListener("click", function(e){
                    var children = [].slice.call(this.children).filter(function(child){return !child.classList.contains("close-post")});
                    var toElem = e.toElement;
                    if (toElem === this || children.indexOf(toElem) !== -1) expandPost(this);
                });

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
            streamElem.classList.remove("loading");
        } else {
            errorFunc();
        }
    });
    
    streamElem.classList.add("loading");
}

function makeCommentElem(info) {
    var commentElem = document.createElement("div");
    
    var body = info.body_html;
    var author = info.author;
    var op = info.op;
    var fullname = "t1_" + info.id;

    var hrTime = new HRTime(new Date(info.created_utc * 1000));
    var timeString = hrTime.time + " " + hrTime.unit + ((Math.abs(hrTime.time) !== 1) ? "s" : "");
    var likes = info.likes;
    var score = (info.score_hidden ? "[score hidden]" : info.score + " points");
    
    commentElem.innerHTML = "<div class='comment-body-container'>\
<div class='comment-body'>" + entity2unicode(body) + "</div>\
<div class='comment-info'>\
<a class='comment-info-author " + (author == op ? "op" : "") + "' href='http://www.reddit.com/u/" + author + "'>" + author + "</a>\
<button class='vote up'></button>\
<button class='vote down'></button>\
<span class='comment-score'>" + score + "</span>\
<span>" + timeString + "</span>\
<span class='comment-reply-button'>reply</span>\
</div>\
</div>\
<div class='comment-compose-container' data-fullname='" + fullname + "'>\
<textarea class='comment-compose' placeholder='Write a reply'></textarea><button class='comment-submit'></button>\
</div>";
    
    commentElem.dataset.fullname = fullname;
    
    var upvoteBtn = commentElem.querySelector(".vote.up");
    var downvoteBtn = commentElem.querySelector(".vote.down");
    var replyBtn = commentElem.querySelector(".comment-reply-button");
    var commentBtn = commentElem.querySelector(".comment-submit");

    upvoteBtn.addEventListener("click", commentVoteListener);
    downvoteBtn.addEventListener("click", commentVoteListener);

    if (likes === true) upvoteBtn.classList.add("yes");
    if (likes === false) downvoteBtn.classList.add("yes");

    commentBtn.addEventListener("click", commentListener);

    replyBtn.addEventListener("click", function(){
        commentElem.querySelector(".comment-compose-container").classList.toggle("visible");
    });
    
    return commentElem;
}

function displayComments(node, elem, topLevel) {
    var comments = [];
    if (topLevel) {
        comments = node.data.children;
    } else if (node.kind === "t1" && node.data.replies.data && (node.data.replies.data.children.length !== 0)) {
        comments = node.data.replies.data.children;
    }
    
    var expandedPostElem = document.querySelector("#stream .post.expanded");
    var op = expandedPostElem.querySelector(".post-info-author").textContent;

    comments.forEach(function(comment){
        var data = comment.data;
        
        var commentElem;
        
        if (comment.kind === "t1") {
            commentElem = makeCommentElem({
                body_html: data.body_html,
                author: data.author,
                id: data.id,
                created_utc: data.created_utc,
                likes: data.likes,
                score_hidden: data.scrore_hidden,
                score: data.score,
                op: op
            });

            displayComments(comment, commentElem);
        } else if (comment.kind === "more") {
            commentElem = document.createElement("div");
            
            var parentId = comment.data.id;
            
            commentElem.innerHTML = "<a>continue this thread...</a>";
            
            commentElem.dataset.parentId = parentId;
            commentElem.dataset.subreddit = expandedPostElem.querySelector(".post-info-subreddit").textContent;
            commentElem.dataset.linkId = expandedPostElem.dataset.fullname;
            
            commentElem.addEventListener("click", function(){
                var subreddit = this.dataset.subreddit;
                var fullname = this.dataset.linkId;
                var parentId = this.dataset.parentId;
                
                var that = this;
                
                reddit("r/" + subreddit + "/comments/" + fullname.substring(fullname.indexOf("_") + 1) + ".json", {
                    comment: parentId
                }, function(r){
                    r = JSON.parse(r);
                    displayComments(r[1], that.parentElement, true);
                    
                    that.classList.remove("loading");
                    that.style.display = "none";
                    
                    layoutMasonry();
                });
                
                this.classList.add("loading");
            });
        }
        
        commentElem.classList.add("comment-container");
        elem.appendChild(commentElem);
    });
}

function expandPost(elem) {
    var subreddit = elem.querySelector(".post-info-subreddit").textContent;
    var commentsElem = elem.querySelector(".comments-container");
    var fullname = elem.dataset.fullname;
    
    if (commentsElem.dataset.loaded !== "true") {
        reddit("r/" + subreddit + "/comments/" + fullname.substring(fullname.indexOf("_") + 1) + ".json", {
            limit: 50
        }, function(r){
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
    var endpoint = "r/" + encodeURIComponent(subName) + "/about.json";
    
    subInfoElem.classList.add("loading");
    
    reddit(endpoint, {}, function(r){
        r = JSON.parse(r);
        var data = r.data;
        
        var title = data.title;
        var displayName = data.display_name;
        
        subInfoElem.dataset.fullname = r.kind + "_" + data.id;
        subInfoElem.querySelector("h2").innerHTML = title;
        
        document.title = title + " (/r/" + displayName + ") - " + initialTitle;
        
        var subscribeBtn = subInfoElem.querySelector("#subscribe-btn");
        if (data.user_is_subscriber === true) {
            document.querySelector("#subreddits").classList.remove("fixed-subreddit-info");
            subscribeBtn.classList.add("subscribed");
        } else {
            document.querySelector("#subreddits").classList.add("fixed-subreddit-info");
            subscribeBtn.classList.remove("subscribed");
        }
        
        subscribeBtn.addEventListener("click", function(){
            var endpoint = "api/subscribe";
            
            var action = "sub";
            if (this.classList.contains("subscribed")) action = "unsub";
            
            var that = this;
            
            reddit(endpoint, {
                action: action,
                sr: subInfoElem.dataset.fullname
            }, function(r){
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
    reddit("subreddits/mine/subscriber", {
        limit: 100
    }, function(r){
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
            subsListItem.dataset.subreddit = sub.data.display_name.toLowerCase();
            subsListItem.textContent = sub.data.display_name;
            
            subsListElem.appendChild(subsListItem);
            
            var datalistItem = document.createElement("option");
            datalistItem.textContent = sub.data.display_name;
            subsDatalist.appendChild(datalistItem);
        });
        
        [].slice.call(subsListElem.querySelectorAll("[data-subreddit]")).forEach(function(subsListItem){
            subsListItem.addEventListener("click", function(){
                window.location.hash = "#!/r/" + this.dataset.subreddit;
            });
        });
        
        var alreadySelectedElem = document.querySelector("[data-subreddit='" + sub + "']");
        if (alreadySelectedElem) alreadySelectedElem.classList.add("current");
        
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
    
    [].slice.call(subsListElem.querySelectorAll("[data-subreddit]")).forEach(function(subsListItem){
        subsListItem.classList.remove("current");
    });
    
    var currentSubListItem = subsListElem.querySelector("[data-subreddit='" + sub.toLowerCase() + "']");
    var subsListContainer = subsListElem.parentElement;
    if (currentSubListItem) {
        currentSubListItem.classList.add("current");
        if (currentSubListItem.offsetLeft < subsListContainer.scrollLeft || currentSubListItem.offsetLeft > subsListContainer.scrollLeft + subsListContainer.offsetWidth) {
            subsListElem.parentElement.scrollLeft = currentSubListItem.offsetLeft - 100;
        }
    }
    
    if (sub === FRONT_PAGE || sub.toLowerCase() === "all") {
        document.querySelector("#subreddits").classList.remove("fixed-subreddit-info");
    }
    
    document.title = initialTitle;
    document.body.classList.remove("scroll-locked");
    window.scrollTo(0, 0);
    layoutMasonry();
}

var postVoteListener = function(e){
    e.preventDefault();
    e.stopPropagation();

    var dir;
    var cList = this.classList;
    var scoreElem = this.parentElement.querySelector(".post-score");
    
    console.log(this, this.parentElement);

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

    reddit("api/vote", {
        dir: dir,
        id: this.parentElement.parentElement.dataset.fullname
    }, function(r){
        console.log(r);
    }, true);

    this.classList.toggle("yes");
}

var commentVoteListener = function(e){
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

        reddit("api/vote", {
            dir: dir,
            id: this.parentElement.parentElement.parentElement.dataset.fullname
        }, function(r){
            console.log(r);
        }, true);

        this.classList.toggle("yes");
    };

function commentListener(){
    var fullname = this.parentElement.dataset.fullname;

    var that = this;
    var textarea = this.parentElement.querySelector(".comment-compose");
    var commentText = textarea.value.split("\n").join("\n\n");

    if (commentText.length > 0) {
        reddit("api/comment", {
            api_type: "json",
            text: commentText,
            thing_id: fullname
        }, function(r){
            r = JSON.parse(r);
            console.log(r);
            var comment = r.json.data.things[0];
            var data = comment.data;
            
            textarea.value = "";
            textarea.classList.remove("loading");
            that.parentElement.classList.remove("visible");
            
            var expandedPostElem = document.querySelector("#stream .post.expanded");
            
            var commentElem = makeCommentElem({
                body_html: data.body_html,
                op: expandedPostElem.querySelector(".post-info-author").textContent,
                author: data.author,
                id: data.id,
                created_utc: data.created_utc,
                likes: data.likes,
                score_hidden: data.score_hidden,
                score: data.score
            });
            commentElem.classList.add("comment-container");
            
            var parentElem = document.querySelector(".comment-container[data-fullname='" + comment.data.parent_id + "']");
            if (parentElem) { // it's a reply
                parentElem.insertAfter(commentElem, parentElem.querySelector(".comment-body-container"));
            } else { // it's a top level comment
                var commentsContainerElem = expandedPostElem.querySelector(".comments-container");
                commentsContainerElem.insertBefore(commentElem, expandedPostElem.querySelector(".comment-container"));
            }
        }, true);

        textarea.classList.add("loading");
    }
}

function toggleSidebar(dir){
    var action = "toggle";
    if (dir === 1) action = "add";
    if (dir === -1) action = "remove";
    
    sidebarElem.classList[action]("opened");
    document.body.classList[action]("scroll-locked");
    navBurgerBtn.classList[action]("active");
    [].slice.call(document.querySelectorAll(".content")).forEach(function(contentElem){
        contentElem.classList[action]("faded");
    });
}

navBurgerBtn.addEventListener("click", function(){
    toggleSidebar();
});

gotoSubInput.addEventListener("focus", function(){
    this.select();
});

gotoSubInput.addEventListener("keydown", function(e){
    if (e.which === 13) {
        if (this.value) {
            window.location.hash = "#!/r/" + this.value.toLowerCase();
            this.blur();
        }
    }
});

refreshBtns.addEventListener("click", function(){
    changeSubreddit(sub);
});

gotoSubmitBtn.addEventListener("click", function(){
    window.location.hash = "#!/submit";
});

/* submit section */
function initSubmitSection(){
    var captchaImgElem = document.querySelector("#captcha-img");
    captchaImgElem.classList.add("loading");
    
    /* request captcha iden */
    reddit("api/new_captcha", {
        api_type: "json"
    }, function(r){
        r = JSON.parse(r);
        var iden = r.json.data.iden;
        
        var captchaImgURL = "http://www.reddit.com/captcha/" + iden;
        
        captchaImgElem.src = captchaImgURL;
        captchaImgElem.classList.remove("loading");
        
        /* add listeners */
        var submitFormElem = document.querySelector("#submit-form");
        
        var submitTypeSelect = submitFormElem.querySelector("#submit-type");
        
        var titleInput = submitFormElem.querySelector("[name='title']");
        var textInput = submitFormElem.querySelector("[name='text']");
        var urlInput = submitFormElem.querySelector("[name='url']");
        var captchaInput = submitFormElem.querySelector("[name='captcha']");
        var subredditInput = submitFormElem.querySelector("[name='sr']");
        
        var textLabel = submitFormElem.querySelector("#text-label");
        var urlLabel = submitFormElem.querySelector("#url-label");
        
        var submitBtn = submitFormElem.querySelector("#submit-btn");
        
        titleInput.value = "";
        textInput.value = "";
        urlInput.value = "";
        captchaInput.value = "";
        
        var submitType = submitTypeSelect.value;
        
        submitTypeSelect.addEventListener("change", function(){
            submitType = submitTypeSelect.value;
            
            if (submitType === "self") {
                textInput.setAttribute("required", "true");
                urlInput.removeAttribute("required");
                
                textLabel.classList.remove("invisible");
                urlLabel.classList.add("invisible");
            } else if (submitType === "link") {
                urlInput.setAttribute("required", "true");
                textInput.removeAttribute("required");
                
                urlLabel.classList.remove("invisible");
                textLabel.classList.add("invisible");
            }
        });
        
        submitBtn.addEventListener("click", function(){
            var inputElems = [].slice.call(submitFormElem.querySelectorAll("input, textarea"));
            var valid = true;
            valid = inputElems.every(function(inputElem){
                return (!inputElem.checkValidity || inputElem.checkValidity());
            });
            
            var subName = subredditInput.value;
            
            if (valid === true) {
                var params = {
                    api_type: "json",
                    extension: "json",
                    captcha: captchaInput.value,
                    iden: iden,
                    kind: submitType,
                    resubmit: true,
                    sendreplies: true,
                    sr: subName,
                    text: textInput.value,
                    url: urlInput.value,
                    then: "comments",
                    title: titleInput.value
                };
                
                reddit("api/submit", params, function(r){
                    r = JSON.parse(r);
                    
                    if (r.json.errors.length === 0) {
                        window.location.hash = "#!/r/" + subName;
                        initSubmitSection();
                    } else {
                        alert(r.json.errors);
                    }
                }, true);
            } else {
                alert("Please check that you filled every text box.");
            }
        });
    }, true);
}

if (!readCookie("access_token")) {
    window.location = "/";
}

/* auto play/pause gfycat and gifv */
setInterval(function(){
    var eligVidElems = [].slice.call(document.querySelectorAll("[data-preview='gifv'] .preview video, [data-preview='gfycat'] .preview video"));
    
    eligVidElems.forEach(function(vidElem){
        var topY = vidElem.offsetTop + vidElem.parentElement.parentElement.offsetTop + 100;
        var bottomY = vidElem.offsetTop + vidElem.offsetHeight + vidElem.parentElement.parentElement.offsetTop + 100;
        if (bottomY >= document.body.scrollTop && topY <= document.body.scrollTop + window.innerHeight || vidElem.parentElement.parentElement.classList.contains("expanded")) {
            vidElem.play();
        } else if (!vidElem.paused) {
            vidElem.pause();
        }
    });
}, 100);

var alreadyRequestedNewAccessToken = false;

setInterval(function(){
    if (!readCookie("access_token")) {
        alert("Your session has expired. Please sign in again.");
        window.location = "/";
    }
    
    /* check if we need to refresh the access token */
    var expiryDate = new Date(Number(readCookie("authdate")) + ONE_HOUR);
    var nowDate = new Date();
    var delta = expiryDate - nowDate;
    
    if (delta < TEN_MINUTES && !alreadyRequestedNewAccessToken) {
        xhr("/py/refresh_auth?refresh_token=" + readCookie("refresh_token"), function(r){
            console.log(r);
        });
        
        alreadyRequestedNewAccessToken = true;
        setTimeout(function(){
            alreadyRequestedNewAccessToken = false;
        }, TEN_MINUTES);
    }
}, 1000);

/* dropdown stuff */
(function(){
    var dropdownElems = [].slice.call(document.querySelectorAll(".dropdown"));
    var triggerElems = [].slice.call(document.querySelectorAll("[data-dropdown]"));
    
    triggerElems.forEach(function(triggerElem){
        triggerElem.addEventListener("click", function(){
            var targetElem = document.querySelectorAll("#" + this.dataset.dropdown)[0];
            var clientRect = this.getClientRects()[0];
            
            targetElem.style.top = clientRect.top/* + clientRect.height*/ + "px";
            targetElem.style.right = (window.innerWidth - clientRect.left - clientRect.width) + "px";
            targetElem.classList.add("visible");
        });
        
        window.addEventListener("click", function(e){
            var clickedElem = e.toElement;
            var trigElem = triggerElem;
            var triggerChildren = [].slice.call(trigElem.children);
            var dropdownElem = document.querySelectorAll("#" + trigElem.dataset.dropdown)[0];
            var dropdownChildren = [].slice.call(dropdownElem.children);
            
            if (clickedElem !== trigElem && clickedElem !== dropdownElem && triggerChildren.indexOf(clickedElem) === -1 && dropdownChildren.indexOf(clickedElem) === -1) {
                dropdownElem.classList.remove("visible");
            }
        });
    });
})();

/* hashbang navigation */
var changeSection = function(sectionName){
    var targetSection = document.querySelector("#" + sectionName);
    var sections = document.querySelectorAll(".content");
    
    var targetAnchor = document.querySelector("aside [data-section='" + sectionName + "']");
    var sectionAnchors = document.querySelectorAll("aside [data-section]");
    
    [].slice.call(sections).forEach(function(sectionElem){
        sectionElem.classList.remove("visible");
    });
    targetSection.classList.add("visible");
    
    [].slice.call(sectionAnchors).forEach(function(sectionAnchor){
        sectionAnchor.classList.remove("current");
    });
    targetAnchor.classList.add("current");
};

var handleHash = function(){
    var hashPath = window.location.hash.substring(3).split("/");
    
    if (hashPath[0] === "r" || window.location.hash === "") {
        var subName = hashPath[1];
        if (!subName) subName = FRONT_PAGE;
        
        changeSection("subreddits");
        changeSubreddit(subName);
        
        if (hashPath[1] === FRONT_PAGE) {
            history.pushState(null, initialTitle, window.location.pathname);
        }
    } else if (hashPath[0] === "submit") {
        changeSection("submit");
        
        if (sub !== FRONT_PAGE && sub !== "all") {
            document.querySelector(".submit-container [name='sr']").value = sub;
        }
    } else {
        changeSection("subreddits");
        changeSubreddit(FRONT_PAGE);
    }
    
    toggleSidebar(-1);
};

window.addEventListener("hashchange", handleHash);

window.addEventListener("resize", layoutMasonry);

getUserSubreddits();
handleHash();
initSubmitSection();

console.log("%cReddit Wall by z-------------\n", "font-size: 2em; font-family: 'Source Sans Pro', sans-serif", "https://github.com/z-------------/reddit-wall\n\n");