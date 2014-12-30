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

var reddit = function(endpoint, params, token, callback) {
    var paramsStr = "?";
    
    var paramsArray = [];
    var paramsKeys = Object.keys(params);
    paramsKeys.forEach(function(paramsKey){
        paramsArray.push(paramsKey + "=" + params[paramsKey]);
    });
    paramsStr += paramsArray.join("&");
    
    var headers = {};
    if (token) headers.Authorization = "bearer " + token;
    
    xhr(endpoint + paramsStr, callback, headers);
};

var sortInput = document.querySelector("#sort-input");
var timeInput = document.querySelector("#time-input");
var goBtn = document.querySelector("#go-btn");
var streamElem = document.querySelector("#stream");
var subsListElem = document.querySelector("#subreddit-list");

var timeFilter;
var afterID = null;
var sub = subsListElem.querySelectorAll("li")[0].dataset.subreddit;

var allSubs = [];

var scrollLoadInterval;

var errorFunc = function(){
    streamElem.innerHTML = "<p>Couldn't load posts from /r/" + sub + "</p>";
}

function getMore() {
    clearInterval(scrollLoadInterval);
    
    var limit = 50;
    var oat = null;
    
    var endpoint = "http://www.reddit.com/r/" + encodeURIComponent(sub) + "/hot.json";
    if (sub === FRONT_PAGE) {
        endpoint = "https://oauth.reddit.com/hot.json";
        oat = readCookie("oat")
    }
    
    var params = {
        limit: limit
    };
    
    if (afterID) params.after = afterID;
    if (timeFilter) params.t = timeFilter;
    
    reddit(endpoint, params, oat, function(r){
        r = JSON.parse(r);
        
        if (r && r.data.children && r.data.children.length !== 0) {
            var posts = r.data.children;
            posts.forEach(function(post){
                var postElem = document.createElement("a");

                var postElemHtml = "<li><h3>" + post.data.title + "</h3><a href='//www.reddit.com/u/" + post.data.author + "' rel='author'>" + post.data.author + "</a><a href='http://www.reddit.com" + post.data.permalink + "'>" + new Date(post.data.created_utc * 1000).toDateString() + "</a></li>";
                
                postElem.innerHTML = postElemHtml;
                postElem.href = post.data.url;

                streamElem.appendChild(postElem);
            });

            var lastPost = posts[posts.length - 1];
            afterID = lastPost.kind + "_" + lastPost.data.id;

            scrollLoadInterval = setInterval(function(){
                var bodyHeight = Math.max(document.body.scrollHeight, document.body.offsetHeight, document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight);
                if (window.scrollY + window.innerHeight >= bodyHeight) {
                    getMore();
                }
            }, 100);
            
            var container = document.querySelector("#stream");
            var msnry = new Masonry(container, {
                columnWidth: 400,
                itemSelector: "li",
                gutter: 40,
                isFitWidth: true
            });
        } else {
            errorFunc();
        }
    });
}

function prepareGetMore() {
    timeFilter = timeInput.value;
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
    if (oat) {
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
                    changeSubreddit(this);
                });
            });
        });
    } else {
        alert("Your session has expired. Please sign in again.");
        window.location = "/";
    }
}

function changeSubreddit(elem){
    var subName = elem.dataset.subreddit;
    sub = subName;
    prepareGetMore();
    getMore();
    
    [].slice.call(document.querySelectorAll("header #subreddit-list li[data-subreddit]")).forEach(function(subsListItem){
        subsListItem.classList.remove("current");
    });
    var currentSubElem = document.querySelector("header #subreddit-list li[data-subreddit='" + sub + "']");
    currentSubElem.classList.add("current");
}

if (!readCookie("oat")) {
    window.location = "/";
}

getMore();
getUserSubreddits();