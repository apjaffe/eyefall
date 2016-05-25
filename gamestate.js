if (typeof module !== 'undefined')
{
  var Matter = require("./js/matter.min.js");
  var seedrandom = require('seedrandom');
  var QuadTree = require('simple-quadtree')
}
else
{
  var seedrandom = Math.seedrandom;
}
// module aliases
var Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Body = Matter.Body
    Composite = Matter.Composite,
    Constraint = Matter.Constraint,
    Axes = Matter.Axes,
    Vector = Matter.Vector,
    Query = Matter.Query,
    Bounds = Matter.Bounds,
    Detector = Matter.Detector,
    Events = Matter.Events;
var STD_INC = 1000 / 60;

function GameState(serverSide)
{
  var players = [];
  var myPlayerObj = null;
  
  var engine = Engine.create();
  
  var GROUND_SEP = 85;
  var GROUND_RANGE_X = 2000;
  var GROUND_RANGE_Y = 225;
  var NUM_GROUND = 120;
  var GROUND_SEP_X = 600;
  var GROUND_RANGE_X_2 = 100;
  var GROUND_RANGE_Y_2 = 500;

  var MAX_COINS = 500;
  var COIN_WIDTH = 2000;
  var COIN_HEIGHT = GROUND_SEP * NUM_GROUND;
  var COIN_OFFSET = NUM_GROUND * GROUND_SEP_X + GROUND_RANGE_X;
  var COIN_HEIGHT_2 = 1000;
  var COIN_DESPAWN_PROB_TOTAL = 1/60;
  var COIN_DESPAWN_PROB_INDIVIDUAL = 0.0001 / COIN_DESPAWN_PROB_TOTAL;
  var MAX_COIN_RADIUS = 100;
  var MIN_COIN_X = -MAX_COIN_RADIUS-1000;
  var MIN_COIN_Y = -COIN_HEIGHT-MAX_COIN_RADIUS-1000;
  var MAX_COIN_X = COIN_WIDTH + COIN_OFFSET+MAX_COIN_RADIUS+1000;
  var MAX_COIN_Y = Math.max(Math.max(COIN_HEIGHT,COIN_HEIGHT_2-COIN_HEIGHT)+MAX_COIN_RADIUS, 1000);
  var COIN_BOUNDS = {
    "x":MIN_COIN_X,
    "y":MIN_COIN_Y,
    "w":MAX_COIN_X-MIN_COIN_X,
    "h":MAX_COIN_Y-MIN_COIN_Y
  };
  
  //var coins = [];
  var coins = QuadTree(COIN_BOUNDS.x, COIN_BOUNDS.y, COIN_BOUNDS.w, COIN_BOUNDS.h);
  var coinCount = 0;
  var grounds = [];
  var coinDelta = {"add":[],"remove":[]};
  var myId = null;
  var lastTimestamp = null;
  
  var leaderboard = null;

  this.getSkins = function()
  {
    return [
      "ball-100x100s.png",
      "eight_ball.png",
      "iris_small.png",
      "beach_ball.png",
      //"spikes.png",
      "blue.png",
      "red.png",
      "green.png",
      "purple.png",
      "seagreen.png",
      "yellow.png",
      "orange.png",
      "soccer.png",
      "smiling.png",
      "crying.png",
      "neon.png",
      "alien.png",
      "neon2.png",
      "moon.png",
      "earth.png",
      "mars.png",
      "venus.png",
      "jupiter.png",
	  "flags.png"
    ];
  };
  
  function randomGround(rng, xx, yy, grx, gry)
  {
    var textures = ['platform.png','platform2.png','platform3.png','platform4.png']
    var ground2 = Bodies.rectangle(xx + rng() * grx, yy + rng() * gry, 400, 65,
      { 
          isStatic: true,
          render: {
                  strokeStyle: '#000000',
                  sprite: {
                      texture: textures[Math.floor(Math.random()*textures.length)]
                  }
              },
          friction: 0.9,
          angle: Math.floor(rng()*1.3)*Math.PI/2
      });
    return ground2;
  };
  
  var GROUND_BLACKLIST = {
    "61": true,
    "87": true,
    "95": true,
    "104": true,
    "268": true,
    "273": true,
    "295": true,
    "297": true,
    "298": true,
    "326": true
  };
  
  this.getSpawnPoint = function()
  {
    if(Math.random() < 0.5) //TODO 0.5
    {
      return {
        "x": Math.random()*1500,
        "y": -Math.random()*150+150
      };
    }
    else
    {
      return {
        "x": NUM_GROUND * GROUND_SEP_X+GROUND_RANGE_X+Math.random()*1500,
        "y": -Math.random()*200+150
      };
    }
  };
  
   var SPECIAL_KEYS = [
    "37", "39", "32"
  ];
  this.compressKeys = function(keys)
  {
    var num = 0;
    for(var i = 0; i < SPECIAL_KEYS.length; i++)
    {
      if(keys[SPECIAL_KEYS[i]])
      {
        num += (1 << i);
      }
    }
    return num;
  }
  this.uncompressKeys = function(num)
  {
    try
    {
      var ints = Math.floor(num);
      var keys = {};
      for(var i = SPECIAL_KEYS.length; i >=0; i--)
      {
        var pows = 1 << i;
        if(ints >= pows)
        {
          ints -= pows;
          keys[SPECIAL_KEYS[i]] = true;
        }
      }
      return keys;
    }
    catch(e)
    {
      console.log(e);
      return {};
    }
  };
  
  
  this.init = function()
  {
    // create two boxes and a ground
    //var boxA = Bodies.rectangle(400, 200, 80, 80);
    //var boxB = Bodies.rectangle(450, 50, 80, 80);
    grounds = [];
    var rng = new seedrandom('somerandomseed');
  
    var groundOpt1 = { 
      isStatic: true,
      render: {
                  strokeStyle: '#000000',
                  sprite: {
                      texture: 'earth-smallerer.png',
                      xScale: 4,
                      yScale: 4
                  }
              },
      friction: 0.8
    };
    var groundOpt2 = { 
      isStatic: true,
      render: {
                  strokeStyle: '#000000',
                  sprite: {
                      texture: 'moon-smaller.png',
                      xScale: 4,
                      yScale: 4
                  }
              },
      friction: 0.8
    };
  
    var ground = Bodies.circle(892, 1900, 1338, groundOpt1, 20);
    //Bodies.rectangle(750, 810, 2048, 378, groundOpt);
    var START_Y = 400;
    grounds.push(ground); 
    var count = 0;
    for(var i = 0; i < NUM_GROUND; i++)
    { 
      var lbl = ""+count;
      count += 1;
      var gr = null;
      while(gr === null || Query.region(grounds, gr.bounds).length>0)
      {
        gr = randomGround(rng, 0,START_Y-i*GROUND_SEP,GROUND_RANGE_X,GROUND_RANGE_Y);
      }
      gr.label = lbl;
      if(!GROUND_BLACKLIST[lbl])
      {
        grounds.push(gr);
      }
    }    
    var len = NUM_GROUND * GROUND_SEP;
    for(var i = 0; i < NUM_GROUND; i++)
    { 
      var lbl = ""+count;
      count += 1;
      var gr = null;
      while(gr === null || Query.region(grounds, gr.bounds).length>0)
      {
        gr = randomGround(rng, i*GROUND_SEP_X+GROUND_RANGE_X, START_Y-len,GROUND_RANGE_X_2,GROUND_RANGE_Y_2)
      }
      gr.label = lbl;
      if(!GROUND_BLACKLIST[lbl])
      {
        grounds.push(gr);
      }
    }
    var len2 = NUM_GROUND * GROUND_SEP_X;
    for(var i = 0; i < NUM_GROUND; i++)
    { 
      var lbl = ""+count;
      count += 1;
      var gr = null;
      while(gr === null || Query.region(grounds, gr.bounds).length>0)
      {
        gr = randomGround(rng, len2+GROUND_RANGE_X,START_Y-i*GROUND_SEP,GROUND_RANGE_X,GROUND_RANGE_Y);
      }
      gr.label = lbl;
      if(!GROUND_BLACKLIST[lbl])
      {
        grounds.push(gr);
      }
    }
    //var ground2 = Bodies.rectangle(len2+GROUND_RANGE_X+750, 810, 2048, 378, groundOpt);
    var ground2 = Bodies.circle(len2+GROUND_RANGE_X+592, 1900, 1338, groundOpt2, 20);
    grounds.push(ground2);
    
    // add all of the bodies to the world
    World.add(engine.world, grounds);
  };
 
  //TODO
  //DEBUG only
  this.getPlayers = function()
  {
    return players;
  };
  this.getEngine = function()
  {
    return engine;
  };
  
  var LEADERBOARD_SIZE = 10;
  //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
  this.getLeaderboard = function()
  {
    if(!serverSide)
    {
      return leaderboard;
    }
    else
    {
      var ld = [];
      for(var i = 0; i < players.length; i++)
      {
        ld.push([players[i].getNick(), players[i].getCoins()]);
      }
      function cmp(a, b) 
      {
        if (a[1] > b[1]) 
        {
          return -1;
        }
        if (a[1] < b[1]) 
        {
          return 1;
        }
        return 0;
      }
      ld.sort(cmp);
      return ld.slice(0, Math.min(LEADERBOARD_SIZE, ld.length));
    }
  };
  this.setLeaderboard = function(ldb)
  {
    leaderboard = ldb;
  };
 
  //http://stackoverflow.com/questions/10726909/random-alpha-numeric-string-in-javascript
  function randomString(length, chars) {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  }

  this.newId = function()
  {
    return randomString(32, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
  };
  this.smallId = function()
  {
    return randomString(16, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
  };

  this.getEngine = function()
  {
    return engine;
  };
  this.myPlayer = function()
  {
    return myPlayerObj;
  };
  //TODO: optimize
  this.getPlayer = function(id)
  {
    for(var i = 0; i < players.length; i++)
    {
      if(players[i].id == id)
      {
        return players[i];
      }
    } 
    return null;
  };

  //Idempotent, using id's
  this.spawnPlayer = function(data)
  {
    var id = data.id;
    var x = data.x;
    var y = data.y;
    var isMine = data.isMine;
    var skin = data.skin;
    var player = this.getPlayer(id);
    if(id === myId)
    {
      isMine = true;
    }
    if(player === null)
    {
      console.log("Spawning player with data: " + JSON.stringify(data));
      player = new Player(x, y, id, engine, serverSide, this, skin);
      World.add(engine.world, [player.composite]);
      players.push(player);
    }
    else
    {
      Body.setPosition(player.composite, Vector.create(x,y));
    }
    if(isMine)
    {
      myId = id;
      myPlayerObj = player;
    }
    return player;
  };
  this.checkKeepalive = function(cutoff)
  {
    for(var i = 0; i < players.length; i++)
    {
      if(players[i].keepalive && players[i].keepalive < cutoff)
      {
        players[i].startFading(1);
      }
    }  
  };
  this.removePlayerIdx = function(i)
  {
    Composite.remove(engine.world,players[i].composite);
    players.splice(i,1);
  };
  this.removePlayer = function(id)
  {
    for(var i=0;i<players.length;i++)
    {
      if(players[i].id===id)
      {
        players[i].startFading();
        return;
      }
    }
    console.log("Player not found: " + id);
  };

  //player is optional, if null defaults to myPlayer
  this.sendKeyEvent = function(keyMsg, player)
  {
    if(player === null)
    {
      player = this.myPlayer();
    }
    if(player !== null)
    {
      player.keyEvent(keyMsg);
    }
  };
  /*this.sendKeyEventById = function(keyMsg)
  {
    var player = this.getPlayer(keyMsg.id);
    if(player !== null)
    {
      player.keyEvent(keyMsg);
    }
  };*/
  
  this.spawnCoins = function(num)
  {
    for(var i = 0; i < num && coinCount < MAX_COINS; i++)
    {
      var rnd = Math.random();
      var x,y,value;
      if(rnd < 1/4)
      {
        x = Math.random() * COIN_WIDTH;
        y = -Math.random() * COIN_HEIGHT;
        value = 10;
      }
      else if(rnd < 2/4)
      {
        x = Math.random() * COIN_WIDTH + COIN_OFFSET;
        y = -Math.random() * COIN_HEIGHT;
        value = 10;
      }
      else
      {
        x = Math.random() * COIN_OFFSET + COIN_WIDTH;
        y = Math.random() * COIN_HEIGHT_2-COIN_HEIGHT;
        value = 40;
      }
      this.spawnCoin(x,y,value,false);
    }
  };
  this.spawnCoin = function(x,y,value,ignoreCollision)
  {
      var id = this.smallId();
      var coin = new Coin(x, y, value, id, engine, serverSide);
      var collisions = ignoreCollision || Query.region(grounds, coin.getBounds());
      if(ignoreCollision || collisions.length == 0) 
      {
        coins.put(coin);
        coinCount++;
        coinDelta.add.push(coin.getData());
      }
  };
  this.convertBounds = function(matterjsBounds)
  {
    return {
      "x": matterjsBounds.min.x,
      "y": matterjsBounds.min.y,
      "w": matterjsBounds.max.x - matterjsBounds.min.x,
      "h": matterjsBounds.max.y - matterjsBounds.min.y
    }
  };
  this.getCoins = function(bounds)
  {
    var boundsConverted = this.convertBounds(bounds);
    var coinArr = coins.get(boundsConverted);
    //console.log(boundsConverted);
    //console.log(coinArr);
    return coinArr;
  };
  this.getRanks = function()
  {
    var ranks = [];
    for(var i = 0; i < players.length; i++)
    {
      var rank = players[i].getRank();
      if(rank)
      {
        ranks.push(rank);
      }
    }
    return ranks;
  };
  this.getNicks = function()
  {
    var nicks = [];
    for(var i = 0; i < players.length; i++)
    {
      var nick = players[i].getNickObj();
      if(nick)
      {
        nicks.push(nick);
      }
    }
    return nicks;
  };
  this.getClouds = function()
  {
    var clouds = [];
    for(var i = 0; i < players.length; i++)
    {
      var cloud = players[i].getCloud();
      if(cloud)
      {
        clouds.push(cloud);
      }
    }
    return clouds;
  };
  function doRemoveCoin(coin)
  {
    coinDelta.remove.push(coin.getConvertedBounds());
    coins.remove(coin, "id");
    coinCount--;
  }
  this.collectCoins = function(time)
  {
    var newCoins = [];
    var playerBodies = [];
    //TODO: Bias towards players earlier in list
    for(var i = 0; i < players.length; i++)
    {
      var collected = coins.get(this.convertBounds(players[i].composite.bounds));
      for(var j = 0; j < collected.length; j++)
      {
        players[i].addCoins(collected[j].value);
        doRemoveCoin(collected[j]);
      }
    }
    if(Math.random() < COIN_DESPAWN_PROB_TOTAL)
    {
      var all_coins = coins.get(COIN_BOUNDS);
      for(var i = 0; i < all_coins.length; i++)
      {
        if(Math.random() < COIN_DESPAWN_PROB_INDIVIDUAL)
        {
          doRemoveCoin(all_coins[i]);
        }
      }
    }
  };
  var prevDelta = null;
  this.stepFrame = function(time)
  {
    var pl = this.myPlayer();
    if((!pl || !pl.alive) && splashes.length === 0 && !serverSide)
    {
      loginManager.gotoLogin();
    }
    for(var i = 0; i < players.length; i++)
    {
      var alive = players[i].act(time);
      if(!alive)
      {
        if(serverSide)
        {
          players[i].setDead(this);
        }
        this.removePlayerIdx(i);
        i--;
      }
    }
    if(serverSide)
    {
      this.collectCoins(time);
      this.spawnCoins(MAX_COINS);
    }
    var correction = 1;
    if(prevDelta !== null)
    {
      correction = time / prevDelta;   
    }
    prevDelta = time;
    Engine.update(engine, time, correction);
  };
  this.serializeCoins = function()
  {
    var coinArr = coins.get(COIN_BOUNDS);
    var rtn = [];
    for(var i = 0; i < coinArr.length; i++)
    {
      rtn.push(coinArr[i].getData());
    }
    return rtn;
  };
  this.coinDelta = function()
  {
    if(coinDelta.add || coinDelta.remove)
    {
      var tmp = coinDelta;
      coinDelta = {"add":[],"remove":[]};
      return tmp;
    }
    else
    {
      return null;
    }
  };
  this.applyCoins = function(coinData)
  {
    coins.clear();
    for(var i = 0; i < coinData.length; i++)
    {
      coins.put(new Coin(coinData[i].position.x, coinData[i].position.y, coinData[i].value, coinData[i].id, engine, serverSide));
    }
  };
  this.applyCoinDelta = function(coinData)
  {
    for(var i = 0; i < coinData.add.length; i++)
    {
      var dt = coinData.add[i];
      coins.put(new Coin(dt.position.x, dt.position.y, dt.value, dt.id, engine, serverSide));
    }
    for(var i = 0; i < coinData.remove.length; i++)
    {
      coins.remove(coinData.remove[i],"id");
    }
  };
  
  this.time = function()
  {
    return new Date().getTime();
  }
  
  var MAX_VIS_WID = 3000;
  var MAX_VIS_HEI = 3000;
  this.getUpdates = function(target)
  {
    var bounds = target.getVisibility(MAX_VIS_WID, MAX_VIS_HEI, true);
    var rtn = [];
    for(var i = 0; i < players.length; i++)
    {
      if(Bounds.overlaps(players[i].composite.bounds, bounds))
      {
        rtn.push(players[i].getData());
      }
    }
    return {
      "u": rtn,
      "t": this.time()
    };
  };
  var OLD_POS_WEIGHT = 0.9;
  var NEW_POS_WEIGHT = 1-OLD_POS_WEIGHT;
  //returns true if the server tried to correct the keys on our own player!
  this.applyUpdates = function(updatesObj)
  {
    var rtn = false;
    var timestamp = updatesObj.t;
    if(lastTimestamp !== null && timestamp < lastTimestamp)
    {
      console.log("Don't run time backwards!");
      return false; //don't run time backwards!
    }
    lastTimestamp = timestamp;
    var updates = updatesObj.u;
    var playerIds = {};
    for(var i = 0; i < updates.length; i++)
    {
      playerIds[updates[i].id] = true;
      var player = this.getPlayer(updates[i].id);
      if(player === null)
      {
        //TODO: Do this, handling isMine properly
        this.spawnPlayer({
          "x":updates[i].p.x,
          "y":updates[i].p.y,
          "id":updates[i].id,
          "isMine":false,
          "skin":updates[i].s
        });
        continue;
      }
      var avgPos = Vector.add(Vector.mult(player.composite.position,OLD_POS_WEIGHT), Vector.mult(updates[i].p,NEW_POS_WEIGHT));
      Body.setPosition(player.composite,avgPos);
      //Body.setAngle(player.composite,updates[i].angle);
      Body.setVelocity(player.composite,updates[i].v);
      Body.setAngularVelocity(player.composite,updates[i].a);
      var res = player.setKeys(updates[i].k);
      if(res && player === this.myPlayer())
      {
        rtn = true;
      }
      player.setJump(updates[i].j);
      player.setCoins(updates[i].c);
      player.setJumpCount(updates[i].jc);
      player.setNick(updates[i].n);
    }
    for(var i = 0; i < players.length; i++)
    {
      if(!playerIds[players[i].id])
      {
        this.removePlayer(players[i].id);
      }
    }
    return rtn;
  };
  this.getSplash = function(time)
  {
    if(splashTime)
    {
      splashTime -= time;
      if(splashTime <= 0 && splashes.length > 0)
      {
        if(splashes[0].lethal)
        {
          loginManager.gotoLogin();
        }
        splashes.shift();
        splashTime = null;
      }
    }
    if(splashes.length > 0)
    {
      if(splashTime === null)
      {
        splashTime = SPLASH_TOTAL_TIME;
      }
      var opacityNL = Math.min(splashTime / SPLASH_FADE_TIME, SPLASH_OPACITY);
      var opacityL = Math.min((SPLASH_TOTAL_TIME - splashTime) / SPLASH_TOTAL_TIME);
      if(splashes[0].lethal)
      {
        return {
          "splash": splashes[0],
          "opacity": opacityL,
          "modalOpacity": opacityL
        };
      }
      else
      {
        return {
          "splash": splashes[0],
          "opacity": opacityNL,
          "modalOpacity": 0
        };
      }
    }
    return null;
  };
  var FIREWALL_WID = 4201/2;
  var FIREWALL_HEI = 597/2;
  
  this.getFirewall = function()
  {
    var pl = this.myPlayer();
    if(pl)
    {
      var xx = pl.composite.position.x;
      var yy = pl.getFirewallY();
      return [{
        "texture": "firewall.png",
        "getBounds": function(){return {
          "min":{
            "x": xx - FIREWALL_WID,
            "y": yy - FIREWALL_HEI*0.25
          },
          "max":{
            "x": xx + FIREWALL_WID,
            "y": yy + FIREWALL_HEI*1.75
          }
        }},
        "width":FIREWALL_WID*2,
        "height":FIREWALL_HEI*2,
        "opacity": 0.8
      }];
    }
    else
    {
      return [];
    }
  };
  var splashes = [];
  var SPLASH_TOTAL_TIME = 3000;
  var SPLASH_FADE_TIME = 2000;
  var SPLASH_OPACITY = 0.55;
  var splashTime = null;
  this.pushSplash = function(player, title, subtitle, lethal)
  {
    if(serverSide) return;
    
    //console.log(player, title, subtitle, myPlayerObj);
    if(player == myPlayerObj)
    {
      splashes.push({
        "title":title,
        "subtitle":subtitle,
        "lethal":lethal
      });
    }
  };
  Events.on(engine, "collisionActive", function(event){
    for(var i = 0; i < event.pairs.length; i++)
    {
      var pr = event.pairs[i];
      if(pr.bodyA.player && pr.collision.normal.y < 0.5)
      {
        pr.bodyA.player.setFalling(pr.bodyB);
        
      }
      
      if(pr.bodyB.player && pr.collision.normal.y > 0.5)
      {
        pr.bodyB.player.setFalling(pr.bodyA);
      }
      if(pr.bodyA.player && pr.bodyB.player)
      {
        pr.bodyA.player.addContact(pr.bodyB);
        pr.bodyB.player.addContact(pr.bodyA);
      }
    }
  });
}

function Coin(xx, yy, value, id, engine, serverSide)
{
  var SMALL_RADIUS = 10; 
  var BIG_RADIUS = 100;
  //var MAX_VALUE = 10000;
  var MIN_VALUE = 10;
  var radius = SMALL_RADIUS * Math.pow(value/MIN_VALUE, 0.5);
  //var radius = Math.pow((BIG_RADIUS-SMALL_RADIUS),Math.log(value/MIN_VALUE)/Math.log(MAX_VALUE/MIN_VALUE))*SMALL_RADIUS;
  //(Math.log(value)/Math.log(MIN_VALUE) - 1) / (Math.log(MAX_VALUE) - Math.log(MIN_VALUE)) * (BIG_RADIUS-SMALL_RADIUS) + SMALL_RADIUS;
  if(radius > BIG_RADIUS)
    radius = BIG_RADIUS;
  this.position = Vector.create(xx,yy);
  this.renderFn = function(spinTime, ctx)
  {
    var rate = ((spinTime) % SPIN_TOTAL) / SPIN_TOTAL * 2 * Math.PI;
    var PARTS = radius / 2;
    ctx.fillStyle = '#ffffff';
    for(var i = 0; i < PARTS; i++)
    {
      var ga = 1 - i / PARTS;
      if(ga < 0.1)
        break;
      ctx.globalAlpha = ga;
      var br = (i+1) / PARTS * radius;
      drawCircle(ctx, xx, yy, br * Math.sin(rate), br);
    }
    ctx.globalAlpha = 1;
  };
  function drawCircle(ctx, x, y, radius1, radius2)
  {
    ctx.beginPath();
    if(ctx.ellipse)
    {
      ctx.ellipse(x,y,Math.abs(radius1), radius2,0,0,Math.PI*2);
    }
    else
    {
      ctx.arc(x,y,Math.max(Math.abs(radius1),2),0,Math.PI*2);
    }
    ctx.fill();
  }
  //this.texture = "moon_cropped.png";
  this.width = radius * 2;
  this.height = radius * 2;
  this.w = this.width;
  this.h = this.height;
  this.x = xx - radius;
  this.y = yy - radius;
  var SPIN_TOTAL = 2000;
  //this.glowRadius = RADIUS;
  this.value = value;
  this.id = id;
  //var fading = null;
  //var FADE_TIME = 300;
  //this.startFade = function()
  //{
  //  fading = FADE_TIME;
  //};
  this.getConvertedBounds = function()
  {
    return {
      "x":this.x,
      "y":this.y,
      "w":this.w,
      "h":this.h,
      "id":this.id
    };
  };
  this.getData = function()
  { 
    var pl = {
        "position": this.position,
        "value":value,
        "id":id
      }
    return pl;
  };
  this.getBounds = function()
  {
    var o = this;
    var minx = o.position.x-(o.width/2);
    var miny = o.position.y-o.height/2;
    var maxx = minx + o.width;
    var maxy = miny + o.height;
    return Bounds.create([Vector.create(minx,miny), Vector.create(maxx,maxy)]);
  };
  this.getRenderBounds = function(spinTime, ctx)
  {
    var rate = ((spinTime) % SPIN_TOTAL) / SPIN_TOTAL * 2 * Math.PI;
    var o = this;
    var BASE = 1;
    var minx = o.position.x-(o.width/2)*Math.abs(Math.sin(rate))-BASE;
    var miny = o.position.y-o.height/2-BASE;
    var maxx = minx + o.width * Math.abs(Math.sin(rate))+BASE;
    var maxy = miny + o.height + BASE;
    return Bounds.create([Vector.create(minx,miny), Vector.create(maxx,maxy)]);
  };
}

//http://brm.io/matter-js/docs/files/src_factory_Composites.js.html#l230
function Player(xx,yy,id,engine,serverSide,gameState,skin)
{
  this.id = id;
  this.alive = true;
  var that = this;
  var RADIUS = 50;
  var JUMPER_RADIUS = 5;
  var JUMPER_OFFSET = RADIUS - JUMPER_RADIUS*2;
  var NUM_JUMPERS = 1;
  var falling = null; //null if falling, or contact otherwise
  var playerContacts = [];
  var unfallTime = null; //how much time until falling again
  var UNFALL_DUR = 200;
  var lastStable = Vector.create(xx,yy);
  //var group = Body.nextGroup(true)                
  var body = Bodies.circle(xx, yy, RADIUS, { 
          //collisionFilter: {
          //    group: group
          //},
          friction: 0.9,
          frictionAir: 0.015,
          density: 0.001,
          render: {
                  strokeStyle: '#000000',
                  sprite: {
                      texture: skin//"iris_small.png"//"eight_ball.png"//'ball-100x100s.png'
                  }
              }
      });
  var fading = null;
  var maxFade = FADE_TIME;
  var FADE_TIME = 500;  

  var coins = 0;
  var jc = 0; //jump count

  var RANKS = [
  //[coins, icon, title, double jumps, double jump decay rate]
    [    0, "helmet.png", "Unranked", 0, 0],
    [   50, "compass.png","Recruit I", 0, 0],
    [  200, "first-aid-kit.png", "Recruit II", 0, 0],
    [  400, "knife.png","Recruit III",0, 0],
    [ 800, "bullet.png","Scout I",1, 0.3],
    [ 1200, "pistol.png", "Scout II",1, 0.35],
    [ 2000, "machine-gun.png", "Scout III", 1, 0.4],
    [ 3500, "transport-truck.png", "Trucker",1, 0.45],
    [ 5000, "soldier.png", "Foot Soldier",1, 0.5],
    [10000, "tank.png", "Tank Driver",2, 0.5],
    [15000, "secret-agent.png", "Spy",2, 0.52],
    [20000, "pilot.png", "Pilot",2, 0.54],
    [25000, "helicopter.png", "Helicopter Pilot",2, 0.56],
    [30000, "fighter-plane.png", "Fighter Pilot",2,0.58],
    [40000, "fighter-plane-1.png", "Bomber Pilot",2,0.6],
    [50000, "chevrons.png", "Sergeant",3,0.6], //sergeant
    [60000, "lieutenant.png", "Lieutenant",3,0.61],
    [80000, "captain.png", "Captain",3,0.62],
    [100000, "insignia-1.png", "Major",3,0.63], //??
    [150000, "insignia.png", "General I",3,0.64], //general
    [200000, "star.png", "General II",4,0.64]
    ,[1000000, "flag.png", "CHEATER",100,1.0]
  ];//TODO: King

  /**
  BOT SECTION START
  **/
  var botRecording = false;
  var nodes = [];
  var NODE_X_THRESHOLD = 3000;
  var NODE_Y_THRESHOLD = 5;
  this.startRecordBot = function(val)
  {
    if(val === undefined) val = true;
    botRecording = val;
  };
  this.setNodes = function(n)
  {
    nodes = n;
  };
  this.getNode = function(pos)
  {
    var npos = Vector.neg(pos);
    for(var i = 0; i < nodes.length; i++)
    {
      var dlt = Vector.add(nodes[i].pos,npos);
      if(Math.abs(dlt.x) < NODE_X_THRESHOLD && Math.abs(dlt.y) < NODE_Y_THRESHOLD)
      {
        return nodes[i];
      }
    }
    return null;
  };
  var STABLE_SPEED = 0.1;
  var lastNode = null;
  var currentSeq = [];
  var startPos = null;
  var currentDist = 0;
  var lastKeys = null;
  this.serializeBot = function()
  {
    return JSON.stringify(nodes);
  };
  this.recordBot = function()
  {
    if(this.composite.speed < STABLE_SPEED)
    {
      var nextNode = this.getNode(this.composite.position);
      if(nextNode === null)
      {
        nextNode = {
          "pos": Vector.clone(this.composite.position),
          "seqs": [],
          "posl": []
        };
        nodes.push(nextNode);
      }
      if(lastNode !== null && lastNode !== nextNode)
      {
        currentSeq.push([currentDist, 0]);
        
        lastNode.seqs.push(currentSeq);
        lastNode.posl.push(startPos);
        currentDist = 0;
        lastKeys = 0;
      }
      lastNode = nextNode;
      currentSeq = [];
      startPos = Vector.clone(this.composite.position);
      currentDist = 0;
      lastKeys = 0;
    }
    else
    {
      var mkeys = gameState.compressKeys(keys);
      if(mkeys !== lastKeys)
      {
        currentSeq.push([currentDist, mkeys]);
        lastKeys = mkeys;
      }
      currentDist += this.composite.speed;
    }
  };
  /**
  BOT SECTION END
  **/
  
  this.addContact = function(cn)
  {
    playerContacts.push(cn);
  };
  
  this.clearContacts = function()
  {
    playerContacts = [];
  };
  
  this.setFalling = function(bl)
  {
    falling = bl;
    if(bl!==null)
    {
      unfallTime = UNFALL_DUR;
      jc = 0;
    }
  };
  
  function rankData(cns)
  {
    for(var i = 0; i < RANKS.length; i++)
    {
      if(cns < RANKS[i][0])
      {
        var current = RANKS[i-1] || null;
        return {
          "current": current,
          "next": RANKS[i],
          "noGraphic": i===1
        };
      }
    }
    return {
      "current": RANKS[i-1],
      "next": null
    };
  };
  
  var RANK_SIZE = 20;
  var nickname = null;
  var NICK_FONT = "30px Impact, Charcoal, sans-serif";
  var HALF_NICK_HEI = 12;
  
  this.getRankData = function()
  {
    return rankData(coins);
  };
  
  this.getNickObj = function()
  {
    if(nickname === null || !this.composite)
    {
      return null;
    }
    return {
      "textAlign": 'center',
      "fillStyle": '#FFF',
      "font": NICK_FONT,
      "x": this.composite.position.x,
      "y": this.composite.position.y - RADIUS - 3,
      "text": nickname,
      "opacity": 0.7
    };
  }
  
  this.nickWidth = function(ctx)
  {
    if(nickname === null)
    {
      return 0;
    }
    ctx.font = NICK_FONT;
    return ctx.measureText(nickname).width;   
  };

  this.getRank = function()
  {
    var r = rankData(coins);
    if(r.current === null || !this.composite || r.noGraphic)
    {
      return null;
    }
    return {
      "texture": "ranks/"+r.current[1],
      "getRenderBounds": function(spinTime, ctx){
        var nickWidth = that.nickWidth(ctx)/2;
        return {
          "min":{
            "x": that.composite.position.x + nickWidth  + 3,
            "y": that.composite.position.y - RADIUS - RANK_SIZE - HALF_NICK_HEI - 3
          },
          "max":{
            "x": that.composite.position.x + nickWidth + 2 * RANK_SIZE + 3,
            "y": that.composite.position.y - RADIUS + RANK_SIZE - HALF_NICK_HEI - 3
          }
      }},
      "width":RANK_SIZE*2,
      "height":RANK_SIZE*2,
      "opacity": 0.7
    };
  };
  
 

  function getAngle(jnum)
  {
    return (jnum / NUM_JUMPERS) * 2 * Math.PI;
  }
  this.setDead = function(gs)
  {
    if(coins > 0)
    {
      gs.spawnCoin(lastStable.x, lastStable.y, coins, true);
    }
    coins=0;
  };
  this.getCoins = function()
  {
    return coins;
  };
  this.setCoins = function(c)
  {
    var oldr = rankData(coins).current;
    var newr = rankData(c).current;
    if(oldr != newr && c > coins)
    {
      var text2 = (newr[3] > oldr[3]) ? "Extra double jump unlocked" : "New Rank Acquired";
      gameState.pushSplash(this, newr[2], text2, false);
    }
    coins = c;
  };
  this.addCoins = function(c)
  {
    this.setCoins(coins + c);
  };
  this.getJumpCount = function()
  {
    return jc;
  };
  this.setJumpCount = function(c)
  {
    jc = c;
  };
  
  function roundDecimal(dcm)
  {
    return Number(dcm.toPrecision(3));
  }
  function roundVector(vct)
  {
    return {
      "x": roundDecimal(vct.x),
      "y": roundDecimal(vct.y)
    };
  }
  
  this.getData = function()
  { 
    var player = this;
    var pl = {
        "id": player.id,
        "p": player.composite.position,
        //"angle": player.composite.angle,
        "v": roundVector(player.composite.velocity),
        "a": roundDecimal(player.composite.angularVelocity),
        "k": gameState.compressKeys(keys),
        "j": jumpStatus,
        "c": coins,
        "jc": jc,
        "n": nickname,
        "s":skin
      }
    return pl;
  };

  this.startFading = function(mult)
  {
    if(!mult)
      mult = 1;
    if(fading === null)
    {
      maxFade = FADE_TIME * mult;
      fading = maxFade;
      gameState.pushSplash(this, "You fell :(","You collected " + coins + " eyeballs",true);
    }
  };

  var keys = {};
  //return true if the set of keys changed
  this.setKeys = function(dct)
  {
    var current = gameState.compressKeys(keys);
    keys = gameState.uncompressKeys(dct);
    return dct !== current;
  };
  this.getKeys = function()
  {
    return gameState.compressKeys(keys);
  };
  this.setJump = function(jmp)
  {
    jumpStatus = jmp;
  };
  this.getJump = function()
  {
    return jumpStatus;
  };
  this.setNickOnce = function(nck)
  {
    if(nickname === null)
    {
      nickname = nck;
    }
  }
  this.setNick = function(nck)
  {
    nickname = nck;
  };
  this.getNick = function()
  {
    return nickname;
  };
  this.composite = body;
  this.composite.player = this;
  
  this.getMaxJC = function()
  {
    var r = rankData(coins);
    if(r.current && r.current[3]!==undefined)
    {
      return r.current[3];
    }
    else
    {
      return 0;
    }
  };
  this.getJumpDecay = function()
  {
    var r = rankData(coins);
    if(r.current && r.current[4]!==undefined)
    {
      return r.current[4];
    }
    else
    {
      return 0;
    }
  };

  var FALLEN_Y = 3000;
  var FALLEN_Y_DIST = 1000;
  var lastUp = yy;
  
  var doubleJumpPos = null;
  var doubleJumpTime = null;
  var DOUBLE_JUMP_DUR = 350;
  
  this.getCloud = function()
  {
    var CLOUD_WID = 50; //halfwid
    var CLOUD_HEI = 27; //halfhei
    if(doubleJumpPos === null || !this.composite)
    {
      return null;
    }
    return {
      "texture": "cloud.png",
      "getBounds": function(){return {
        "min":{
          "x": doubleJumpPos.x - CLOUD_WID,
          "y": doubleJumpPos.y + RADIUS - CLOUD_HEI
        },
        "max":{
          "x": doubleJumpPos.x + CLOUD_WID,
          "y": doubleJumpPos.y + RADIUS + CLOUD_HEI
        }
      }},
      "width":CLOUD_WID*2,
      "height":CLOUD_HEI*2,
      "opacity": doubleJumpTime / DOUBLE_JUMP_DUR
    };
  };

  var STABLE_VELOCITY = 1.0;
  var STRENGTH = 1;
  var LINEAR_STRENGTH = 0.01 * STD_INC / STRENGTH;
  
  this.getFirewallY = function()
  {
    return Math.min(FALLEN_Y, FALLEN_Y_DIST + lastUp);
  };
  
  //returns false if the player should be removed
  this.act = function(time)
  {
    if(botRecording && this === gameState.myPlayer())
    {
      this.recordBot();
    }
    if(doubleJumpTime !== null)
    {
      doubleJumpTime -= time;
      if(doubleJumpTime <= 0)
      {
        doubleJumpPos = null;
        doubleJumpTime = null;
      }
    }
    if(fading !== null)
    {
      fading -= time;
      this.composite.render.opacity = fading / maxFade;
      if(fading <= 0)
      {
        this.alive = false;
        return false;
      }
    }
    
    if(this.composite.position.y > this.getFirewallY())
    {
      if(serverSide)
      {
        this.alive = false;
        return false;
      }
      //else
      //{
      //  this.startFading(3);
      //}
    }
    if(Math.abs(this.composite.velocity.y) < STABLE_VELOCITY)
    {
      lastStable = Vector.clone(this.composite.position);
    }
    if(this.composite.velocity.y < STABLE_VELOCITY)
    {
      lastUp = this.composite.position.y;
    }
    var tq = 0;
    if(keys["37"]) //left
    {
      tq -= STRENGTH;
    }
    if(keys["39"]) //right
    {
      tq += STRENGTH;
    }
    body.torque = tq;
    Body.applyForce(body,body.position,Vector.create(tq*LINEAR_STRENGTH/time,0));
    if(jumpStatus > time)
    {
      jumpStatus-=time;
    }
    else
    {
      jumpStatus = 0;
    }
    if(jumpCheckStatus > time)
    {
      jumpCheckStatus-=time;
    }
    else
    {
      jumpCheckStatus = 0;
    }
    if(jumpStatus == 0 && keys["32"]) //space
    {
      this.jump(time);
    }
    if(unfallTime > time)
    {
      unfallTime -= time;
    }
    else
    {
      falling = null; //reset until next collision
    }
    this.clearContacts();
    return true;
  }
  
  function doJump(time, angle, pos, body, other, mult)
  {
    var frc1 = Vector.rotate(Vector.create(0, -JUMP_FORCE * mult / time),angle);
 
    if(body.velocity.y > 0)
    {
      Body.setVelocity(body, Vector.create(body.velocity.x,0))
    }
    
    Body.applyForce(body,pos,frc1);
    for(var i = 0; i < playerContacts.length; i++)
    {
      var dlt = Vector.normalise(Vector.add(playerContacts[i].position, Vector.neg(body.position)));
      var frc2 = Vector.mult(dlt, PUSH_FORCE * mult / time);
      Body.applyForce(playerContacts[i],pos,frc2);
    }
  }
  
  this.manualFallCheck = function()
  {
    //for(var i = 0; i < NUM_JUMPERS; i++)
    //  {
    var bodies = [];
    for(var i=0;i<engine.world.bodies.length;i++)
    {
      if(engine.world.bodies[i]!=body)
      {
        bodies.push(engine.world.bodies[i]);
      }
    }
    var i = 0;
    var dir = Vector.rotate(Vector.create(0, RADIUS+15),getAngle(i));
    var collisions = Query.ray(bodies, body.position, Vector.add(body.position,dir), JUMP_RAY_WIDTH)
    for(var j = 0; j< collisions.length && j < 1;j++)
    {
      var other = collisions[j].bodyA;
      if(other === body)
      {
        other = collisions[j].bodyB;
      }
      if(other === body)
      {
        console.log("Collision with self");
      }
      //var idx = bodies.indexOf(other);
      //bodies.splice(idx,1);
      return other;
      //doJump(time, getAngle(i), body.position, body, other);
    }
    return null;
  };
  
  var jumpStatus = 0;
  var jumpCheckStatus = 0;
  var JUMP_DURATION = 200;
  var JUMP_CHECK_DURATION = 500;
  var JUMP_FORCE = 0.35 * STD_INC;
  var PUSH_FORCE = 1.0 * STD_INC;
  var JUMP_RAY_WIDTH = 100;
  this.jump = function(time)
  {

    if(jumpStatus === 0)
    {
      if(falling === null && jumpCheckStatus === 0)
      {
        jumpCheckStatus = JUMP_DURATION;
        this.setFalling(this.manualFallCheck());
      }
      if(falling !== null)
      {
        doJump(time, 0, body.position, body, falling, 1);
        jumpStatus = JUMP_DURATION;
      }
      else if(jc < this.getMaxJC())
      {
        var jd = this.getJumpDecay();
        jc+=1;
        doJump(time, 0, body.position, body, null, Math.pow(jd,jc));
        jumpStatus = JUMP_DURATION;
        doubleJumpPos = Vector.clone(body.position);
        doubleJumpTime = DOUBLE_JUMP_DUR;
      }
    }
  };
  var VISIBLE_X = 800;
  var VISIBLE_Y = 500;
  
  var lastPos = null; 
  var OLD_WEIGHT = 0.92;
  var NEW_WEIGHT = 1-OLD_WEIGHT; 
  var MAX_DIST = 80;

  this.getVisibility = function(wid, hei, forceBounds) 
  {
    if(hei===0){hei = 1};
    if(forceBounds)
    {
      var delta1 = Vector.create(wid,hei);
    }
    else
    {
      var delta1 = Vector.create(wid/hei*VISIBLE_Y, VISIBLE_Y);
    }
    var delta2 = Vector.neg(delta1);
    if(lastPos === null)
      lastPos = body.position;
    var newPosOld = Vector.add(Vector.mult(lastPos, OLD_WEIGHT), Vector.mult(body.position, NEW_WEIGHT));
    var target = Vector.add(newPosOld, Vector.neg(lastPos));
    var dir = Vector.normalise(target);
    var move = Vector.mult(dir, Math.min(MAX_DIST, Vector.magnitude(target)));
    var newPos = Vector.add(lastPos,move);
    lastPos = newPos;
    return Bounds.create([Vector.add(newPos, delta2), Vector.add(newPos, delta1)]);
  };
  this.keyEvent = function(keyMsg)
  {
    keys[""+keyMsg.k]=keyMsg.v;
  };
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
    module.exports = GameState;
