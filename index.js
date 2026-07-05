const http = require("http");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const ONENET_HOST = "iot-api.heclouds.com";
const PRODUCT_ID = "pl9R30J6Bj";
const DEVICE_NAME = "862323084544140";
const ACCESS_KEY = "9yk9SxMHdW/zW6/z0W0HxZOrq3OxY3O3C2t9p/+b9/k=";

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

var HTML = '<!DOCTYPE html>\
<html lang="zh-CN">\
<head>\
<meta charset="UTF-8">\
<meta name="viewport" content="width=device-width, initial-scale=1.0">\
<meta name="theme-color" content="#3388ff">\
<meta name="apple-mobile-web-app-capable" content="yes">\
<link rel="manifest" href="/manifest.json">\
<link rel="icon" href="/icons/icon.svg">\
<title>GPS 追踪</title>\
<style>\
*{margin:0;padding:0;box-sizing:border-box;}\
body{font-family:"Microsoft YaHei",sans-serif;}\
#container{width:100vw;height:100vh;position:relative;}\
#control-panel{position:absolute;top:20px;left:20px;z-index:999;background:rgba(255,255,255,0.95);padding:16px 20px;border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,0.15);min-width:280px;max-height:90vh;overflow-y:auto;}\
#control-panel h3{margin-bottom:12px;color:#333;}\
.btn-group{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;}\
.btn{flex:1;padding:8px 0;border:none;border-radius:6px;font-size:14px;cursor:pointer;text-align:center;min-width:70px;}\
.btn:hover{opacity:0.85;}\
.btn-primary{background:#3388ff;color:white;}\
.btn-success{background:#00c853;color:white;}\
.btn-danger{background:#ff5252;color:white;}\
.btn-warning{background:#ff9100;color:white;}\
#status{margin-top:10px;font-size:12px;color:#888;background:#f5f5f5;padding:8px;border-radius:4px;}\
#debug-log{font-size:11px;color:#666;margin-top:8px;background:#fafafa;padding:6px 8px;border-radius:4px;max-height:120px;overflow-y:auto;display:none;white-space:pre-wrap;word-break:break-all;}\
</style>\
</head>\
<body>\
<div id="container">\
<div id="control-panel">\
<h3>GPS 追踪</h3>\
<div class="btn-group">\
<button class="btn btn-primary" id="btnStart">开始追踪</button>\
<button class="btn btn-danger" id="btnStop" disabled>停止</button>\
</div>\
<div class="btn-group">\
<button class="btn btn-warning" id="btnClear">清除轨迹</button>\
<button class="btn btn-success" id="btnCenter">居中</button>\
<button class="btn btn-primary" id="btnTest">测试连接</button>\
</div>\
<div id="debug-log"></div>\
<div id="status">点击“测试连接”验证</div>\
</div>\
</div>\
<script>\
var s=document.createElement("script");\
s.src="https://webapi.amap.com/maps?v=2.0&key=2718dd20ebef406b2fe3474627cc1780&plugin=AMap.ToolBar,AMap.Scale";\
s.onload=function(){setTimeout(initMap,200);};\
document.head.appendChild(s);\
var PI=3.14159265358979324,EE=0.00669342162296594323,A=6378245.0;\
function outOfChina(lat,lon){return(lon<72.004||lon>137.8347||lat<0.8293||lat>55.8271);}\
function transformLat(x,y){var r=-100+2*x+3*y+0.2*y*y+0.1*x*y+0.2*Math.sqrt(Math.abs(x));r+=(20*Math.sin(6*x*PI)+20*Math.sin(2*x*PI))*2/3;r+=(20*Math.sin(y*PI)+40*Math.sin(y/3*PI))*2/3;r+=(160*Math.sin(y/12*PI)+320*Math.sin(y*PI/30))*2/3;return r;}\
function transformLon(x,y){var r=300+x+2*y+0.1*x*x+0.1*x*y+0.1*Math.sqrt(Math.abs(x));r+=(20*Math.sin(6*x*PI)+20*Math.sin(2*x*PI))*2/3;r+=(20*Math.sin(x*PI)+40*Math.sin(x/3*PI))*2/3;r+=(150*Math.sin(x/12*PI)+300*Math.sin(x/30*PI))*2/3;return r;}\
function wgs84togcj02(lat,lon){if(outOfChina(lat,lon))return{lat:lat,lon:lon};var dLat=transformLat(lon-105,lat-35);var dLon=transformLon(lon-105,lat-35);var radLat=lat/180*PI;var magic=Math.sin(radLat);magic=1-EE*magic*magic;var sqrtMagic=Math.sqrt(magic);dLat=(dLat*180)/((A*(1-EE))/(magic*sqrtMagic)*PI);dLon=(dLon*180)/(A/sqrtMagic*Math.cos(radLat)*PI);return{lat:lat+dLat,lon:lon+dLon};}\
var map,trackPoints=[],trackLine=null,markers=[],isTracking=false,lastKey="";\
function initMap(){if(typeof AMap==="undefined"){setTimeout(initMap,500);return;}map=new AMap.Map("container",{zoom:15,center:[116.397428,39.90923],viewMode:"2D"});map.addControl(new AMap.ToolBar());map.addControl(new AMap.Scale());}\
function $(id){return document.getElementById(id);}\
function setStatus(m){$("status").textContent=m;}\
function log(m){var el=$("debug-log");el.style.display="block";el.textContent+=new Date().toLocaleTimeString()+" > "+m+"\\n";el.scrollTop=el.scrollHeight;}\
function callGPS(){return fetch("/api/gps").then(function(r){return r.json();});}\
function testConnection(){$("debug-log").textContent="";setStatus("\\u6b63\\u5728\\u6d4b\\u8bd5...");callGPS().then(function(d){log(JSON.stringify(d));if(d.code===0){setStatus("\\u8fde\\u63a5\\u6210\\u529f!");}else{setStatus("\\u9519\\u8bef: "+(d.msg||"\\u672a\\u77e5"));}}).catch(function(e){log(e.message);setStatus("\\u5931\\u8d25: "+e.message);});}\
function fetchGPS(){return callGPS().then(function(d){if(!d||d.code!==0||!d.data)return null;var lat,lon,data=d.data;if(Array.isArray(data)){data.forEach(function(i){if(i.identifier==="latitude")lat=parseFloat(i.value);if(i.identifier==="longitude")lon=parseFloat(i.value);});}else{var p=data.properties||data;if(p.longitude!==undefined){lon=typeof p.longitude==="object"?p.longitude.value:p.longitude;lat=typeof p.latitude==="object"?p.latitude.value:p.latitude;}}if(isNaN(lat)||isNaN(lon))return null;return{lat:lat,lon:lon};}).catch(function(){return null;});}\
function addPoint(lat,lon){var gc=wgs84togcj02(lat,lon);var ll=[gc.lon,gc.lat];var mk=new AMap.Marker({position:ll,map:map});markers.push(mk);trackPoints.push(ll);if(trackLine)map.remove(trackLine);if(trackPoints.length>=2){trackLine=new AMap.Polyline({path:trackPoints,strokeColor:"#3388ff",strokeWeight:4,strokeOpacity:0.8,map:map});}map.setCenter(ll);}\
function clearAll(){markers.forEach(function(m){map.remove(m);});if(trackLine)map.remove(trackLine);markers=[];trackLine=null;trackPoints=[];lastKey="";setStatus("\\u5df2\\u6e05\\u9664");}\
function centerMap(){if(trackPoints.length>0)map.setCenter(trackPoints[trackPoints.length-1]);}\
function doFetch(){if(!isTracking)return;fetchGPS().then(function(r){if(r){var k=r.lat.toFixed(6)+","+r.lon.toFixed(6);if(k!==lastKey){lastKey=k;addPoint(r.lat,r.lon);setStatus(k+" | "+trackPoints.length+"\\u70b9");}}if(isTracking)setTimeout(doFetch,3000);});}\
function startTracking(){isTracking=true;$("btnStart").disabled=true;$("btnStop").disabled=false;setStatus("\\u8ffd\\u8e2a\\u4e2d...");doFetch();}\
function stopTracking(){isTracking=false;$("btnStart").disabled=false;$("btnStop").disabled=true;setStatus("\\u5df2\\u505c\\u6b62\\uff0c\\u5171"+trackPoints.length+"\\u70b9");}\
window.onload=function(){$("btnStart").onclick=startTracking;$("btnStop").onclick=stopTracking;$("btnClear").onclick=clearAll;$("btnCenter").onclick=centerMap;$("btnTest").onclick=testConnection;};\
</script>\
</body>\
</html>';

var MANIFEST = '{"name":"GPS \\u8ffd\\u8e2a","short_name":"GPS","start_url":"/","display":"standalone","background_color":"#ffffff","theme_color":"#3388ff","icons":[{"src":"/icons/icon.svg","sizes":"any","type":"image/svg+xml"}]}';
var ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="80" fill="#3388ff"/><circle cx="256" cy="220" r="60" fill="none" stroke="white" stroke-width="24"/><path d="M256 280 L256 400" stroke="white" stroke-width="24" stroke-linecap="round"/><circle cx="256" cy="220" r="16" fill="white"/></svg>';

var server = http.createServer(function (req, res) {
  var pathname = req.url.split("?")[0];

  if (pathname === "/api/gps") {
    fetchOneNet().then(function (body) {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
      res.end(body);
    }).catch(function (e) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    });
    return;
  }
  if (pathname === "/" || pathname === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(HTML);
    return;
  }
  if (pathname === "/manifest.json") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(MANIFEST);
    return;
  }
  if (pathname === "/icons/icon.svg") {
    res.writeHead(200, { "Content-Type": "image/svg+xml" });
    res.end(ICON);
    return;
  }
  res.writeHead(404);
  res.end("Not Found");
});

server.listen(PORT, function () {
  console.log("GPS Tracker running on port " + PORT);
});
