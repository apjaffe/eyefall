

var gameState = new GameState(false);
gameState.init();


// create a renderer
var render = Render.create({
    canvas: document.getElementById("mycanvas"),
    engine: gameState.getEngine(),
});




//render.options.showAngleIndicator = true;
render.options.hasBounds = true;
render.options.wireframes = false;
render.options.background = '#000';
render.options.backgroundImage = '2.jpg';
render.options.backgroundWidth = 1024;
render.options.backgroundHeight = 1024;
render.options.showSleeping = false;
//render.options.showIds = true;



//TODO: There is a problem if you press keys before you have been assigned a player (fixed now?)

//http://stackoverflow.com/questions/1828613/check-if-a-key-is-down
Keys = {
  MAP_KEYS: {
    "37": "37",
    "39": "39",
    "32": "32",
    "38": "32", //up -> space
    "65": "37", //a -> left
    "68": "39", //d -> right
    "87": "32", //w -> space
    "83": "32" //s -> space
  },
  SPECIAL_KEYS: [
    "37", "39", "32"
  ],
  triedFullscreen: false,
  pressed: {
    "37": false,
    "39": false,
    "32": false
  }, 
  touchCount: 0,
  init: function() {
    window.onkeyup = function(e) {Keys.keyEvent(e.keyCode, false);}
    window.onkeydown = function(e) {Keys.keyEvent(e.keyCode, true);
      if(loginManager.isSkinVisible())
      {
        if(document.activeElement.type!=="text")
        {
          if(e.keyCode == 37)
          {
            loginManager.prevSkin();
          }
          else if(e.keyCode == 39)
          {
            loginManager.nextSkin();
          } 
        }
        if(e.keyCode === 13)
        {
          loginManager.triggerRespawn();
        }
      }
    }
    var el = document.body;
    el.addEventListener("mousedown", function(evt){
      Keys.directKeyEvent("32", true);
    });
    el.addEventListener("mouseup", function(evt){
      Keys.directKeyEvent("32", false);
    });
    /*el.addEventListener("mousemove", function(evt){
      var mx = evt.clientX;
      var wid = window.innerWidth;
      var pl = gameState.myPlayer();
      if(pl && pl.alive)
      {
        var bounds = render.bounds;
        var px = pl.composite.position.x;
        var minx = bounds.min.x;
        var maxx = bounds.max.x;
        var threshold = 50;
        if((mx/wid) > (px-minx+threshold)/(maxx-minx))
        {
          Keys.directKeyEvent("37", false);
          Keys.directKeyEvent("39", true);
        }   
        else if((mx/wid) < (px-minx-threshold)/(maxx-minx))
        {
          Keys.directKeyEvent("37", true);
          Keys.directKeyEvent("39", false);
        }  
      }
    });*/
    var mycanvas = document.getElementById("mycanvas");
    mycanvas.addEventListener("touchstart", function(evt){
      evt.preventDefault();
      Keys.touchCount += evt.changedTouches.length;
      Keys.directKeyEvent("32", true);
      
      /*
      if(!Keys.triedFullscreen)
      {
        Keys.triedFullscreen = true;
        var elem = document.getElementById("wrapper"); //getElementsByTagName("canvas")[0]
        if(elem.requestFullscreen){
          elem.requestFullscreen();
        }
        else if(elem.msRequestFullscreen){
          elem.msRequestFullscreen();
        }
        else if(elem.mozRequestFullScreen){
          elem.mozRequestFullScreen();
        }
        else if(elem.webkitRequestFullscreen){
          elem.webkitRequestFullscreen();
        }
        screen.orientation.lock('portrait');
      }*/
    },false);
    mycanvas.addEventListener("touchend", function(evt){
      evt.preventDefault();
      Keys.touchCount -= evt.changedTouches.length;
      if(Keys.touchCount <= 0)
      {
        Keys.directKeyEvent("32", false);
      }
    },false);
    mycanvas.addEventListener("touchcancel", function(evt){
      evt.preventDefault();
      Keys.touchCount -= evt.changedTouches.length;
      if(Keys.touchCount <= 0)
      {
        Keys.directKeyEvent("32", false);
      }
    }, false);
    //http://www.html5rocks.com/en/tutorials/device/orientation/
    if (window.DeviceOrientationEvent) {
      // Listen for the deviceorientation event and handle the raw data
      window.addEventListener('deviceorientation', function(eventData) {
        // gamma is the left-to-right tilt in degrees, where right is positive
        var tiltLR = eventData.gamma;

        // beta is the front-to-back tilt in degrees, where front is positive
        var tiltFB = eventData.beta;

        // alpha is the compass direction the device is facing in degrees
        var dir = eventData.alpha;

        var tilt;
        if(window.innerWidth > window.innerHeight)
        {
          tilt = tiltFB;
        }
        else
        {
          tilt = tiltLR;
        }
        
        // call our orientation event handler
        var TILT_THRESHOLD = 8;
        if(tilt > TILT_THRESHOLD)
        {
          Keys.directKeyEvent("39", true);
          Keys.directKeyEvent("37", false);
        }
        else if(tilt < - TILT_THRESHOLD)
        {
          Keys.directKeyEvent("37", true);
          Keys.directKeyEvent("39", false);
        }
        else
        {
          Keys.directKeyEvent("37", false);
          Keys.directKeyEvent("39", false);
        }
      }, false);
    }
  },
  directKeyEvent: function(keyStr, value){
    if(Keys.pressed[keyStr] !== value)
    {
      Keys.pressed[keyStr] = value;
      if(loginManager.isPlaying() && socket)
      {
        socket.emit("key",gameState.compressKeys(Keys.pressed));
      }
    }
  },
  keyEvent: function(keyCode, value){
    var mapped = Keys.MAP_KEYS[""+keyCode];
    if(mapped)
    {      
      Keys.directKeyEvent(mapped, value);
    }
  }
}
Keys.init();

var spinTime = 0;
function updateRender(inc)
{
  spinTime += inc;
  render.options.spinTime = spinTime;
  var width = Math.round(window.innerWidth*1.0);
  var height = Math.round(window.innerHeight*1.0);
  if(render.canvas.width!=width || render.canvas.height!=height)
  {
    render.options.width = width;
    render.options.height = height;
    Render.setPixelRatio(render, 1.0);  
  }

  var mp = gameState.myPlayer();
  var coins = [];
  if(mp !== null)
  {
    var bounds = gameState.myPlayer().getVisibility(width, height, false);
    render.bounds = bounds;
    coins = gameState.getCoins(bounds);
  }
  else
  {
    render.context.fillStyle = '#000';
    render.context.fillRect(0,0,width,height);
  }   
  var clouds = gameState.getClouds();
  var ranks = gameState.getRanks();
  var nicks = gameState.getNicks();
  var firewall = gameState.getFirewall();
  render.options.midground = [clouds, coins];
  render.options.foreground = [firewall, nicks, ranks];
  return mp !== null;
}

function renderCoins()
{
  var ctx = render.context;
  var pl = gameState.myPlayer();
  if(pl)
  {
    var coinText = pl.getCoins() + " coins";
    var ms = ctx.measureText(coinText);
    ctx.fillStyle = '#000';
    ctx.font="30px Arial";
    ctx.fillText(coinText, 80, 30);
  }
}

function renderSplash(inc)
{
  var ctx = render.context;
  var splash = gameState.getSplash(inc);
  if(splash !== null)
  {
    var x = window.innerWidth / 2;
    var y = window.innerHeight / 2;
    
    ctx.globalAlpha = splash.modalOpacity;
    ctx.fillStyle = '#000';
    ctx.fillRect(0,0,render.options.width, render.options.height);
    
    
    ctx.globalAlpha = splash.opacity;
    
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    
    ctx.font="120px Impact, Charcoal, sans-serif";
    ctx.fillText(splash.splash.title, x, y - 50);
    
    ctx.font="60px Impact, Charcoal, sans-serif";
    ctx.fillText(splash.splash.subtitle, x, y+50);
    
    
    
   
    ctx.globalAlpha = 1;
  }
}

function renderLeaderboard()
{
  var LEADERBOARD_LEFT = 10;
  var LEADERBOARD_RIGHT = 220;

  if(window.innerWidth < LEADERBOARD_RIGHT+320)
    return;
    
  var ctx = render.context;
  var ldb = gameState.getLeaderboard();

  var pl = gameState.myPlayer();
  var myId = pl ? pl.id : null;
  
  var TEXT_HEIGHT = 25;
  var ALPHA = 0.7;
  if(ldb!==null)
  {
    ctx.globalAlpha = ALPHA;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.font="30px Impact, Charcoal, sans-serif";
    ctx.fillText("Leaderboard", LEADERBOARD_LEFT, 30);
    
    ctx.font="20px Impact, Charcoal, sans-serif";
    for(var i = 0; i < ldb.length; i++)
    {
      if(ldb[i][2] == myId)
      {
        ctx.globalAlpha = 1.0;
      }
      else
      {
        ctx.globalAlpha = ALPHA;
      }
    
      //ctx.textAlign = 'left';
      ctx.fillText(ldb[i][0], LEADERBOARD_LEFT, 55+i*TEXT_HEIGHT);
      //ctx.textAlign = 'left';
      ctx.fillText(ldb[i][1], LEADERBOARD_RIGHT, 55+i*TEXT_HEIGHT); 
    }
    ctx.globalAlpha = 1;
  }
}

var lastFill = 0;
var lastCoins = 0;
function renderRank()
{ 
  var ctx = render.context;
  var pl = gameState.myPlayer();
  var RADIUS = 110;
  var LINE_WID = 5;
  var ICON_SIZE = 30;
  var CLOUD_ICON_WID = 20;
  var CLOUD_ICON_HEI = 10;
  var MAX_INCREASE = 0.02;
  var x = window.innerWidth - RADIUS;
  var y = RADIUS;
  if(pl)
  {
    var rd = pl.getRankData();
    var coins = pl.getCoins();
    
    var currentFill;
    var text1 = "";
    var text2 = "Unranked";
    if(rd.next && rd.current)
    {
      currentFill = (coins - rd.current[0]) / (rd.next[0] - rd.current[0]); 
    }
    else if(rd.next)
    {
      currentFill = coins / rd.next[0];
    }
    else
    {
      currentFill = 0;   
    }
    if(rd.next)
    {
      text1 = (rd.next[0] - coins) + " to ";
    }
    else
    {
      text1 = coins;
    }
    if(rd.current)
    {
      text2 = rd.current[2];
    }
    if(Math.abs(lastFill-currentFill) < MAX_INCREASE)
    {
      lastFill = currentFill; 
      lastCoins = coins;
    }
    else if(coins < lastCoins)
    {
      lastFill -= MAX_INCREASE;
      if(lastFill < 0)
        lastFill = currentFill;
    }
    else
    {
      lastFill += MAX_INCREASE;
      if(lastFill > 1)
        lastFill = 0;
    }
    


    
    //ctx.setLineDash([1,1]);
    //ctx.strokeStyle = '#000000';
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    //ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = LINE_WID*2;
    ctx.beginPath();
    ctx.arc(x,y,RADIUS-LINE_WID,0,Math.PI*2);
    //ctx.fill();
    ctx.stroke();
    
    //ctx.setLineDash([]);
    ctx.strokeStyle ='#000044';
    ctx.lineWidth = LINE_WID*2;
    ctx.beginPath();
    ctx.arc(x,y,RADIUS-LINE_WID,Math.PI*3/2,Math.PI*3/2+Math.PI*2*lastFill);
    ctx.stroke();
    
    /*ctx.lineWidth = LINE_WID*4;
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    //ctx.moveTo(x,y);
    ctx.arc(x,y,RADIUS-LINE_WID*3,Math.PI*3/2,Math.PI*3/2+Math.PI*2*lastFill);
    //ctx.moveTo(x,y);
    ctx.stroke();*/
    
    ctx.globalAlpha = 0.7;
    
    ctx.fillStyle = '#fff';

    ctx.font="28px Impact, Charcoal, sans-serif";
    ctx.fillText(text2, x, y+27);
    
    ctx.font="20px Impact, Charcoal, sans-serif";
    ctx.textAlign = 'center';
    if(rd.next)
    {    
      var SMALL_ICON_SIZE = 15;
      var wid1 = ctx.measureText(text1).width;
      ctx.fillText(text1, x - SMALL_ICON_SIZE - 1.5, y + 60);
      var textureN = Render.getTexture(render, "ranks/"+rd.next[1]);
      tryDrawImage(ctx,textureN,x + wid1/2 - SMALL_ICON_SIZE + 1.5,y + 65 - SMALL_ICON_SIZE*2,SMALL_ICON_SIZE*2,SMALL_ICON_SIZE*2);
    }
    else
    {
      ctx.fillText(text1, x, y + 60);
    }
    
    if(rd.current)
    {
      var texture = Render.getTexture(render, "ranks/"+rd.current[1]);
      tryDrawImage(ctx,texture,x-ICON_SIZE,y-ICON_SIZE*2-5,ICON_SIZE*2,ICON_SIZE*2);
    }
    var numJumps = pl.getMaxJC();
    for(var i = 0; i < numJumps; i++)
    {
      var cl = Render.getTexture(render, "ranks/cloud-icon.png");
      tryDrawImage(ctx,cl,x+ICON_SIZE+3,y-ICON_SIZE*0.5-i*(CLOUD_ICON_HEI+2),CLOUD_ICON_WID,CLOUD_ICON_HEI);
    }
    
    ctx.globalAlpha = 1;
  }
}

function SocketManager()
{
  var id = null;
  var password = gameState.newId();
  function keepalive()
  {
    if(socket)
    {
      socket.emit("keepalive",{
        "p": password
      });
    }
  }
  this.respawn = function(nickname)
  {
    socket.emit("keepalive",{
      "p": password,
      "nick": nickname,
      "respawn": true,
      "skin": loginManager.getSkin()
    });
  };
  socket.on('connect', function () {
    socket.on('spawn', function(msg){
      gameState.spawnPlayer(msg);
      loginManager.gotoPlay();
    });
    socket.on('update', function(updates){
      var u = fulldecode(updates);
      var updateRes = gameState.applyUpdates(u,true);
      //if(Math.random()<0.01) console.log("other",updates, u); TODO
      if(updateRes)
      {
        //console.log("Race condition averted, sort of!");
        socket.emit("key",gameState.compressKeys(Keys.pressed));
      }
    });
    function fulldecode(u)
    {
      return msgpack.decode(gameState.decodeArray(u));
    }
    socket.on('supdate', function(updates){ //self updates
      var u = fulldecode(updates);
      var updateRes = gameState.applyUpdates(u,false);
      if(updateRes)
      {
        //console.log("Race condition averted, sort of!");
        socket.emit("key",gameState.compressKeys(Keys.pressed));
      }
    });
    socket.on('coins', function(coins){
      var c = fulldecode(coins);
      gameState.applyCoins(c);
    });
    socket.on('coindelta', function(coins){
      gameState.applyCoinDelta(coins);
    });
    socket.on('leaderboard', function(ldb){
      gameState.setLeaderboard(ldb);
    });
    setInterval(function(){
      keepalive();
    },1000);
    socket.on('reconnect_failed', function(){
      alert("Oh no, the connection to the server broke! Please refresh the page.");
    });
  });
}
var socketManager; 

/*
//TODO dead code
function preload()
{
  //pre-load this image
  var cv = document.createElement('canvas');
  var ctx = cv.getContext("2d");
  var preload = Render.getTexture(render, "earth-bigger.png");
  preload.onload = function()
  {
    cv.width = preload.width;
    cv.height = preload.height;
    ctx.drawImage(preload,0,0);
    console.log("preloaded");
  }
}
preload();
*/

function tryDrawImage(ctx, img, x, y, wid, hei)
{
  try
  {
    if(wid && hei)
    {
      ctx.drawImage(img,x,y,wid,hei);
    }
    else
    {
      ctx.drawImage(img,x,y);
    }
  }
  catch(e)
  {
    console.log(e);
    //TODO: Filler image
  }
}

function LoginManager()
{
  var currentState = "login"; //"login" or "play"
  var animationTime = 0;
  var SKINS = gameState.getSkins();
  var currentSkin = 0;
  var SKIN_RADIUS = 50;
  
  var canvas = document.getElementById("preview");
  var ctx = canvas.getContext("2d");
  

  var ROTATION_PERIOD = 1500;
  var CANVAS_WID = 500;
  var CANVAS_HEI = 140;
  var MARGIN = 5;
  var PLANK_WID = 400 * 0.5; 
  var PLANK_HEI = 65 * 0.5;
  var PLANK_SOURCE = "platform4.png"
  var ARROW_HEI = 64;
  var ARROW_WID = 100;
  
  var leftDown = false;
  var rightDown = false;
  
  var that = this;
  
  var dir = 1;
  
  this.nextSkin = function()
  {
    dir = 1;
    currentSkin = (currentSkin + 1) % that.numAccessibleSkins();
  }
  this.prevSkin = function()
  {
    dir = -1;
    if(currentSkin === 0)
    {
      currentSkin = that.numAccessibleSkins() - 1;
    }
    else
    {
      currentSkin-=1;
    }
  }
  
  $(canvas).mouseup(function(e){
    handleUnclick();
  });
  //http://stackoverflow.com/questions/14651306/get-mouse-position-within-div
  $(canvas).mousedown(function(e){
    var x = e.pageX;
    var y = e.pageY;
    handleClick(x,y);
  });
  
  function handleClick(x,y)
  {
    var offset = $(canvas).offset();
    x -= offset.left;
    y -= offset.top;
    if(x > CANVAS_WID/2 + SKIN_RADIUS)
    {
      leftDown = true;
      rightDown = false;
    }
    else if(x < CANVAS_WID/2 - SKIN_RADIUS)
    {
      leftDown = false;
      rightDown = true;
    }
  }
  
  function handleUnclick()
  {
    if(leftDown)
    {
      that.nextSkin();
    }
    else if(rightDown)
    {
      that.prevSkin();
    }
    leftDown = false;
    rightDown = false;
  }
  
  canvas.addEventListener("touchstart", function(evt){
      evt.preventDefault();
      if(evt.changedTouches.length > 0)
      {
        var touch = evt.changedTouches[0];
        handleClick(touch.pageX, touch.pageY);
      }
  });
  canvas.addEventListener("touchend",
  function(evt){
    evt.preventDefault();
    if(evt.changedTouches.length > 0)
    {
      handleUnclick();
    }
  });
  canvas.addEventListener("touchcancel",
  function(evt){
    evt.preventDefault();
    if(evt.changedTouches.length > 0)
    {
      leftDown = false;
      rightDown = false;
    }
  });
  
  $("#fbshare, #twshare").click(function(e){
    Cookies.set('shared','true',{ expires: 36500 });
  });


  var NUM_FREE = 2;
  var NUM_SHARED = 25;
  var PAID_HASH = "d2d91b3e2948b6ef087b19f06cfc3fb8";
  this.numAccessibleSkins = function()
  {
    //coming soon, hopefully!
    //if(md5(Cookies.get('paid')) === PAID_HASH) 
    //{
    //  return SKINS.length;
    //}
    if(Cookies.get('shared') === 'true')
    {
      return NUM_SHARED;
    }
    else
    {
      return NUM_FREE;
    }
  };
  
  this.getSkin = function()
  {
    return SKINS[currentSkin];
  };
  
  function posmod(x,m)
  {
    var t = x % m;
    return t < 0 ? t + m : t;
  }
  
  this.animate = function(inc)
  {
    animationTime += inc * dir;
  
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0,0,CANVAS_WID,CANVAS_HEI);
    ctx.globalCompositeOperation = 'source-over';

    var skin = SKINS[currentSkin];
    var texture = Render.getTexture(render, skin);
    var angle = animationTime / ROTATION_PERIOD * Math.PI * 2;
    ctx.translate(CANVAS_WID/2, SKIN_RADIUS+MARGIN); 
    ctx.rotate(angle);
    tryDrawImage(ctx,texture,-SKIN_RADIUS,-SKIN_RADIUS,SKIN_RADIUS*2,SKIN_RADIUS*2);
    ctx.rotate(-angle);
    ctx.translate(-CANVAS_WID/2, -(SKIN_RADIUS+MARGIN));
    
    var texture2 = Render.getTexture(render, PLANK_SOURCE);
    var offset = SKIN_RADIUS * angle;
    var diff = -posmod(offset, PLANK_WID);
    for(var i = 0; i<4;i++)
    {
      tryDrawImage(ctx,texture2, diff+PLANK_WID*i, SKIN_RADIUS*2+MARGIN, PLANK_WID, PLANK_HEI);
    }
    
    var right = Render.getTexture(render, "right.png");
    var left = Render.getTexture(render, "left.png");
    var leftOffset = leftDown ? 2 : 0;
    var rightOffset = rightDown ? 2 : 0;
    tryDrawImage(ctx,right, CANVAS_WID/2 + SKIN_RADIUS + MARGIN*4, SKIN_RADIUS+MARGIN-ARROW_HEI/2 + leftOffset);
    tryDrawImage(ctx,left, CANVAS_WID/2 - SKIN_RADIUS - MARGIN*4 - ARROW_WID, SKIN_RADIUS+MARGIN-ARROW_HEI/2 + rightOffset);
  };

  this.isPlaying = function()
  {
    return currentState === "play";
  };
  this.isSkinVisible = function()
  {
    return currentState === "login";
  };
  
  this.triggerRespawn=function()
  {
    if(socketManager)
    {
      socketManager.respawn(document.getElementById("nickname").value);
    }
    else
    {
      setTimeout(function(){
        that.triggerRespawn();
      },200);
    }
  }
  
  $("#playbutton").click(function(){
    that.triggerRespawn();
  });
  
  this.gotoLogin=function()
  {
    render.canvas.style.display = "none";
    document.getElementById("login").style.display = "block";
    document.getElementById("nickname").focus();
    currentState = "login";
  }
  this.gotoPlay=function()
  {
    render.canvas.style.display = "block";
    document.getElementById("login").style.display = "none";
    currentState = "play";
  }
}



var loginManager = new LoginManager();
loginManager.gotoLogin();


/**
 START BOT
 **/
var botNodes = null;
var NODE_THRESHOLD_X = 500;
var NODE_THRESHOLD_Y = 500;
function closestNode(nodes, pos)
{
  var npos = Vector.neg(pos);
  var bestNode = null;
  var bestDist = null;
  for(var i = 0; i < nodes.length; i++)
  {
    var dlt = Vector.add(nodes[i].pos,npos);
    var dlty = Math.abs(dlt.y);
    var dltx = Math.abs(dlt.x);
    if((bestDist === null || dlty < bestDist) && dltx < NODE_THRESHOLD_X)
    {
      bestNode = nodes[i];
      bestDist = dlty;
    }
  }
  return bestNode;
}
var botActive = true;
var currentNode = null;
var currentSpot = null;
var currentIdx = 0;
var currentDist = 0;
function doBot(nodes)
{
  var pl = gameState.myPlayer();
  if(!pl) return;
  
  var TINY_VEL = 0.2;
  var SMALL_VEL = 0.7;
  var MINI_VEL = 0.1;
  var DELTA = 0.1;
  var SMALL_DIST = 10;
  
  if(currentNode === null)
  {
    if(pl.composite.speed < 0.4)
    {
      currentNode = closestNode(nodes, pl.composite.position);
      currentSpot = -1;
      currentDist = 0;
      currentIdx = Math.floor(Math.random() * currentNode.seqs.length);
    }
    else
    {
      if(Math.abs(pl.composite.velocity.x) > TINY_VEL)
      {
        pressKeys({
          "37":pl.composite.velocity.x > 0,
          "39":pl.composite.velocity.x < 0,
          "32":false
        });
      }
      return;
    }
  }
  
  if(currentNode.pos.y < pl.composite.position.y - NODE_THRESHOLD_Y)
  {
    currentNode = null; //fell
  }
  
  //console.log(currentSpot, currentNode, currentIdx);
  if(currentSpot < 0 && currentNode !== null)
  {
    var pos = currentNode.posl[currentIdx];
    var wantRight = pl.composite.position.x < pos.x - SMALL_DIST;
    var wantLeft = pl.composite.position.x > pos.x + SMALL_DIST;
    var targetVelocity;
    if(wantLeft)
    {
      targetVelocity = -SMALL_VEL;
    }
    else if(wantRight)
    {
      targetVelocity = SMALL_VEL;
    }
    else
    {
      targetVelocity = 0;
    }
    if(!wantRight && !wantLeft)
    {
      if(Math.abs(pl.composite.velocity.x) > TINY_VEL)
      {
        pressKeys({
          "37":pl.composite.velocity.x > 0,
          "39":pl.composite.velocity.x < 0,
          "32":false
        });
      }
      else
      {
        currentSpot = 0;
      }
    }
    else if(pl.composite.velocity.x < targetVelocity - DELTA)
    {
      pressKeys({
        "37":false,
        "39":true,
        "32":false
      });
    }
    else if(pl.composite.velocity.x > targetVelocity + DELTA)
    {
      pressKeys({
        "37":true,
        "39":false,
        "32":false
      });
    }
  }
  if(currentSpot >=0 && currentNode !== null)
  {  
    if(currentSpot < currentNode.seqs[currentIdx].length)
    {
      var cur = currentNode.seqs[currentIdx][currentSpot];
      var ks = gameState.uncompressKeys(cur[1]);
      pressKeys(ks);
      currentDist += pl.composite.speed;
      if(currentSpot === currentNode.seqs[currentIdx].length - 1 || currentDist > currentNode.seqs[currentIdx][currentSpot+1][0] || (pl.composite.speed < MINI_VEL))
      {
        currentSpot++;
      }
    }
    else
    {
      currentNode = null;
    }
  }
}
function pressKeys(ks)
{
  for(var i = 0; i < Keys.SPECIAL_KEYS.length; i++)
  {
    var k = Keys.SPECIAL_KEYS[i];
    var v = ks[k];
    Keys.directKeyEvent(k, v);
  }
}
/**
  END BOT
 **/

//https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
var old = null;
var MAX_INC = 100;
//var STD_INC = 1000/30;
(function run(timestamp) {
  window.requestAnimationFrame(run);
  
  if(!timestamp)
  {
    timestamp = new Date().getTime();
  }
  if(old)
  {
    var inc = timestamp - old;
    if(loginManager.isPlaying())
    {
      if(botNodes !== null && botActive)
      {
        doBot(botNodes);
      }
      for(var i = 0; i < Keys.SPECIAL_KEYS.length; i++)
      {
        var k = Keys.SPECIAL_KEYS[i];
        var v = Keys.pressed[k];
        gameState.sendKeyEvent({'k':k,'v':v}, null);
      }
      if(inc > 0)
      {
        if(inc > MAX_INC)
          inc = MAX_INC;
        gameState.stepFrame(inc);
        
      }
      var hasPlayer = updateRender(inc);
      if(hasPlayer)
      {
        try
        {
          Render.world(render);
          //renderCoins();
          renderRank();
          renderLeaderboard();
          renderSplash(inc);
        }
        catch(e)
        {
          console.log("Broken images");
          console.log(e);
        }
      }
    }
    else if(inc>0)
    {
      loginManager.animate(inc);
    }
  }
  old = timestamp;
})();

var socket = null;
if(document.location.port !== "5000")
{
  var nocache = Math.random();
  var balancer_ip = "52.40.0.180";
  $.get( "http://" + balancer_ip+"/request?"+nocache, function( host ) {
    if(host === "localhost")
    {
      alert("Oops, no servers are running right now... This should be a temporary issue, please wait a few seconds and refresh the page.");
    }
    else
    {
      socket = io(host);
      socketManager = new SocketManager();
    }
  });
}
else
{
  socket = io();
  socketManager = new SocketManager();
}

