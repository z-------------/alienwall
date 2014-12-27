var xhr = function(url, callback) {
    var oReq = new XMLHttpRequest();
    oReq.onload = function(){
        var response = this.responseText;
        callback(response);
    };
    oReq.open("get", url, true);
    oReq.send();
};

var streamElem = document.querySelector("#stream");

var afterID = null;
var sub = "polandball";

function getMore() {
    var limit = 10;
    var requestURL = "http://www.reddit.com/r/" + encodeURIComponent(sub) + "/hot.json?limit=" + limit.toString();
    
    if (afterID) {
        requestURL += "&after=" + encodeURIComponent(afterID);
    }
    
    console.log(requestURL);
    
    xhr(requestURL, function(r){
        r = JSON.parse(r);
        var posts = r.data.children;
        
        posts.forEach(function(post){
            var postElem = document.createElement("li");
            postElem.textContent = post.data.title;
            streamElem.appendChild(postElem);
        });
        
        var lastPost = posts[posts.length - 1];
        afterID = lastPost.kind + "_" + lastPost.data.id;
    });
}

setInterval(function(){
    var bodyHeight = Math.max(document.body.scrollHeight, document.body.offsetHeight, document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight);
    if (window.scrollY + window.innerHeight >= bodyHeight) {
        getMore()
    }
}, 100);

getMore();