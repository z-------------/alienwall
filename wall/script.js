var xhr = function(url, callback, headers) {
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
    
    xhr(endpoint + paramsStr, callback, {
        Authorization: "bearer " + token
    });
};

var subredditInput = document.querySelector("#subreddit-input");
var sortInput = document.querySelector("#sort-input");
var timeInput = document.querySelector("#time-input");
var goBtn = document.querySelector("#go-btn");
var streamElem = document.querySelector("#stream");

var afterID = null;
var sub = "all";

var scrollLoadInterval;

var errorFunc = function(){
    streamElem.innerHTML = "<p>Couldn't load posts from /r/" + sub + "</p>";
}

function getMore(params) {
    var limit = 50;
    var requestURL = "http://www.reddit.com/r/" + encodeURIComponent(sub) + "/" + encodeURIComponent(sortInput.value) + ".json?limit=" + limit.toString() + (params ? params : "");
    
    if (afterID) {
        requestURL += "&after=" + encodeURIComponent(afterID);
    }
    
    clearInterval(scrollLoadInterval);
    
    xhr(requestURL, function(r){
        r = JSON.parse(r);
        
        if (r && r.data.children && r.data.children.length !== 0) {
            var posts = r.data.children;
            posts.forEach(function(post){
                console.log(post);
                
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
        } else {
            errorFunc();
        }
    });
}

function prepareGetMore() {
    sub = subredditInput.value;
    afterID = null;
    streamElem.innerHTML = "";
}

sortInput.addEventListener("change", function(){
    if (this.value === "top" || this.value === "controversial") {
        timeInput.classList.add("visible");
    } else {
        timeInput.classList.remove("visible");
    }
});

goBtn.addEventListener("click", function(){
    var params = "&t=" + timeInput.value;
    
    prepareGetMore();
    getMore(params);
});

/* testing stuff */

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
            console.log(JSON.parse(r));
        });
    }
}