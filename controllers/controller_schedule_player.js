const fs = require("fs");
const _ = require("lodash");
const paScheduleModel = require("../models/pa_schedule");
var sip = require("sip");
var sip_digest = require("sip/digest");
var sip_sdp = require("sip/sdp");

const { spawn } = require("child_process");
var moment = require("moment");

var main_play_list = [];
var udp_out_port_state = [];
for (
  let port = process.env.UDP_OUT_PORT;
  port <= process.env.MAX_UDP_OUT_PORT;
  port++
) {
  udp_out_port_state.push({
    number: port,
    status: 0,
  });
}
const local_player_play = (data, res) => {
  console.log("Controller: schedule player: Play = " + data.location_name);
  var dialogs = {};
  var context = {};

  var _public_address = data.public_address; // public IP of server
  var _caller_username = data.sip_username; // call out number
  var _caller_password = data.sip_password; // call out password
  var _callee_number = data.location_number; // call out to number
  var _hostname = data.location_hostname; // host that call out
  var _wavfilename = "./uploads/wav/" + data.filename + "_wav"; // wav filename
  var _play_time = data.play_duration; // how long of this play.

  const _udp_outport_index = udp_out_port_state.findIndex(
    (port) => port.status == 0
  );
  if (_udp_outport_index == undefined) {
    console.log("Can not find UDP port out");
    return 1;
  }
  function rstring() {
    return Math.floor(Math.random() * 1e8).toString();
  }

  console.log(
    "-- schedule player: start SIP = " +
      _public_address +
      ":" +
      udp_out_port_state[_udp_outport_index].number
  );
  // Allocate this port
  udp_out_port_state[_udp_outport_index].status = 1;
  //starting stack
  sip.start(
    {
      publicAddress: _public_address,
      port: udp_out_port_state[_udp_outport_index].number,
      tcp: false,
    },
    function (sip_call_request) {
      if (sip_call_request.headers.to.params.tag) {
        // check if it's an in dialog request
        var id = [
          sip_call_request.headers["call-id"],
          sip_call_request.headers.to.params.tag,
          sip_call_request.headers.from.params.tag,
        ].join(":");

        if (dialogs[id]) dialogs[id](sip_call_request);
        else
          sip.send(
            sip.makeResponse(sip_call_request, 481, "- Call doesn't exists")
          );
      } else
        sip.send(
          sip.makeResponse(sip_call_request, 405, "- Method not allowed")
        );
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
              console.log("-- Call authentication failed");
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
            let cmdPlay = spawn(
              vlc_cmd,
              [
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
              ],
              { timeout: (_play_time + 1) * 1000 }
            );
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
              // Release this port
              udp_out_port_state[_udp_outport_index].status = 0;
              return 0;
            });
            // setTimeout(function () {
            //   cmdPlay.kill();
            // }, (_play_time + 1) * 1000);

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
        console.log("-- Call authentication failed");
      }
      console.log("-- Call OK");
    } else if (rs.status < 200) {
      console.log("call progress status " + rs.status);
    }
  });
};
const local_player_view = (req, res) => {
  console.log("Controller: Get schedule player: ");
  //console.log(req.user);
  res.render("daily", {
    user: req.user,
  });
};
const local_filter_schedule = () => {
  // filter the play list with priority
  console.log("Controller: Auto PA: Filter play list");
  if (main_play_list.length <= 0) return 0;
  var location_list = [];

  main_play_list.forEach(function (item) {
    //console.log(item.location_id);
    location_list.push(item.location_id);
  });
  //console.log(location_list);
  let _unique_location = _.uniq(location_list);
  //console.log(_unique_location);
  function filterItems(arr, query) {
    return arr.filter(function (el) {
      return el.location_id == query;
    });
  }
  _.forEach(_unique_location, function (location) {
    //console.log('Location = ' + location);
    let results = filterItems(main_play_list, location);
    if (results.length > 1) {
      console.log("-- multiple play in same location detected");
      //console.log(results);
      let _max = 0;
      _.forEach(results, function (value) {
        if (value.priority >= _max) _max = value.priority;
      });
      //console.log('--- max_priority = '+ _max);
      let _to_play = results.find((ele) => ele.priority == _max);
      //console.log(_to_play);
      local_play_schedule_id(_to_play._id);
    } else {
      console.log("-- no multiple play in same location detected just play");
      //console.log(results);
      let __to_play = main_play_list.find((ele) => ele.location_id == location);
      local_play_schedule_id(__to_play._id);
    }
  });
};
const local_play_schedule_id = (schedule_id) => {
  console.log("Controller: Auto PA: Play for schedule id = " + schedule_id);
  paScheduleModel
    .find({ _id: schedule_id })
    .sort({ name: "asc" })
    .exec((err, doc) => {
      if (err) return err;
      //console.log(doc);
      let _doc = doc[0];
      let _duration = parseInt(_doc.play_duration);
      if (_duration <= 0) _duration = 15;
      let _play_data = {
        public_address: process.env.PUBLIC_IP,
        sip_username: _doc.sip_username,
        sip_password: _doc.sip_password,
        location_number: _doc.location_number,
        location_hostname: _doc.hostname,
        location_name: _doc.name,
        filename: _doc.filename,
        play_duration: _duration,
      };
      //console.log(_play_data);
      local_player_play(_play_data, (_res) => {});
    });
};
const local_check_schedules = () => {
  let _now = moment();
  let _year = _now.format("YYYY");
  let _month = _now.format("MM");
  let _date = _now.format("DD");
  let _day = _now.format("ddd");
  // reset main play list
  main_play_list = [];
  // tolerance is 5 seconds
  const play_treshold = 5000;
  //console.log(udp_out_port_state);
  function capital(data) {
    return data.charAt(0).toUpperCase() + data.slice(1);
  }

  console.log(
    "Controller: Auto PA: Check auto schedule at " +
      _now.format("YYYY-MM-DD HH:mm") +
      " in " +
      _year
  );
  paScheduleModel
    .find({ status: "enable" })
    .sort({ name: "asc" })
    .exec((err, doc) => {
      if (err) throw err;
      doc.forEach((element) => {
        let _pt = JSON.parse(element.play_time);
        let _ts = null;
        let _pt_day = capital(_pt.day);
        //let _ts = moment.tz(_year + '-' + _pt.month + '-' + _pt.date + ' ' + _pt.hour, 'YYYY-mmm-dd HH:mm','Asia/Bangkok');
        //console.log(element.type + ' = ' + element.play_time + ' TS = ' + _ts);
        switch (element.type) {
          case "daily":
            //console.log('Daily schedule matched');
            _ts = moment.tz(
              _year + "-" + _month + "-" + _date + " " + _pt.hour,
              "YYYY-MM-DD HH:mm",
              "Asia/Bangkok"
            );
            //console.log(element.type + ' = ' + element.play_time + ' TS = ' + _ts.format('YYYY-MM-DD HH:mm'));
            //console.log('-- Auto PA :Daily check ' + _ts + ' = ' +_now + ' Diff = ' + (_now - _ts));
            if (_now - _ts > 0 && _now - _ts < play_treshold) {
              //console.log("--- Its time to play " + element._id);
              main_play_list.push(element);
            }
            break;
          case "weekly":
            //console.log('Weekly schedule matched');
            if (_pt_day == _day) {
              //console.log('day matched ' + _pt_day + ' = ' + _day );
              _ts = moment.tz(
                _year + "-" + _month + "-" + _date + " " + _pt.hour,
                "YYYY-MM-DD HH:mm",
                "Asia/Bangkok"
              );
              //console.log(element.type + ' = ' + element.play_time + ' TS = ' + _ts.format('YYYY-MM-DD ddd HH:mm'));
              //console.log('-- Auto PA :Weekly check ' + _ts + ' = ' +_now + ' Diff = ' + (_now - _ts));
              if (_now - _ts > 0 && _now - _ts < play_treshold) {
                //console.log("--- Its time to play " + element._id);
                main_play_list.push(element);
              }
            } else {
              //console.log('day not match ' + _pt_day   + ' = ' + _day );
            }
            break;
          case "monthly":
            //console.log('Monthly schedule matched');
            _ts = moment.tz(
              _year + "-" + _month + "-" + _pt.date + " " + _pt.hour,
              "YYYY-MM-DD HH:mm",
              "Asia/Bangkok"
            );
            //console.log(element.type + ' = ' + element.play_time + ' TS = ' + _ts.format('YYYY-MM-DD HH:mm'));
            //console.log('-- Auto PA :Monthly check ' + _ts + ' = ' +_now + ' Diff = ' + (_now - _ts));
            if (_now - _ts > 0 && _now - _ts < play_treshold) {
              //console.log("--- Its time to play " + element._id);
              main_play_list.push(element);
            }
            break;
          case "special":
            //console.log('Special schedule matched');
            //console.log(_year + '-' + _pt.month + '-' + _pt.date + ' ' + _pt.hour);
            _ts = moment.tz(
              _year + "-" + _pt.month + "-" + _pt.date + " " + _pt.hour,
              "YYYY-MMM-DD HH:mm",
              "Asia/Bangkok"
            );
            //console.log(element.type + ' = ' + element.play_time + ' TS = ' + _ts.format('YYYY-MMM-DD HH:mm'));
            // console.log('-- Auto PA :Special check ' + _ts + ' = ' +_now + ' Diff = ' + (_now - _ts));
            if (_now - _ts > 0 && _now - _ts < play_treshold) {
              //console.log("--- Its time to play " + element._id);
              main_play_list.push(element);
            }
            break;
          default:
            break;
        }
      });
      // show play list
      //console.log(main_play_list);
      local_filter_schedule();
    });
};

/* function cmdVLCStream(ip, port, filename, play_time) {
    console.log('- Start cmd VLC stream to = ' + ip + ':' + port);
    var vlc_cmd = '';
    if(process.env.NODE_ENV == 'development') {
      vlc_cmd = 'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe';
    } else {
      vlc_cmd = '/usr/bin/cvlc';
    }
      
    let cmdPlay = spawn(vlc_cmd, [
    '-I DUMMY',
    '--loop',
    '--sout-keep',
    '--network-caching=1500',
    filename , 
    '--sout=#gather:transcode{acodec=alaw,ab=64,scale=1,channels=1,samplerate=8000}:rtp{dst='+ ip +',port-audio='+ port +'}'
    ]);
    cmdPlay.stdout.on('data', (data) => {
      //console.log(`stdout: ${data}`);
    });
    
    cmdPlay.stderr.on('data', (data) => {
      //console.error(`stderr: ${data}`);
    });
    
    cmdPlay.on('close', (code) => {
      console.log("-- Play stream " + `child process exited with code ${code}`);
    });

    setTimeout(function() {
      cmdPlay.kill();
    }
    , play_time * 1000);
  } */
module.exports = {
  local_player_play,
  local_player_view,
  local_check_schedules,
};
