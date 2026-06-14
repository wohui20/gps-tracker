const http = require("http");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const ONENET_HOST = "iot-api.heclouds.com";
const PRODUCT_ID = "5B9YF70AHU";
const DEVICE_NAME = "862323084544140";
const ACCESS_KEY = "Wfenu0GzYUv/PXvHv3Fdf98TT5fn4cXPLVP787NbSXM=";

function generateToken() {
  var et = Math.floor(Date.now() / 1000) + 3600;
  var version = "2018-10-31";
  var method = "sha256";
  var resource = "products/" + PRODUCT_ID;
  var stringToSign = et + "\n" + method + "\n" + resource + "\n" + version;
  var key = Buffer.from(ACCESS_KEY, "base64");
  var sign = crypto.createHmac("sha256", key).update(stringToSign).digest("base64");
  return "version=" + version + "&res=" + encodeURIComponent(resource) + "&et=" + et + "&method=" + method + "&sign=" + encodeURIComponent(sign);
}

function fetchOneNet() {
  return new Promise(function (resolve, reject) {
    var https = require("https");
    var token = generateToken();
    var path = "/thingmodel/query-device-property?product_id=" + PRODUCT_ID + "&device_name=" + DEVICE_NAME;
    var req = https.request({ hostname: ONENET_HOST, port: 443, path: path, method: "GET", headers: { "authorization": token } }, function (res) {
      var body = "";
      res.on("data", function (c) { body += c; });
      res.on("end", function () { resolve(body); });
    });
    req.on("error", reject);
    req.setTimeout(10000, function () { req.destroy(); reject(new Error("timeout")); });
    req.end();
  });
}

// HTML 椤甸潰
var HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#3388ff">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="/manifest.json">
<link rel="icon" href="/icons/icon.svg">
<title>GPS 杩借釜</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:"Microsoft YaHei",sans-serif;}
#container{width:100vw;height:100vh;position:relative;}
#control-panel{position:absolute;top:20px;left:20px;z-index:999;background:rgba(255,255,255,0.95);padding:16px 20px;border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,0.15);min-width:280px;max-height:90vh;overflow-y:auto;}
#control-panel h3{margin-bottom:12px;color:#333;}
.btn-group{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;}
.btn{flex:1;padding:8px 0;border:none;border-radius:6px;font-size:14px;cursor:pointer;text-align:center;min-width:70px;}
.btn:hover{opacity:0.85;}
.btn-primary{background:#3388ff;color:white;}
.btn-success{background:#00c853;color:white;}
.btn-danger{background:#ff5252;color:white;}
.btn-warning{background:#ff9100;color:white;}
#status{margin-top:10px;font-size:12px;color:#888;background:#f5f5f5;padding:8px;border-radius:4px;}
#debug-log{font-size:11px;color:#666;margin-top:8px;background:#fafafa;padding:6px 8px;border-radius:4px;max-height:120px;overflow-y:auto;display:none;white-space:pre-wrap;word-break:break-all;}
</style>
</head>
<body>
<div id="container">
<div id="control-panel">
<h3>GPS 杩借釜</h3>
<div class="btn-group">
<button class="btn btn-primary" id="btnStart">寮€濮嬭拷韪?/button>
<button class="btn btn-danger" id="btnStop" disabled>鍋滄</button>
</div>
<div class="btn-group">
<button class="btn btn-warning" id="btnClear">娓呴櫎杞ㄨ抗</button>
<button class="btn btn-success" id="btnCenter">灞呬腑</button>
<button class="btn btn-primary" id="btnTest">娴嬭瘯杩炴帴</button>
</div>
<div id="debug-log"></div>
<div id="status">鐐瑰嚮"娴嬭瘯杩炴帴"楠岃瘉</div>
</div>
</div>
<script>
var s=document.createElement("script");
s.src="https://webapi.amap.com/maps?v=2.0&key=2718dd20ebef406b2fe3474627cc1780&plugin=AMap.ToolBar,AMap.Scale";
s.onload=function(){setTimeout(initMap,200);};
document.head.appendChild(s);
var map,trackPoints=[],trackLine=null,markers=[],isTracking=false,lastKey="";
function initMap(){if(typeof AMap==="undefined"){setTimeout(initMap,500);return;}map=new AMap.Map("container",{zoom:15,center:[116.397428,39.90923],viewMode:"2D"});map.addControl(new AMap.ToolBar());map.addControl(new AMap.Scale());}
function $(id){return document.getElementById(id);}
function setStatus(m){$("status").textContent=m;}
function log(m){var el=$("debug-log");el.style.display="block";el.textContent+=new Date().toLocaleTimeString()+" > "+m+"\\n";el.scrollTop=el.scrollHeight;}
function callGPS(){return fetch("/api/gps").then(function(r){return r.json();});}
function testConnection(){$("debug-log").textContent="";setStatus("姝ｅ湪娴嬭瘯...");callGPS().then(function(d){log(JSON.stringify(d));if(d.code===0){setStatus("杩炴帴鎴愬姛!");}else{setStatus("閿欒: "+(d.msg||d.error||"鏈煡"));}}).catch(function(e){log(e.message);setStatus("澶辫触: "+e.message);});}
function fetchGPS(){return callGPS().then(function(d){if(!d||d.code!==0||!d.data)return null;var lat,lon,data=d.data;if(Array.isArray(data)){data.forEach(function(i){if(i.identifier==="latitude")lat=parseFloat(i.value);if(i.identifier==="longitude")lon=parseFloat(i.value);});}else{var p=data.properties||data;if(p.longitude!==undefined){lon=typeof p.longitude==="object"?p.longitude.value:p.longitude;lat=typeof p.latitude==="object"?p.latitude.value:p.latitude;}}if(isNaN(lat)||isNaN(lon))return null;return{lat:lat,lon:lon};}).catch(function(){return null;});}
function addPoint(lat,lon){var ll=[lon,lat];var mk=new AMap.Marker({position:ll,map:map});markers.push(mk);trackPoints.push(ll);if(trackLine)map.remove(trackLine);if(trackPoints.length>=2){trackLine=new AMap.Polyline({path:trackPoints,strokeColor:"#3388ff",strokeWeight:4,strokeOpacity:0.8,map:map});}map.setCenter(ll);}
function clearAll(){markers.forEach(function(m){map.remove(m);});if(trackLine)map.remove(trackLine);markers=[];trackLine=null;trackPoints=[];lastKey="";setStatus("宸叉竻闄?);}
function centerMap(){if(trackPoints.length>0)map.setCenter(trackPoints[trackPoints.length-1]);}
function doFetch(){if(!isTracking)return;fetchGPS().then(function(r){if(r){var k=r.lat.toFixed(6)+","+r.lon.toFixed(6);if(k!==lastKey){lastKey=k;addPoint(r.lat,r.lon);setStatus(k+" | "+trackPoints.length+"鐐?);}}if(isTracking)setTimeout(doFetch,3000);});}
function startTracking(){isTracking=true;$("btnStart").disabled=true;$("btnStop").disabled=false;setStatus("杩借釜涓?..");doFetch();}
function stopTracking(){isTracking=false;$("btnStart").disabled=false;$("btnStop").disabled=true;setStatus("宸插仠姝紝鍏?+trackPoints.length+"鐐?);}
window.onload=function(){$("btnStart").onclick=startTracking;$("btnStop").onclick=stopTracking;$("btnClear").onclick=clearAll;$("btnCenter").onclick=centerMap;$("btnTest").onclick=testConnection;};
</script>
</body>
</html>`;

var MANIFEST = JSON.stringify({name:"GPS 杩借釜",short_name:"GPS",start_url:"/",display:"standalone",background_color:"#ffffff",theme_color:"#3388ff",icons:[{src:"/icons/icon.svg",sizes:"any",type:"image/svg+xml"}]});
var ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="80" fill="#3388ff"/><circle cx="256" cy="220" r="60" fill="none" stroke="white" stroke-width="24"/><path d="M256 280 L256 400" stroke="white" stroke-width="24" stroke-linecap="round"/><circle cx="256" cy="220" r="16" fill="white"/></svg>';

// 鍚姩 HTTP 鏈嶅姟
var server = http.createServer(function (req, res) {
  var path = req.url.split("?")[0];

  if (path === "/api/gps") {
    fetchOneNet().then(function (body) {
      res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      res.end(body);
    }).catch(function (e) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    });
    return;
  }

  if (path === "/" || path === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(HTML);
    return;
  }
  if (path === "/manifest.json") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(MANIFEST);
    return;
  }
  if (path === "/icons/icon.svg") {
    res.writeHead(200, { "Content-Type": "image/svg+xml" });
    res.end(ICON);
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

server.listen(PORT, function () {
  console.log("Server running on port " + PORT);
});

