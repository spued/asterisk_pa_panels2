const fs = require("fs");
const _ = require("lodash");
const userModel = require("../models/users");
var sip = require("sip");
var sip_digest = require("sip/digest");
var sip_sdp = require("sip/sdp");
const { spawn } = require("child_process");
const path = require("path");

var udp_out_port = process.env.UDP_OUT_PORT;

const api_radio_play = (data) => {
  console.log("Controller: api radio: Play = " + data.location_number);
  var dialogs = {};
  var context = {};

  var _public_address = process.env.PUBLIC_IP;
  var _caller_username = data.sip_username;
  var _caller_password = data.sip_password;
  var _callee_number = data.location_number;
  var _hostname = "astrapa.nt-acs.net";
  var _station_url = data.station_url;
  var _play_time = parseInt(data.play_duration);
  // get global port
  udp_out_port++;
  if (udp_out_port > process.env.MAX_UDP_OUT_PORT)
    udp_out_port = process.env.UDP_OUT_PORT;

  const wave_file = path.join(
    __dirname,
    "..",
    "uploads",
    "stations",
    "station_" + data.location_number + ".wav"
  );
  console.log("-- Wave file = " + wave_file);

  function rstring() {
    return Math.floor(Math.random() * 1e8).toString();
  }

  console.log(
    "-- radio player: start SIP = " + _public_address + ":" + udp_out_port
  );
  //starting stack
  sip.start(
    {
      publicAddress: _public_address,
      port: udp_out_port,
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
      "a=rtpmap:8 PCMA/8000/1\r\n" +
      "a=rtpmap:0 PCMU/8000\r\n" +
      "a=rtpmap:9 G722/8000\r\n" +
      "a=rtpmap:10 L16/8000\r\n" +
      "a=rtpmap:101 telephone-event/8000\r\n" +
      "a=fmtp:101 0-15\r\n" +
      "a=ptime:20\r\n" +
      "a=send\r\n",
  };

  sip.send(call_request, function (call_request_result) {
    //console.log(call_request_result);
    if (call_request_result.status >= 300) {
      //console.log('- Call failed with status ' + call_request_result.status);
      if (
        call_request_result.status == 401 ||
        call_request_result.status == 407
      ) {
        //console.log('- Call need authentication ' + call_request_result.status);
        call_request.headers.via.pop();
        //call_request.headers.cseq.seq++;

        sip_digest.signRequest(context, call_request, call_request_result, {
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
            //console.log('-- Call OK :' + remote_sdp.o.address + ' : '+remote_sdp.m[0].port);
            // yes we can get multiple 2xx response with different tags
            //console.log('- Call answered with tag ' + res.headers.to.params.tag);

            // sending ACK
            sip.send({
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
            });
            //start send stream
            console.log(
              "-- Start cmd VLC stream to = " +
                remote_sdp.o.address +
                ":" +
                remote_sdp.m[0].port
            );
            let vlc_cmd = "";
            let cmdRec = undefined;
            let cmdPlay = undefined;

            if (process.env.NODE_ENV == "development") {
              vlc_cmd = "C:\\Program Files\\VideoLAN\\VLC\\vlc.exe";
            } else {
              vlc_cmd = "/usr/bin/cvlc";
            }

            function timeout(ms) {
              return new Promise((resolve) => setTimeout(resolve, ms));
            }

            cmdRec = spawn(vlc_cmd, [
              "-I DUMMY",
              "--sout-keep",
              "--network-caching=1500",
              _station_url,
              "--sout=#transcode{vcodec=none,acodec=s16l,ab=16,channels=1,samplerate=8000,scodec=none}:std{access=file,dst=" +
                wave_file +
                "}",
            ]);
            timeout(5000).then(() => {
              cmdPlay = spawn(vlc_cmd, [
                "-I DUMMY",
                "--sout-keep",
                "--network-caching=1000",
                wave_file,
                "--sout=#transcode{vcodec=none,acodec=alaw,ab=16,channels=1,samplerate=8000,scodec=none}:rtp{dst=" +
                  remote_sdp.o.address +
                  ",port-audio=" +
                  remote_sdp.m[0].port +
                  "}",
              ]);

              cmdPlay.stdout.on("data", (data) => {
                console.log(`stdout: ${data}`);
              });

              cmdPlay.stderr.on("data", (data) => {
                console.error(`stderr: ${data}`);
              });

              cmdPlay.on("close", (code) => {
                //console.log("-- Play stream " + `child process exited with code ${code}`);
                // sending ACK
                call_request.headers.cseq.seq++;
                sip.send(
                  {
                    method: "BYE",
                    uri: res.headers.contact[0].uri,
                    headers: {
                      to: res.headers.to,
                      from: res.headers.from,
                      "call-id": res.headers["call-id"],
                      cseq: {
                        method: "BYE",
                        seq: call_request.headers.cseq.seq,
                      },
                      via: [],
                    },
                    content: "",
                  },
                  function (bye_res) {
                    //console.log(bye_res);
                    if (bye_res.status == 200) {
                      sip.stop();
                    } else {
                      console.log(
                        "-- Error : " + bye_res.status + " " + bye_res.reason
                      );
                      sip.stop();
                    }
                  }
                );
              });
              setTimeout(function () {
                if (cmdPlay !== undefined) cmdPlay.kill();
              }, (_play_time + 1) * 1000);
            });

            setTimeout(function () {
              if (cmdRec !== undefined) cmdRec.kill();
            }, (_play_time + 1) * 1000);

            var id = [
              res.headers["call-id"],
              res.headers.from.params.tag,
              res.headers.to.params.tag,
            ].join(":");

            // registring our 'dialog' which is just function to process in-dialog requests
            //console.log('id = ' + id);
            if (!dialogs[id]) {
              dialogs[id] = function (req) {
                //console.log(req);
                if (req.method === "BYE") {
                  console.log("- Call BYE received");
                  delete dialogs[id];
                  sip.send(sip.makeResponse(req, 200, "Ok"));
                  sip.stop();
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

const api_player_play = (data, res) => {
  console.log("Controller: api player: Play = " + data.location_name);
  var dialogs = {};
  var context = {};

  var _public_address = data.public_address;
  var _caller_username = data.sip_username;
  var _caller_password = data.sip_password;
  var _callee_number = data.location_number;
  var _hostname = data.location_hostname;
  var _wavfilename = "./uploads/wav/" + data.filename + "_wav";
  var _play_time = data.play_duration;
  // get global port
  udp_out_port++;
  if (udp_out_port > process.env.MAX_UDP_OUT_PORT)
    udp_out_port = process.env.UDP_OUT_PORT;

  function rstring() {
    return Math.floor(Math.random() * 1e8).toString();
  }
  console.log(
    "-- schedule player: start SIP = " + _public_address + ":" + udp_out_port
  );
  //starting stack
  sip.start(
    {
      publicAddress: _public_address,
      port: udp_out_port,
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
      "a=rtpmap:0 PCMU/8000\r\n" +
      "a=rtpmap:9 G722/8000\r\n" +
      "a=rtpmap:10 L16/8000\r\n" +
      "a=rtpmap:101 telephone-event/8000\r\n" +
      "a=fmtp:101 0-15\r\n" +
      "a=ptime:20\r\n" +
      "a=send\r\n",
  };

  sip.send(call_request, function (call_request_result) {
    //console.log(call_request_result);
    if (call_request_result.status >= 300) {
      //console.log('- Call failed with status ' + call_request_result.status);
      if (
        call_request_result.status == 401 ||
        call_request_result.status == 407
      ) {
        //console.log('- Call need authentication ' + call_request_result.status);
        call_request.headers.via.pop();
        //call_request.headers.cseq.seq++;

        sip_digest.signRequest(context, call_request, call_request_result, {
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
            //console.log('-- Call OK :' + remote_sdp.o.address + ' : '+remote_sdp.m[0].port);
            // yes we can get multiple 2xx response with different tags
            //console.log('- Call answered with tag ' + res.headers.to.params.tag);

            // sending ACK
            sip.send({
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
            });
            //start send stream
            //cmdVLCStream(remote_sdp.o.address, remote_sdp.m[0].port, _wavfilename, _play_time);

            console.log(
              "- Start cmd VLC stream to = " +
                remote_sdp.o.address +
                ":" +
                remote_sdp.m[0].port
            );
            let vlc_cmd = "";
            if (process.env.NODE_ENV == "development") {
              vlc_cmd = "C:\\Program Files\\VideoLAN\\VLC\\vlc.exe";
            } else {
              vlc_cmd = "/usr/bin/cvlc";
            }
            let cmdPlay = spawn(vlc_cmd, [
              "-I DUMMY",
              "--loop",
              "--sout-keep",
              "--network-caching=1500",
              _wavfilename,
              "--sout=#gather:transcode{acodec=alaw,ab=64,scale=1,channels=1,samplerate=8000}:rtp{dst=" +
                remote_sdp.o.address +
                ",port-audio=" +
                remote_sdp.m[0].port +
                "}",
            ]);
            cmdPlay.stdout.on("data", (data) => {
              //console.log(`stdout: ${data}`);
            });

            cmdPlay.stderr.on("data", (data) => {
              //console.error(`stderr: ${data}`);
            });

            cmdPlay.on("close", (code) => {
              //console.log("-- Play stream " + `child process exited with code ${code}`);
              // sending ACK
              call_request.headers.cseq.seq++;
              sip.send(
                {
                  method: "BYE",
                  uri: res.headers.contact[0].uri,
                  headers: {
                    to: res.headers.to,
                    from: res.headers.from,
                    "call-id": res.headers["call-id"],
                    cseq: { method: "BYE", seq: call_request.headers.cseq.seq },
                    via: [],
                  },
                  content: "",
                },
                function (bye_res) {
                  //console.log(bye_res);
                  if (bye_res.status == 200) {
                    sip.stop();
                  } else {
                    console.log(
                      "-- Error : " + bye_res.status + " " + bye_res.reason
                    );
                    sip.stop();
                  }
                }
              );
            });
            setTimeout(function () {
              cmdPlay.kill();
            }, (_play_time + 1) * 1000);

            var id = [
              res.headers["call-id"],
              res.headers.from.params.tag,
              res.headers.to.params.tag,
            ].join(":");

            // registring our 'dialog' which is just function to process in-dialog requests
            //console.log('id = ' + id);
            if (!dialogs[id]) {
              dialogs[id] = function (req) {
                //console.log(req);
                if (req.method === "BYE") {
                  console.log("- Call BYE received");
                  delete dialogs[id];
                  sip.send(sip.makeResponse(req, 200, "Ok"));
                  sip.stop();
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

const api_player_location_id = (req, res) => {
  console.log("Controller: API: Play file for user = " + req.body.user_id);
  let resData = {
    code: 1,
    msg: "Default error",
  };
  userModel
    .find({
      _id: req.body.user_id,
    })
    .then((user) => {
      //console.log(user);
      if (user.length >= 0) {
        let _user = user[0];
        let _duration = parseInt(req.body.duration);
        if (_duration <= 0) _duration = 5;
        let _play_data = {
          public_address: process.env.PUBLIC_IP,
          sip_username: _user.sip_account,
          sip_password: _user.sip_password,
          location_number: req.body.location,
          location_hostname: "astrapa.nt-acs.net",
          location_name: _user.location,
          filename: req.body.filename,
          play_duration: _duration,
        };
        //console.log(_play_data);
        api_player_play(_play_data, (_res) => {});
        resData.code = 0;
        resData.msg = "ok";
        res.json(resData);
      } else {
        res.json(resData);
      }
    });
};
const api_player_key = (req, res) => {
  console.log("Controller: API: Play file for user = " + req.body.api_key);
  let resData = {
    code: 1,
    msg: "Default error",
  };
  console.log(req.body);
  userModel
    .find({
      api_key: req.body.api_key,
    })
    .then((user) => {
      //console.log(user);
      if (user.length >= 0) {
        let _user = user[0];
        let _duration = parseInt(req.body.duration);
        if (_duration <= 0) _duration = 5;
        let _play_data = {
          public_address: process.env.PUBLIC_IP,
          sip_username: _user.sip_account,
          sip_password: _user.sip_password,
          location_number: req.body.location,
          location_hostname: "astrapa.nt-acs.net",
          location_name: _user.location,
          filename: req.body.filename,
          play_duration: _duration,
        };
        //console.log(_play_data);
        api_player_play(_play_data, (_res) => {});
        resData.code = 0;
        resData.msg = "ok";
        res.json(resData);
      } else {
        res.json(resData);
      }
    });
};
module.exports = {
  api_player_play,
  api_radio_play,
  api_player_location_id,
  api_player_key,
};
