var http = require("http");
var fs = require("fs");

//Read settings
var colors = fs.readFileSync("./config/colors.txt").toString().replace(/\r/,"").split("\n");
var blacklist = fs.readFileSync("./config/blacklist.txt").toString().replace(/\r/,"").split("\n");
var colorBlacklist = fs.readFileSync("./config/colorBlacklist.txt").toString().replace(/\r/,"").split("\n");
var config = JSON.parse(fs.readFileSync("./config/config.json"));
var bans = JSON.parse(fs.readFileSync("./config/bans.json"));
var shadowbans = JSON.parse(fs.readFileSync("./config/shadowbans.json"));
var motd = JSON.parse(fs.readFileSync("./config/motd.json"));
if(blacklist.includes("")) blacklist = []; //If the blacklist has a blank line, ignore the whole list.

var markup = require("./markup.js");

//Variables
var rooms = {};
var users = {};
var userips = {}; //It's just for the alt limit
var clientslowmode = [];
var guidcounter = 0;
var server = http.createServer((req, res) => {
    //HTTP SERVER (not getting express i won't use 99% of its functions for a simple project)
    fname = "index.html";
    if (fs.existsSync("./frontend/" + req.url) && fs.lstatSync("./frontend/" + req.url).isFile()) {
        data = fs.readFileSync("./frontend/" + req.url);
        fname = req.url;
    } else {
        data = fs.readFileSync("./frontend/index.html");
    }
    fname.endsWith(".js") ? res.writeHead(200, { "Content-Type": "text/javascript" }) : res.writeHead(200, {});
    if(!req.url.includes("../")) res.write(data);
    res.end();
});

//Socket.io Server
var io = require("socket.io")(server, {
    allowEIO3: true
}
);
server.listen(config.port, () => {
    rooms["default"] = new room("default");
    rooms["desanitize"] = new room("desanitize");
    console.log("running at http://bonzi.localhost:" + config.port);
});
io.on("connection", (socket) => {
  var IP = socket.request.connection.remoteAddress;
  //pure IPv4 addresses
  if (IP.startsWith("::ffff:"))
    IP = IP.substring(7);
  socket.IP = IP;
  //check if banned
  if (Object.keys(bans).includes(IP)) {
    var currentDate = new Date();
    if (bans[IP].expires == null || bans[IP].expires > currentDate.getTime()) {
      //banned
      socket.emit("ban",{reason:bans[IP].reason,end:bans[IP].expires});
      socket.disconnect();
      delete currentDate;
      return;
    }
    delete currentDate;
  }
  //check if shadowbanned
  if (Object.keys(shadowbans).includes(IP)) {
    var currentDate = new Date();
    if (shadowbans[IP].expires == null || shadowbans[IP].expires > currentDate.getTime()) {
      //banned
      socket.emit("shadowban",{reason:shadowbans[IP].reason,end:shadowbans[IP].expires});
      socket.disconnect();
      delete currentDate;
      return;
    }
    delete currentDate;
  }
  //First, verify this user fits the alt limit
  if(typeof userips[IP] == 'undefined') userips[IP] = 0;
  userips[IP]++;

  if (motd.enabled) socket.emit("motd", motd.response);

  //Set up a new user on connection
    new user(socket);
});

//Now for the fun!

//Command list
var commands = {
  //normal commands
  name:(victim,param)=>{
    if (param == "" || param.length > config.namelimit || victim.statlocked) return;
    if (victim.markup) {
      victim.public.name = markup(param, true);
      victim.public.dispname = markup(param);
    }
    else {
      victim.public.name = param;
      victim.public.dispname = param;
    }
    victim.room.emit("update",{guid:victim.public.guid,userPublic:victim.public})
  },
  
  asshole:(victim,param)=>{
  victim.room.emit("asshole",{
    guid:victim.public.guid,
    target:param,
  })
  },

  bass:(victim,param)=>{
  victim.room.emit("bass",{
    guid:victim.public.guid,
    target:param,
  })
  },
    
  color:(victim, param)=>{
    if (victim.statlocked)
      return;
    if (!param.startsWith("http"))
      param = param.toLowerCase();
    if(!param || colorBlacklist.includes(param) || (!param.startsWith("http") && !colors.includes(param)))
      param = colors[Math.floor(Math.random() * colors.length)];
    victim.public.color = param;
    victim.public.tagged = false;
    victim.room.emit("update",{guid:victim.public.guid,userPublic:victim.public})
  }, 
  
  pitch:(victim, param)=>{
    param = parseInt(param);
    if(isNaN(param)) return;
    victim.public.pitch = param;
    victim.room.emit("update",{guid:victim.public.guid,userPublic:victim.public})
  },

  speed:(victim, param)=>{
    param = parseInt(param);
    if(isNaN(param) || param>400) return;
    victim.public.speed = param;
    victim.room.emit("update",{guid:victim.public.guid,userPublic:victim.public})
  },

  rabbi:(victim, param)=>{
    if (victim.statlocked)
      return;
    victim.public.color = "rabbi";
    victim.room.emit("update",{guid:victim.public.guid,userPublic:victim.public})
  },

  joke:(victim, param)=>{
    victim.room.emit("joke", {guid:victim.public.guid, rng:Math.random()})
  },
  
  fact:(victim, param)=>{
    victim.room.emit("fact", {guid:victim.public.guid, rng:Math.random()})
  },
  
  backflip:(victim, param)=>{
    victim.room.emit("backflip", {guid:victim.public.guid, swag:(param.toLowerCase() == "swag")})
  },
  
  owo:(victim, param)=>{
  victim.room.emit("owo",{
    guid:victim.public.guid,
    target:param,
  })
  },

  triggered:(victim, param)=>{
    victim.room.emit("triggered", {guid:victim.public.guid})
  },

  linux:(victim, param)=>{
    victim.room.emit("linux", {guid:victim.public.guid})
  },

  youtube:(victim, param)=>{
    victim.room.emit("youtube",{guid:victim.public.guid, vid:param.replace(/"/g, "&quot;")})
  },

  bitview:(victim, param)=>{
    victim.room.emit("bitview",{guid:victim.public.guid, vid:param.replace(/"/g, "&quot;")})
  },

  hail:(victim, param)=>{
    victim.room.emit("hail",{guid:victim.public.guid,user:param});
  },

  nigger:(victim, param)=>{
    victim.room.emit("talk",{guid:victim.public.guid, text:"Seamus is a nigger!"});
    victim.lastMessage = "Seamus is a nigger!";
  },

  vaporwave:(victim, param)=>{
    victim.socket.emit("vaporwave");
    victim.room.emit("youtube",{guid:victim.public.guid,vid:"aQkPcPqTq4M"});
  },

  unvaporwave:(victim, param)=>{
    victim.socket.emit("unvaporwave");
  },

  pawn:(victim, param)=>{
    victim.room.emit("pawn", {guid:victim.public.guid})
  },

  emote:(victim, param)=>{
    victim.room.emit("emote", {guid:victim.public.guid,type:param});
  },

  background:(victim, param)=>{
    victim.socket.emit("background", {bg:param});
  },

  theme:(victim, param)=>{
    victim.socket.emit("theme", param);
  },

  image:(victim, param)=>{
    victim.room.emit("talk",{guid:victim.public.guid,text:`<img class='userimage' src='${param.replace(/'/g, "&apos;")}'>`});
  },

  audio:(victim, param)=>{
    victim.room.emit("talk",{guid:victim.public.guid,text:`<audio class='useraudio' src='${param.replace(/'/g, "&apos;")}' controls></audio>`});
  },

  video:(victim, param)=>{
    victim.room.emit("talk",{guid:victim.public.guid,text:`<video class='uservideo' src='${param.replace(/'/g, "&apos;")}' controls></video>`});
  },

  markup:(victim, param)=>{
    switch (param.toLowerCase()) {
      case "off":
      case "false":
      case "no":
      case "n":
      case "0":
        victim.markup = false;
      break;
      default:
        victim.markup = true;
      break;
    }
  },

  //blessed commands
  announce:(victim, param)=>{
    if (victim.level < 1 && victim.public.color != "blessed") return;
    victim.room.emit("announcement", {from:victim.public.name,msg:param});
  },

  poll:(victim, param)=>{
    if (victim.level < 1 && victim.public.color != "blessed") return;
    victim.room.emit("pollshow", param);
    victim.room.pollvotes = {};
    victim.room.emit("pollupdate", {yes: 0, no: 0, votecount: 0});
  },

  //room owner commands
  king:(victim, param)=>{
    if(victim.level<1) return;
    victim.public.color = "king";
    victim.public.tagged = true;
    victim.public.tag = "King";
    victim.room.emit("update",{guid:victim.public.guid,userPublic:victim.public})
  },

  tag:(victim, param)=>{
    if(victim.level<1) return;
    if (!param || param == "")
      victim.public.tagged = false;
    else {
      victim.public.tagged = true;
      victim.public.tag = param;
    }
    victim.room.emit("update",{guid:victim.public.guid,userPublic:victim.public});
  },

  jewify:(victim, param)=>{
    if(victim.level<1 || !victim.room.usersPublic[param] && victim.public.color != "rabbi") return;
    victim.room.usersPublic[param].color = "jew";
    victim.room.usersPublic[param].tagged = true;
    victim.room.usersPublic[param].tag = "Jew";
    victim.room.emit("update",{guid:param,userPublic:victim.room.usersPublic[param]});
  },

  rabbify:(victim, param)=>{
    if(victim.level<1 || !victim.room.usersPublic[param]) return;
    victim.room.usersPublic[param].color = "rabbi";
    victim.room.usersPublic[param].tagged = true;
    victim.room.usersPublic[param].tag = "Rabbi";
    victim.room.emit("update",{guid:param,userPublic:victim.room.usersPublic[param]});
  },

  bless:(victim, param)=>{
    if(victim.level<1 || !victim.room.usersPublic[param] && victim.public.color != "rabbi") return;
    victim.room.usersPublic[param].color = "blessed";
    victim.room.usersPublic[param].tagged = true;
    victim.room.usersPublic[param].tag = "Blessed";
    victim.room.emit("update",{guid:param,userPublic:victim.room.usersPublic[param]});
  },

  hypnotize:(victim, param)=>{
    if(victim.level<1 || !victim.room.usersPublic[param] && victim.public.color != "rabbi") return;
    victim.room.usersPublic[param].color = "fuckunesupporter";
    victim.room.usersPublic[param].tagged = true;
    victim.room.usersPublic[param].tag = "Hypno";
    victim.room.emit("update",{guid:param,userPublic:victim.room.usersPublic[param]});
  },

  statlock:(victim, param)=>{
    if(victim.level<1 || !victim.room.usersPublic[param] && victim.public.color != "rabbi") return;
    users[param].statlocked = !users[param].statlocked;
  },

  massbless:(victim, param)=>{
    if(victim.level<1 && victim.public.color != "rabbi") return;
    for (var i = 0; i < victim.room.users.length; ++i) {
      if (victim.room.users[i].level < 1) {
        victim.room.users[i].public.color = "blessed";
        victim.room.users[i].public.tagged = true;
        victim.room.users[i].public.tag = "Blessed";
        victim.room.emit("update",{guid:victim.room.users[i].public.guid,userPublic:victim.room.users[i].public});
      }
    }
  },

  massrabbi:(victim, param)=>{
    if(victim.level<1 && victim.public.color != "rabbi") return;
    for (var i = 0; i < victim.room.users.length; ++i) {
      if (victim.room.users[i].level < 1) {
        victim.room.users[i].public.color = "rabbi";
        victim.room.users[i].public.tagged = true;
        victim.room.users[i].public.tag = "Rabbi";
        victim.room.emit("update",{guid:victim.room.users[i].public.guid,userPublic:victim.room.users[i].public});
      }
    }
  },

  //king commands
  kingmode:(victim, param)=>{
    if(param == config.kingword) victim.level = 1.1;
    victim.socket.emit("authlv",{level:1.1});
  },

  sanitize:(victim, param)=>{
    if(victim.level<1.1) return;
    if(victim.sanitize) victim.sanitize = false;
    else victim.sanitize = true;
  },

  smute:(victim, param)=>{
    if(victim.level<1.1 || !victim.room.usersPublic[param]) return;
    if (users[param].muted == 0) {
      users[param].muted = 1;
      victim.room.usersPublic[param].typing = " (muted)";
    }
    else if (users[param].muted == 1) {
      users[param].muted = 0;
      victim.room.usersPublic[param].typing = "";
    }  
    victim.room.emit("update",{guid:param,userPublic:victim.room.usersPublic[param]});
  },


  gag:(victim, param)=>{
    if(victim.level<1.1 || !victim.room.usersPublic[param]) return;
    if (users[param].muted == 0) {
      users[param].muted = 1.5;
      victim.room.usersPublic[param].typing = " (gagged)";
    }
    else if (users[param].muted == 1) {
      users[param].muted = 0;
      victim.room.usersPublic[param].typing = "";
    }  
    victim.room.emit("update",{guid:param,userPublic:victim.room.usersPublic[param]});
  },

  floyd:(victim, param)=>{
    if(victim.level<1.1 || !victim.room.usersPublic[param]) return;
    users[param].muted = 2;
    victim.room.usersPublic[param].name = "DIRTY NIGGER";
    victim.room.usersPublic[param].dispname = "DIRTY NIGGER";
    victim.room.usersPublic[param].color = "floyd";
    victim.room.usersPublic[param].tagged = true;
    victim.room.usersPublic[param].tag = "DIRTY NIGGER";
    victim.room.usersPublic[param].typing = "";
    victim.room.emit("update",{guid:param,userPublic:victim.room.usersPublic[param]});
    users[param].socket.emit("nuke");
    if (users[param].nuked == null)
      users[param].nuked = setInterval(() => {
        victim.room.emit("talk", { guid: param, text: "I AM A GAY FAGGOT" })
      }, 1200);
  },

  deporn:(victim, param)=>{
    if(victim.level<1.1 || !victim.room.usersPublic[param] || !victim.room.usersPublic[param].color.startsWith("http")) return;
    var newBlacklist = "";
    for (var i = 0; i < colorBlacklist.length; ++i)
      newBlacklist += colorBlacklist[i] + "\n";
    newBlacklist += victim.room.usersPublic[param].color;
    fs.writeFileSync("./config/colorBlacklist.txt", newBlacklist);
    colorBlacklist = fs.readFileSync("./config/colorBlacklist.txt").toString().replace(/\r/,"").split("\n");
    victim.room.usersPublic[param].name = "I love men";
    victim.room.usersPublic[param].dispname = "I love men";
    victim.room.usersPublic[param].color = "jew";
    victim.room.emit("update",{guid:param,userPublic:victim.room.usersPublic[param]});
  },

  kick:(victim, param)=>{
    if(victim.level<1.1 || !victim.room.usersPublic[param]) return;
    users[param].socket.emit("kick",victim.public.name);
    users[param].socket.disconnect();
  },

  //pope commands
  popemode:(victim, param)=>{
    if(param == config.popeword) victim.level = 2;
    victim.socket.emit("authlv",{level:2});
  },

  cogodmode:(victim, param)=>{
    if(param == config.cogodword) victim.level = 2.5;
    victim.socket.emit("authlv",{level:2.5});
  },

  godmode:(victim, param)=>{
    if(param == config.godword) victim.level = 3;
    victim.socket.emit("authlv",{level:3});
  },

  pope:(victim, param)=>{
    if(victim.level<2) return;
    victim.public.color = "pope";
    victim.public.tagged = true;
    victim.public.tag = "Admin";
    victim.room.emit("update",{guid:victim.public.guid,userPublic:victim.public})
  },

  god:(victim, param)=>{
    if(victim.level<2.5) return;
    victim.public.color = "god";
    victim.public.tagged = true;
    victim.public.tag = "Co-Owner";
    victim.room.emit("update",{guid:victim.public.guid,userPublic:victim.public})
  },

  overpowered_god:(victim, param)=>{
    if(victim.level<3) return;
    victim.public.color = "overpowered_god";
    victim.public.tagged = true;
    victim.public.tag = "Owner";
    victim.room.emit("update",{guid:victim.public.guid,userPublic:victim.public})
  },

  restart:(victim, param)=>{
    if(victim.level<3) return;
    for (thing in rooms)
      rooms[thing].emit("errr", {code: 104});
    process.exit();
  },

  update:(victim, param)=>{
    if(victim.level<3) return;
    //Just re-read the settings.
    colors = fs.readFileSync("./config/colors.txt").toString().replace(/\r/,"").split("\n");
    blacklist = fs.readFileSync("./config/blacklist.txt").toString().replace(/\r/,"").split("\n");
    colorBlacklist = fs.readFileSync("./config/colorBlacklist.txt").toString().replace(/\r/,"").split("\n");
    config = JSON.parse(fs.readFileSync("./config/config.json"));
    bans = JSON.parse(fs.readFileSync("./config/bans.json"));
    motd = JSON.parse(fs.readFileSync("./config/motd.json"));
    if(blacklist.includes("")) blacklist = []; 
  },

  ip:(victim, param)=>{
    if(victim.level<1.5 || !victim.room.usersPublic[param]) return;
    victim.socket.emit("rawdata", users[param].socket.IP);
  },

  tagsom:(victim, param)=>{
    var id = param.split(" ", 1), tag = param.substring(id.length + 1);
    if(victim.level<2 || !victim.room.usersPublic[id]) return;
    if (!tag || tag == "")
      victim.room.usersPublic[id].tagged = false;
    else {
      victim.room.usersPublic[id].tagged = true;
      victim.room.usersPublic[id].tag = tag;
    }
    victim.room.emit("update",{guid:id,userPublic:victim.room.usersPublic[id]});
  },

  ipmute:(victim, param)=>{
    if(victim.level<2 || !victim.room.usersPublic[param]) return;
    victim.room.usersPublic[param].typing = ` (ip is ${users[param].socket.IP})`;
    users[param].muted = 3;
    victim.room.emit("update",{guid:param,userPublic:victim.room.usersPublic[param]});
  },

  ipfloyd:(victim, param)=>{
    if(victim.level<2 || !victim.room.usersPublic[param]) return;
    users[param].muted = 4;
    victim.room.usersPublic[param].name = "DIRTY NIGGER";
    victim.room.usersPublic[param].dispname = "DIRTY NIGGER";
    victim.room.usersPublic[param].color = "floyd";
    victim.room.usersPublic[param].tagged = true;
    victim.room.usersPublic[param].tag = "DIRTY NIGGER";
    victim.room.usersPublic[param].typing = ` (ip is ${users[param].socket.IP})`;
    victim.room.emit("update",{guid:param,userPublic:victim.room.usersPublic[param]});
    users[param].socket.emit("nuke");
    if (users[param].nuked == null)
      users[param].nuked = setInterval(() => {
        victim.room.emit("talk", { guid: param, text: `My IP is ${users[param].socket.IP}` })
      }, 1200);
  },

  ban:(victim, param)=>{
    var parameters = param.split(" ", 2), IP = parameters[0], duration = parameters[1], reason = param.substring(IP.length + duration.length + 2);
    if(victim.level<2.5 || !IP || !duration) return;
    duration = parseInt(duration);
    if (isNaN(duration)) return;
    if (typeof bans[IP] == "undefined") bans[IP] = {};
    bans[IP].reason = reason;
    if (duration < 1) //permanent bans
      bans[IP].expires = null;
    else {
      var expirationDate = new Date();
      expirationDate.setMinutes(expirationDate.getMinutes() + duration);
      bans[IP].expires = expirationDate.getTime();
      delete expirationDate;
    }
    fs.writeFileSync("./config/bans.json", JSON.stringify(bans));
    var userIDs = Object.keys(users);
    for (var i = 0; i < userIDs.length; ++i)
      if (users[userIDs[i]].socket.IP == IP) {
        users[userIDs[i]].socket.emit("ban",{reason:reason,end:bans[IP].expires});
        users[userIDs[i]].socket.disconnect();
      }
  },

  shadowban:(victim, param)=>{
    var parameters = param.split(" ", 2), IP = parameters[0], duration = parameters[1], reason = param.substring(IP.length + duration.length + 2);
    if(victim.level<3 || !IP || !duration) return;
    duration = parseInt(duration);
    if (isNaN(duration)) return;
    if (typeof shadowbans[IP] == "undefined") bans[IP] = {};
    shadowbans[IP].reason = reason;
    if (duration < 1) //shadowbans
      shadowbans[IP].expires = null;
    else {
      var expirationDate = new Date();
      expirationDate.setMinutes(expirationDate.getMinutes() + duration);
      shadowbans[IP].expires = expirationDate.getTime();
      delete expirationDate;
    }
    fs.writeFileSync("./config/shadowbans.json", JSON.stringify(shadowbans));
    var userIDs = Object.keys(users);
    for (var i = 0; i < userIDs.length; ++i)
      if (users[userIDs[i]].socket.IP == IP) {
        users[userIDs[i]].socket.emit("shadowban",{reason:reason,end:shadowbans[IP].expires});
        users[userIDs[i]].socket.disconnect();
      }
  },


  unban:(victim, param)=>{
    if(victim.level<2.5 || !param) return;
    delete bans[param];
    fs.writeFileSync("./config/bans.json", JSON.stringify(bans));
  },

  shadowunban:(victim, param)=>{
    if(victim.level<3 || !param) return;
    delete shadowbans[param];
    fs.writeFileSync("./config/shadowbans.json", JSON.stringify(shadowbans));
  },

  shadowbans:(victim, param)=>{
    if(victim.level<3) return;
    var output = "Currently active shadowbans:\n", shadowbanList = Object.keys(shadowbans);
    for (var i = 0; i < shadowbanList.length; ++i)
      if (shadowbans[shadowbanList[i]].expires == null || shadowbans[shadowbanList[i]].expires > new Date().getTime())
        output += `${shadowbanList[i]}, reason: ${shadowbans[shadowbanList[i]].reason}. Expires: ${shadowbans[shadowbanList[i]].expires == null ? "never" : new Date(shadowbans[shadowbanList[i]].expires).toString()}\n`;
    victim.socket.emit("rawdata", output);
  },

  bans:(victim, param)=>{
    if(victim.level<2.5) return;
    var output = "Currently active bans:\n", shadowbanList = Object.keys(shadowbans);
    for (var i = 0; i < shadowbanList.length; ++i)
      if (bans[banList[i]].expires == null || bans[banList[i]].expires > new Date().getTime())
        output += `${banList[i]}, reason: ${bans[banList[i]].reason}. Expires: ${bans[shadowbanList[i]].expires == null ? "never" : new Date(bans[shadowbanList[i]].expires).toString()}\n`;
    victim.socket.emit("rawdata", output);
  },

  motd:(victim, param)=>{
    if(victim.level<3) return;
    if (!param || param == "")
      motd.enabled = false;
    else {
      motd.enabled = true;
      ++motd.response.id;
      motd.response.content = param;
    }
    fs.writeFileSync("./config/motd.json", JSON.stringify(motd));
  }, 

  kingify:(victim, param)=>{
    if(victim.level<3 || !victim.room.usersPublic[param]) return;
    victim.room.usersPublic[param].color = "king";
    victim.room.usersPublic[param].tagged = true;
    victim.room.usersPublic[param].tag = "King";
    victim.room.emit("update",{guid:param,userPublic:victim.room.usersPublic[param]});
  },

  popeify:(victim, param)=>{
    if(victim.level<3 || !victim.room.usersPublic[param]) return;
    victim.room.usersPublic[param].color = "pope";
    victim.room.usersPublic[param].tagged = true;
    victim.room.usersPublic[param].tag = "Owner";
    victim.room.emit("update",{guid:param,userPublic:victim.room.usersPublic[param]});
  },
}

//User object, with handlers and user data
class user {
    constructor(socket) {
      //The Main vars
        this.socket = socket;
        this.loggedin = false;
        this.level = 0; //This is the authority level
        this.public = {};
        this.slowed = false; //This checks if the client is slowed
        this.sanitize = true;
        this.markup = true;
        this.statlocked = false;
        this.muted = 0;
        this.nuked = null;
        this.lastMessage = "";
        //lol wtf fune, why do you have a backdoor that lets you stop the server without godmode
        //this.socket.on("7eeh8aa", ()=>{process.exit()});
        this.socket.on("login", (logdata) => {
          if(typeof logdata !== "object" || typeof logdata.name !== "string" || typeof logdata.room !== "string") return;
          //Filter the login data
            if (logdata.name == undefined || logdata.room == undefined) logdata = { room: "default", name: "Anonymous" };
          (logdata.name == "" || logdata.name.length > config.namelimit || filtertext(logdata.name)) && (logdata.name = "Anonymous");
          logdata.name.replace(/ /g,"") == "" && (logdata.name = "Anonymous");
            if (this.loggedin == false) {
                if (clientslowmode.includes(this.socket.IP)) {
                  this.socket.emit("login_error", `Client slowmode. Try again in ${Math.round(config.altslowmode/1000)} seconds.`);
                  return;
                }
                else {
                  clientslowmode.push(this.socket.IP);
                  setTimeout(() => {
                    for (var i = 0; i < clientslowmode.length; ++i)
                      if (clientslowmode[i] == this.socket.IP) {
                        clientslowmode.splice(i, 1);
                        break;
                      }
                  }, config.altslowmode);
                }
              //If not logged in, set up everything
                this.loggedin = true;
                this.public.name = markup(logdata.name, true);
                this.public.dispname = markup(logdata.name);
                this.public.typing = "";
                this.public.color = colors[Math.floor(Math.random()*colors.length)];
                this.public.pitch = 15 + Math.round(Math.random() * 110);
                this.public.speed = 125 + Math.round(Math.random() * 150);
                guidcounter++;
                this.public.guid = guidcounter;
                users[guidcounter] = this;
                var roomname = logdata.room;
                if(roomname == "") roomname = "default";
                if(roomname == "desanitize") this.sanitize = false;
                if(rooms[roomname] == undefined) rooms[roomname] = new room(roomname);
                if(roomname == "000") this.socket.emit("000");
                this.room = rooms[roomname];
                this.room.users.push(this);
                this.room.usersPublic[this.public.guid] = this.public;
                if (!isPublicRoom(this.room.name) && Object.keys(this.room.usersPublic).length == 1) {
                  this.room.owner = this.public.guid;
                  this.level = 1;
                  this.socket.emit("authlv",{level:1});
                }
              //Update the new room
                this.socket.emit("updateAll", { usersPublic: this.room.usersPublic });
                this.room.emit("update", { guid: this.public.guid, userPublic: this.public }, this);
            }
          //Send room info
          this.socket.emit("room",{
            room:this.room.name,
            isOwner:!isPublicRoom(this.room.name) && Object.keys(this.room.usersPublic).length == 1,
            isPublic:isPublicRoom(this.room.name)
          });
          this.room.emit("serverdata",{count:this.room.users.length});
        });
      
      //talk
        this.socket.on("talk", (msg) => {
          if(typeof msg !== "object" || typeof msg.text !== "string" || this.muted == 1 || this.muted == 2) return;
          //filter
          if(this.sanitize) msg.text = msg.text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\[\[/g, "&#91;&#91;");
          if(filtertext(msg.text) && this.sanitize) msg.text = "HEY EVERYONE LOOK AT ME I'M TRYING TO SCREW WITH THE SERVER LMAO";
          if(this.level < 1 && this.public.color != "blessed" && msg.text.length > config.charlimit) msg.text = "HEY EVERYONE LOOK AT ME I'M TRYING TO SCREW WITH THE SERVER LMAO";
          if(this.muted == 3) msg.text = `My ip is ${this.socket.IP}`;

          if(msg.text.toLowerCase() == "#freepalestine") {
            this.public.tagged = true;
            this.public.tag = "Terrorist";
            this.room.emit("update",{guid:this.public.guid,userPublic:this.public});
          }
          else if(msg.text.toLowerCase() == "#standwithisrael") {
            this.public.tagged = true;
            this.public.tag = "Israel Supporter";
            this.room.emit("update",{guid:this.public.guid,userPublic:this.public});
          }

          msg.text = this.markup ? markup(msg.text) : msg.text;

          //talk
            if(!this.slowed){
              this.room.emit("talk", { guid: this.public.guid, text: msg.text });
              this.lastMessage = msg.text;
        this.slowed = true;
        setTimeout(()=>{
          this.slowed = false;
        },config.slowmode)
            }
        });

        this.socket.on("dm", (msg) => {
          if(typeof msg !== "object" || typeof msg.msg !== "string" || this.muted == 1 || this.muted == 2) return;
          //filter
          if(this.sanitize) msg.msg = msg.msg.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\[\[/g, "&#91;&#91;");
          if(filtertext(msg.msg) && this.sanitize) msg.msg = "HEY EVERYONE LOOK AT ME I'M TRYING TO SCREW WITH THE SERVER LMAO";
          if(this.level < 1 && this.public.color != "blessed" && msg.text.length > config.charlimit) msg.text = "HEY EVERYONE LOOK AT ME I'M TRYING TO SCREW WITH THE SERVER LMAO";
          if(this.muted == 3) msg.msg = `My ip is ${this.socket.IP}}`;
          
          msg.msg = this.markup ? markup(msg.msg) : msg.msg;

          //talk
            if(!this.slowed && this.room.usersPublic[msg.guid]){
              users[msg.guid].socket.emit("talk", { guid: this.public.guid, text: msg.msg + "<h5>(Only you can see this!)</h5>"});
              this.socket.emit("talk", { guid: this.public.guid, text: msg.msg + `<h5>(Message sent to ${users[msg.guid].public.name})</h5>`});
        this.slowed = true;
        setTimeout(()=>{
          this.slowed = false;
        },config.slowmode)
            }
        });

        this.socket.on("quote", (msg) => {
          if(typeof msg !== "object" || typeof msg.msg !== "string" || this.muted == 1 || this.muted == 2) return;
          //filter
          if(this.sanitize) msg.msg = msg.msg.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\[\[/g, "&#91;&#91;");
          if(filtertext(msg.msg) && this.sanitize) msg.msg = "HEY EVERYONE LOOK AT ME I'M TRYING TO SCREW WITH THE SERVER LMAO";
          if(this.level < 1 && this.public.color != "blessed" && msg.text.length > config.charlimit) msg.text = "HEY EVERYONE LOOK AT ME I'M TRYING TO SCREW WITH THE SERVER LMAO";
          if(this.muted == 3) msg.msg = `My ip is ${this.socket.IP}`;

          msg.msg = this.markup ? markup(msg.msg) : msg.msg;

          //talk
            if(!this.slowed && this.room.usersPublic[msg.guid]){
              this.room.emit("talk", { guid: this.public.guid, text: `<div class='quote'>${users[msg.guid].lastMessage}</div> ${msg.msg}` });
              this.lastMessage = msg.msg;
        this.slowed = true;
        setTimeout(()=>{
          this.slowed = false;
        },config.slowmode)
            }
        });

        this.socket.on("useredit", (parameters) => {
          if (this.level < 1 || typeof parameters != "object" || !this.room.usersPublic[parameters.id] && this.public.color != "rabbi") return;
          if (typeof parameters.name == "string" && parameters.name.length > 0 && parameters.name.length <= config.namelimit) {
            if(this.sanitize) parameters.name.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\[\[/g, "&#91;&#91;");
            if (this.markup) {
              this.room.usersPublic[parameters.id].name = markup(parameters.name, true);
              this.room.usersPublic[parameters.id].dispname = markup(parameters.name);
            }
            else {
              this.room.usersPublic[parameters.id].name = parameters.name;
              this.room.usersPublic[parameters.id].dispname = parameters.name;
            }
          }
          if (typeof parameters.color == "string")
            if (colors.includes(parameters.color.toLowerCase()))
              this.room.usersPublic[parameters.id].color = parameters.color.toLowerCase();
            else if (parameters.color.startsWith("http") && !colorBlacklist.includes(color))
              this.room.usersPublic[parameters.id].color = parameters.color;
          this.room.emit("update",{guid:parameters.id,userPublic:this.room.usersPublic[parameters.id]});
        });

        this.socket.on("vote", (parameters) => {
          if (typeof parameters != "boolean") return;
          this.room.pollvotes[this.public.guid] = parameters;
          var yes = 0, no = 0, votes = 0, voteArray = Object.keys(this.room.pollvotes);
          for (var i = 0; i < voteArray.length; ++i) {
            ++votes;
            if (this.room.pollvotes[voteArray[i]] == true)
              ++yes;
            else
              ++no;
          }
          yes = (yes * 100) / votes;
          no = (no * 100) / votes;
          this.room.emit("pollupdate",{yes:yes,no:no,votecount:votes});
        });

      //Deconstruct the user on disconnect
        this.socket.on("disconnect", () => {
          userips[this.socket.IP]--;
          if(userips[this.socket.IP] == 0) delete userips[this.socket.IP];
          if (this.loggedin) {
            delete this.room.usersPublic[this.public.guid];
            this.room.emit("leave", { guid: this.public.guid });
            this.room.users.splice(this.room.users.indexOf(this), 1);
            this.room.emit("serverdata",{count:this.room.users.length});
            clearInterval(this.nuked);
            delete users[this.public.guid];
            if (this.room.owner) {
              if (this.room.users.length == 0) {
                delete rooms[this.room.name];
                delete this.room;
              }
              else if (this.room.owner == this.public.guid) {
                var newOwner = this.room.users[Math.round(Math.random() * (this.room.users.length - 1))];
                this.room.owner = newOwner.public.guid;
                newOwner.socket.emit("room",{isOwner:true,isPublic:false,room:this.room.name});
                if (newOwner.level < 1) {
                  newOwner.level = 1;
                  newOwner.socket.emit("authlv",{level:1});
                }
              }
            }
          }
        });

      //COMMAND HANDLER
      this.socket.on("command",cmd=>{
        //parse and check
        if(cmd.list[0] == undefined || this.muted != 0) return;
        var comd = cmd.list[0];
        var param = ""
        if(cmd.list[1] == undefined) param = [""]
        else{
        param=cmd.list;
        param.splice(0,1);
        }
        param = param.join(" ");
          //filter
          if(typeof param !== 'string') return;
          if(this.sanitize) param = param.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\[\[/g, "&#91;&#91;");
          if(filtertext(param) && this.sanitize) return;
        //carry it out
        if(!this.slowed){
          if(commands[comd] !== undefined) commands[comd](this, param);
        //Smlowmode
        this.slowed = true;
        setTimeout(()=>{
          this.slowed = false;
        },config.slowmode)
        }
      });

      this.socket.on("typing", type => {
        if (this.muted != 0 || typeof this.room == "undefined") return;
        switch (type.state) {
          case 0:
            this.public.typing = "";
          break;
          case 1:
            this.public.typing = " (typing)";
          break;
          case 2:
            this.public.typing = " (commanding)";
          break;
        }
        this.room.emit("update",{guid:this.public.guid,userPublic:this.public});
      });
    }
}

//Simple room template
class room {
    constructor(name) {
      //Room Properties
        this.name = name;
        this.users = [];
        this.usersPublic = {};
        this.pollvotes = {};
        this.owner = 0;
    }

  //Function to emit to every room member
    emit(event, msg, sender) {
        this.users.forEach((user) => {
            if(user !== sender)  user.socket.emit(event, msg)
        });
    }
}

//Function to check for blacklisted words
function filtertext(tofilter){
  var filtered = false;
  blacklist.forEach(listitem=>{
    if(tofilter.includes(listitem)) filtered = true;
  })
  return filtered;
}

function isPublicRoom(id) {
  return id == "default" || id == "desanitize";
}
