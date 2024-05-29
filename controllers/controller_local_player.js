const path = require("path");
const fs = require("fs");
const uuid = require("uuid");
const locationModel = require("../models/locations");
const fileModel = require("../models/files_store");
const scheduleModel = require("../models/location_schedule");
var sip = require("sip");
var sip_digest = require("sip/digest");
var sip_sdp = require("sip/sdp");

const { spawn } = require("child_process");

var os = require("os");
var util = require("util");

const { authenticate } = require("passport");
// Require dgram module.
var dgram = require("dgram");
var Buffer = require("buffer").Buffer;
var RtpPacket = require("../utils/rtppacket").RtpPacket;

const dotenv = require("dotenv").config();
var ami = new require("asterisk-manager")(
  process.env.ASTERISK_MANAGER_PORT,
  process.env.ASTERISK_MANAGER_HOST,
  process.env.ASTERISK_MANAGER_USER,
  process.env.ASTERISK_MANAGER_PASSWORD,
  true
);

ami.keepConnected();
const load_schedule = (req, res) => {
  console.log("Controller: Load schedule: for user = " + req.body.user_id);
  //console.log(req.body);
  resData = {
    code: 1,
    message: "default",
  };
  scheduleModel.find(
    {
      owner: req.body.user_id,
    },
    (err, docs) => {
      //console.log(docs);
      resData.data = docs;
      resData.code = 0;
      resData.message = "ok";
      res.json(resData);
    }
  );
};
const save_schedule = (req, res) => {
  console.log("Controller: Save schedule: " + req.body.type);
  resData = {
    code: 1,
    message: "default",
  };
  console.log(req.body);
  let _status = 0;
  if (req.body.nation_enable != 0 || req.body.local_enable != 0) _status = 1;
  let _time = req.body.play_time;
  if (req.body.type == "nation_schedule") _time = "08:00,09:00";
  scheduleModel.updateOne(
    {
      uuid: req.body.record_id,
    },
    {
      $setOnInsert: {
        uuid: uuid.v1().replace(/-/g, ""),
        name: req.body.name,
        type: req.body.type,
        owner: req.body.owner,
        sip_username: req.body.sip_username,
        sip_password: req.body.sip_password,
        hostname: "astrapa.nt-acs.net",
        location_list: req.body.location_list,
        number_list: req.body.number_list,
        filename: req.body.filename,
        play_time: _time,
        play_duration: req.body.play_duration,
        priority: req.body.priority,
        status: _status,
      },
    },
    { upsert: true },
    (err, res) => {
      console.log(res);
      resData.code = 0;
      resData.message = "ok";
    }
  );
  res.json(resData);
};
const local_player_play_ami = (req, res) => {
  console.log("Controller: local player: Play = " + req.body.name);
  var originateRequest = {
    action: "Originate",
    channel: "PJSIP/1005",
    callerid: "APACHE",
    Exten: "1900002",
    Context: "custom_test",
    Variable: "ActionID=PlayBack",
    //Variable: 'WhatToPlay=custom/support_queue',
    //Variable: 'WhoHear=Local/1001',
    Priority: "1",
    ActionID: "PlayBack",
    Async: "yes",
  };

  ami.action(originateRequest, (err, res) => {
    console.log("- Call was made");
    if (err) console.log(err);
    //console.log(res);
  });
  //console.log(req.user.prefix);
  ami.on("managerevent", function (evt) {
    console.log(evt);
    if (evt.event == "Hangup") {
      console.log("- Originate call: complete: Hang up");
      ami.removeAllListeners("managerevent");
    }
  });
  return 0;
};
const local_player_play = (req, res) => {
  console.log("Controller: local player: Play = " + req.body.name);
  var dialogs = {};
  var context = {};

  var _public_address = "1.0.135.146";
  var _caller_username = "1001";
  var _caller_password = "cb73c85d44179be443dfbcad60e06234";
  var _callee_number = "1005";
  var _hostname = "astrapa.nt-acs.net";
  var _wavfilename = "./uploads/wav/thai_nation_v1.wav";
  var _play_time = 40;

  function rstring() {
    return Math.floor(Math.random() * 1e8).toString();
  }

  function sendStream(ip, port) {
    console.log("- Start send stream to = " + ip + ":" + port);
    var sock, rtp, buf, bytesRead;
    var fd = fs.openSync("./uploads/voicefile-1644292652982.wav", "r");

    if (!fd) {
      console.log("-- Failed to initialize sound file.");
    }
    var buf = Buffer.alloc(160);
    var intvl = setInterval(sendData, 20);
    function sendData() {
      if ((bytesRead = fs.readSync(fd, buf, 0, buf.length)) > 0) {
        if (!rtp) rtp = new RtpPacket(buf);
        else rtp.payload = buf;
        rtp.time += buf.length;
        rtp.seq++;
        if (!sock) sock = dgram.createSocket("udp4");
        sock.send(rtp.packet, 0, rtp.packet.length, port, ip);
      } else {
        console.log("-- Close stream to = " + ip + ":" + port);
        if (intvl) clearInterval(intvl);
        fs.closeSync(fd);
        if (sock) sock.close(); // dgram module automatically listens on the port even if we only wanted to send... -_-
      }
    }
  }
  function relayStream(ip, port) {
    console.log("- Start RELAY stream to = " + ip + ":" + port);
  }
  function cmdVLCStream(ip, port, filename, play_time) {
    console.log("- Start cmd VLC stream to = " + ip + ":" + port);
    var vlc_cmd = "";
    if ((process.env.NODE_ENV = "development")) {
      vlc_cmd = "C:\\Program Files\\VideoLAN\\VLC\\vlc.exe";
    } else {
      vlc_cmd = "/usr/bin/cvlc";
    }
    let cmdPlay = spawn(vlc_cmd, [
      "-I DUMMY",
      "--loop",
      "--sout-keep",
      "--network-caching=1500",
      filename,
      "--sout=#gather:transcode{acodec=alaw,ab=64,scale=1,channels=1,samplerate=8000}:rtp{dst=" +
        ip +
        ",port-audio=" +
        port +
        "}",
    ]);
    cmdPlay.stdout.on("data", (data) => {
      //console.log(`stdout: ${data}`);
    });

    cmdPlay.stderr.on("data", (data) => {
      //console.error(`stderr: ${data}`);
    });

    cmdPlay.on("close", (code) => {
      console.log("-- Play stream " + `child process exited with code ${code}`);
    });

    setTimeout(function () {
      cmdPlay.kill();
    }, play_time * 1000);
  }
  //starting stack
  sip.start(
    {
      publicAddress: _public_address,
      port: 15060,
      tcp: false,
    },
    function (rq) {
      if (rq.headers.to.params.tag) {
        // check if it's an in dialog request
        var id = [
          rq.headers["call-id"],
          rq.headers.to.params.tag,
          rq.headers.from.params.tag,
        ].join(":");

        if (dialogs[id]) dialogs[id](rq);
        else sip.send(sip.makeResponse(rq, 481, "- Call doesn't exists"));
      } else sip.send(sip.makeResponse(rq, 405, "- Method not allowed"));
    }
  );

  // Making the call
  var call_request = {
    method: "INVITE",
    uri: "sip:" + _callee_number + "@" + _hostname,
    headers: {
      contact: [
        {
          name: _caller_username,
          uri: "sip:" + _caller_username + "@" + _hostname,
        },
      ],
      to: {
        name: _callee_number,
        uri: "sip:" + _callee_number + "@" + _hostname,
      },
      from: {
        name: _caller_username,
        uri: "sip:" + _caller_username + "@" + _hostname,
        params: { tag: rstring() },
      },
      "call-id": rstring(),
      cseq: { method: "INVITE", seq: Math.floor(Math.random() * 1e5) },
      "content-type": "application/sdp",
      allow:
        "INVITE, ACK, CANCEL, BYE, NOTIFY, REFER, MESSAGE, OPTIONS, INFO, SUBSCRIBE",
      "user-agent": "Node sip RJ.0.0.01",
      "allow-events": "presence, kpml, talk",
      "max-forwards": 70,
    },
    content:
      "v=0\r\n" +
      "o=- 1647586684811 1 IN IP4 " +
      _public_address +
      "\r\n" +
      "s=-\r\n" +
      "c=IN IP4 " +
      _public_address +
      "\r\n" +
      "t=0 0\r\n" +
      "m=audio 18000 UDP/TLS/RTP/SAVPF 8 101\r\n" +
      "a=rtpmap:8 PCMA/8000\r\n" +
      //'a=rtpmap:0 PCMU/8000\r\n'+
      //'a=rtpmap:9 G722/8000\r\n' +
      //'a=rtpmap:10 L16/8000\r\n' +
      "a=rtpmap:101 telephone-event/8000\r\n" +
      "a=fmtp:101 0-15\r\n" +
      "a=ptime:20\r\n" +
      "a=send\r\n",
  };

  sip.send(call_request, function (rs) {
    //console.log(rs);
    if (rs.status >= 300) {
      console.log("- Call failed with status " + rs.status);
      if (rs.status == 401 || rs.status == 407) {
        console.log("- Call need authentication " + rs.status);
        call_request.headers.via.pop();
        call_request.headers.cseq.seq++;

        sip_digest.signRequest(context, call_request, rs, {
          user: _caller_username,
          password: _caller_password,
        });
        sip.send(call_request, function (res) {
          //console.log(res.content);
          let remote_sdp = sip_sdp.parse(res.content);
          //console.log(remote_sdp);
          if (res.status >= 200 && res.status < 300) {
            if (!sip_digest.authenticateResponse(context, res) == false) {
              console.log("-- Call authentication credential failed");
            }
            console.log(
              "-- Call OK :" +
                remote_sdp.o.address +
                " : " +
                remote_sdp.m[0].port
            );
            // yes we can get multiple 2xx response with different tags
            console.log(
              "- Call answered with tag " + res.headers.to.params.tag
            );

            // sending ACK
            sip.send(
              {
                method: "ACK",
                uri: res.headers.contact[0].uri,
                headers: {
                  to: res.headers.to,
                  from: res.headers.from,
                  "call-id": res.headers["call-id"],
                  cseq: { method: "ACK", seq: res.headers.cseq.seq },
                  "content-type": "application/sdp",
                  via: [],
                },
                content: "",
              },
              function (res) {}
            );

            cmdVLCStream(
              remote_sdp.o.address,
              remote_sdp.m[0].port,
              _wavfilename,
              _play_time
            );
            var id = [
              res.headers["call-id"],
              res.headers.from.params.tag,
              res.headers.to.params.tag,
            ].join(":");

            // registring our 'dialog' which is just function to process in-dialog requests
            //console.log('id = ' + id);
            if (!dialogs[id]) {
              dialogs[id] = function (req) {
                if (req.method === "BYE") {
                  console.log("- Call BYE received");
                  delete dialogs[id];
                  sip.send(sip.makeResponse(req, 200, "Ok"));
                  server.close();
                } else if (req.method === "OPTIONS") {
                  console.log("call OPTIONS received");
                  sip.send(sip.makeResponse(req, 200, "Ok"));
                } else {
                  sip.send(sip.makeResponse(req, 405, "Method not allowed"));
                }
              };
            }
          }
        });
      }
    } else if (rs.status >= 200 && res.status < 300) {
      if (!sip_digest.authenticateResponse(context, res) == false) {
        console.log("-- Call authentication credential failed");
      }
      console.log("-- Call OK");
    } else if (rs.status < 200) {
      console.log("call progress status " + rs.status);
    }
  });
  return 0;
};
const local_player_register = (req, res) => {
  console.log("Controller: local player: Register = " + req.body.name);
  var dialogs = {};
  function rstring() {
    return Math.floor(Math.random() * 1e6).toString();
  }

  //starting stack
  sip.start(
    {
      tcp: false,
      port: 15060,
    },
    function (rq) {
      if (rq.headers.to.params.tag) {
        // check if it's an in dialog request
        var id = [
          rq.headers["call-id"],
          rq.headers.to.params.tag,
          rq.headers.from.params.tag,
        ].join(":");
        if (dialogs[id]) dialogs[id](rq);
        else sip.send(sip.makeResponse(rq, 481, "Call doesn't exists"));
      } else if (req.method === "OPTIONS") {
        console.log("call OPTIONS received");
        sip.send(sip.makeResponse(req, 200, "Ok"));
      } else sip.send(sip.makeResponse(rq, 405, "Method not allowed"));
    }
  );

  // Making the register call
  var register_request = {
    method: "REGISTER",
    uri: "sip:astrapa.nt-acs.net",
    headers: {
      to: {
        name: "1001",
        uri: "sip:1001@astrapa.nt-acs.net",
      },
      from: {
        name: "1001",
        uri: "sip:1001@astrapa.nt-acs.net",
      },
      cseq: {
        method: "REGISTER",
        seq: Math.floor(Math.random() * 1e5),
      },
      "call-id": rstring(),
      contact: [
        { uri: "sip:1001@astrapa.nt-acs.net", params: { expires: 300 } },
      ],
      "content-length": 0,
      "user-agent": "NiceSipClient/1.0.0",
      allow:
        "INVITE,ACK,OPTIONS,BYE,CANCEL,SUBSCRIBE,NOTIFY,REFER,MESSAGE,INFO,PING",
      "max-forwards": 70,
    },
  };
  sip.send(register_request, function (rs) {
    if (rs.status == 401 || rs.status == 407) {
      console.log("- Register need authentication " + rs.status);
      //console.log(rs.headers['www-authenticate']);
      register_request.headers.via.pop();
      register_request.headers.cseq.seq++;
      var context = {};
      sip_digest.signRequest(context, register_request, rs, {
        user: "1001",
        password: "cb73c85d44179be443dfbcad60e06234",
      });
      //console.log(register_request);
      sip.send(register_request, (res) => {
        //console.log(res);
        if (res.status >= 200 && res.status < 300) {
          if (!sip_digest.authenticateResponse(context, res) == false) {
            console.log("-- Register authentication credential failed");
          }
          console.log("-- Register OK");
        } else {
          console.log("-- Register failed");
        }
      });
    } else if (rs.status < 400 && rs.status > 200) {
      console.log("Register failed with status " + rs.status);
    } else if (rs.status <= 200) {
      console.log("Register progress status " + rs.status);
    } else {
      console.log("Register answered with tag " + rs.headers.to.params.tag);
    }
  });

  return 0;
};
const local_player_unregister = (req, res) => {
  console.log("Controller: local player: UnRegister = " + req.body.name);
  if (sip.hasOwnProperty("stop")) {
    sip.stop();
  }
  return 0;
};
const local_player_view = (req, res) => {
  console.log("Controller: Get local player: ");
  console.log(req.user);
  res.render("daily", {
    user: req.user,
  });
};

module.exports = {
  local_player_register,
  local_player_unregister,
  local_player_play,
  local_player_play_ami,
  local_player_view,
  save_schedule,
  load_schedule,
};
