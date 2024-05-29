$(function () {
  //console.log('sip client loading');
  // Create our JsSIP instance and run it:

  const remoteAudio = $("#main_audio")[0];
  const musicAudio = $("#music_audio")[0];
  const recordAudio = $("#audio_record")[0];
  const auxAudio = $("#aux_audio")[0];
  const playerAudio = $("#audio_player")[0];

  var mixedOutput;
  var localOutput;
  var volume;
  var mic_volume;
  var recorder;
  var media_constraints = {
    audio: true,
    video: false,
  };
  var current_slot = 0;

  navigator.mediaDevices
    .getUserMedia(media_constraints)
    .then(function (stream) {
      var ac = new window.AudioContext();
      var local_ac = new window.AudioContext();
      volume = ac.createGain();
      volume.gain.value = 0.8;
      mic_volume = ac.createGain();
      mic_volume.gain.value = 0.8;
      var backgroundMusic = ac.createMediaElementSource(musicAudio);
      var record_audio = ac.createMediaElementSource(recordAudio);
      var aux_audio = local_ac.createMediaElementSource(auxAudio);
      var player_audio = ac.createMediaElementSource(playerAudio);
      mixedOutput = ac.createMediaStreamDestination();
      var microphone = null;
      microphone = ac.createMediaStreamSource(stream);

      microphone.connect(mic_volume);
      backgroundMusic.connect(volume);
      record_audio.connect(volume);
      player_audio.connect(volume);
      volume.connect(mixedOutput);
      mic_volume.connect(mixedOutput);
      recorder = new Recorder(microphone, { numChannels: 1, sampleRate: 8000 });
      aux_audio.connect(local_ac.destination);
    })
    .catch(function (err) {
      console.log("Media Error: " + err);
    });

  var socket = new JsSIP.WebSocketInterface("wss://astrapa.nt-acs.net:8089/ws");
  var configuration = {
    sockets: [socket],
    uri: "sip:1001@astrapa.nt-acs.net:5061",
    password: "1001",
    realm: "asterisk",
    registrar_server: "sip:astrapa.nt-acs.net",
    register: true,
  };
  var ua;
  const _uid = $("#page_user_id").val();
  /* var this_user = {};
  $.post('/get_user_id', { userid: _uid},function(data) {
      //console.log(data[0]);
      return this_user = data[0];
  }); */

  configuration.uri =
    "sip:" + $("#page_user_bernum").val() + "@astrapa.nt-acs.net:5061";
  configuration.password = $("#page_user_ssap").val();
  //JsSIP.debug.enable('JsSIP:*');
  ua = new JsSIP.UA(configuration);

  $("#btn_main_on").attr("disabled", false);
  $("#btn_main_off").attr("disabled", true);
  $("#btn_main_call").attr("disabled", true);
  $("#btn_main_play_music").attr("disabled", true);
  $("#btn_main_disconnect").attr("disabled", true);

  ua.on("registered", function () {
    console.log("Registered");
    $("#btn_main_off").attr("disabled", false);
    $("#btn_main_on").attr("disabled", true);

    $("#btn_main_call").attr("disabled", false);
    $("#btn_main_play_music").attr("disabled", false);
    $("#btn_main_disconnect").attr("disabled", false);
    // Enable record button
    $("#btn_record").attr("disabled", false);
  });

  //
  ua.on("newRTCSession", function (data) {
    var session = data.session; // outgoing call session here
    //var datachannel;
    session.on("peerconnection", function (data) {
      //datachannel = data.peerconnection.createDataChannel('chat');\
      //console.log(data);
    });
    session.on("confirmed", function () {
      //the call has connected, and audio is playing
      //console.log(session.connection);
      $("#btn_main_disconnect").attr("disabled", false);
      $("#btn_main_call").attr("disabled", true);

      //var localStream = session.connection.getLocalStreams()[0];
      //var remoteStream = session.connection.getRemoteStreams()[0];
      //console.log(localStream);
    });

    session.connection.addEventListener("track", (e) => {
      console.log("-- Add outgoing audio track");
      remoteAudio.srcObject = e.streams[0];
      remoteAudio.play();
    });

    /* session.connection.addEventListener('addstream', (e) => {
      console.log('-- Add stream event: for remote audio play to local ');
      //console.log(e.stream);
      remoteAudio.srcObject = e.stream;
      remoteAudio.play(); 
    }); */
    session.on("ended", function () {
      //the call has ended
      $("#btn_main_disconnect").attr("disabled", true);
    });
    session.on("failed", function () {
      // unable to establish the call
    });
    session.on("accepted", function () {
      console.log("- RTCSession: Accepted");
    });

    //Handle Browser not allowing access to mic and speaker
    session.on("getusermediafailed", function (DOMError) {
      console.log("Get User Media Failed Call Event " + DOMError);
    });

    //mute call
    session.mute({ audio: true });

    //unmute call
    session.unmute({ audio: true });

    //to hangup the call
    //session.terminate();
  });

  // Register callbacks to desired call events
  var eventHandlers = {
    progress: function (e) {
      console.log("call is in progress");
    },
    failed: function (e) {
      console.log("call failed with cause: " + e.cause);
    },
    ended: function (e) {
      console.log("call ended with cause: " + e.cause);
      $("#btn_main_call").attr("disabled", false);
    },
    confirmed: function (e) {
      console.log("call confirmed");
      var on_air_led = document.getElementById("led_on_air");
      on_air_led.setAttribute("class", "led-red");

      $.post(
        "/location_adjust_volume",
        {
          _id: sessionStorage.location_id,
          _mode: "volume",
        },
        function (res) {}
      );
    },
  };
  $(document).on("click", "#btn_main_off", function (evt) {
    console.log("Turn off system");
    var options = {
      all: true,
    };
    ua.unregister(options);
    ua.stop();
    $("#btn_main_off").attr("disabled", true);
    $("#btn_main_on").attr("disabled", false);
    $("#btn_main_call").attr("disabled", true);
    $("#btn_main_play_music").attr("disabled", true);
    $("#btn_main_disconnect").attr("disabled", true);
    $("#btn_record_stop").attr("disabled", true);

    var on_air_led = document.getElementById("led_on_air");
    on_air_led.setAttribute("class", "led-off");
  });
  $(document).on("click", "#btn_main_on", function (evt) {
    //console.log("Turn on system");
    ua.start();
    var on_air_led = document.getElementById("led_on_air");
    on_air_led.setAttribute("class", "led-green");
  });
  $(document).on("click", "#btn_main_disconnect", function (evt) {
    //console.log("off call");
    ua.terminateSessions();

    var on_air_led = document.getElementById("led_on_air");
    on_air_led.setAttribute("class", "led-green");
  });
  $(document).on("click", "#btn_main_call", function (evt) {
    const dest_number = $("#location_number").val();
    console.log("Call to annouce to " + dest_number);

    var uri = new JsSIP.URI("sip", dest_number, "astrapa.nt-acs.net", 5060);

    var call_options = {
      eventHandlers: eventHandlers,
      mediaStream: mixedOutput.stream,
      mediaConstraints: { audio: true, video: false },
    };
    //console.log(mixedOutput.stream.getTracks());
    ua.call(uri, call_options);
  });

  $("#mic_control").on("click", function (evt) {
    //console.log('mic control')
    $("#mic_icon").toggleClass("fa-microphone-slash fa-microphone");
    if ($("#mic_icon").hasClass("fa-microphone-slash")) {
      mic_volume.gain.value = 0.0;
    } else mic_volume.gain.value = 0.8;
  });
  $(document).on("click", "#btn_record", function (evt) {
    //console.log("Start record");
    recorder && recorder.record();
    $("#btn_record").attr("disabled", true);
    $("#btn_record_stop").attr("disabled", false);
    var on_recording = document.getElementById("led_recording");
    on_recording.setAttribute("class", "led-red");
  });
  $(document).on("click", "#btn_record_stop", function (evt) {
    //console.log("Stop Record");
    recorder && recorder.stop();
    $("#btn_record").attr("disabled", false);
    $("#btn_record_stop").attr("disabled", true);
    var on_recording = document.getElementById("led_recording");
    on_recording.setAttribute("class", "led-off");
    createDownloadLink();
    recorder.clear();
  });
  $(document).on("click", ".js-btn-load-recorded", function (evt) {
    console.log("Record load = " + $(this).attr("id"));
    let _id = $(this).attr("id");
    var audio_record = document.getElementById("audio_record");
    audio_record.pause();
    audio_record.src = $(this).attr("ref_link");
    aux_audio.src = $(this).attr("ref_link");
    var cols = document.getElementsByClassName("col-record");
    for (let i = 0; i < cols.length; i++) {
      if (i == _id.charAt(_id.length - 1)) {
        cols[i].setAttribute("class", "col-sm-6 col-record bg-success rounded");
      } else {
        cols[i].setAttribute("class", "col-sm-6 col-record bg-default rounded");
      }
    }
    audio_record.play();
  });
  $("#loop_check").change(function () {
    var _player = document.getElementById("audio_player");
    if (this.checked) {
      //Do set loop for player
      _player.loop = true;
    } else {
      _player.loop = false;
    }
  });
  recordAudio.addEventListener("play", function (evt) {
    //console.log('play music');

    var on_playing = document.getElementById("led_playing");
    on_playing.setAttribute("class", "led-red");
  });
  recordAudio.addEventListener("pause", function (evt) {
    //console.log('play pause');

    var on_playing = document.getElementById("led_playing");
    on_playing.setAttribute("class", "led-off");
  });

  playerAudio.addEventListener("play", function (evt) {
    //console.log('play music');
    var on_playing = document.getElementById("led_playing");
    on_playing.setAttribute("class", "led-red");
  });
  playerAudio.addEventListener("pause", function (evt) {
    //console.log('play pause');
    var on_playing = document.getElementById("led_playing");
    on_playing.setAttribute("class", "led-off");
  });
  function handleFiles(event) {
    var files = event.target.files;
    //console.log(files[0].name);
    $("#audio_player").attr("src", URL.createObjectURL(files[0]));
    document.getElementById("audio_player").load();
    document.getElementById("player_file_name").innerHTML = files[0].name;
  }
  document
    .getElementById("btn_load_player_file")
    .addEventListener("change", handleFiles, false);

  function createDownloadLink() {
    const date_now = new Date();
    const now = moment(date_now).format("YYYYMMDDHHMMSS");
    recorder &&
      recorder.exportWAV(function (blob) {
        var url = URL.createObjectURL(blob);
        var link = document.getElementById("recorded_file_" + current_slot);
        var cols = document.getElementsByClassName("col-record");
        for (let i = 0; i < cols.length; i++) {
          cols[i].setAttribute(
            "class",
            "col-sm-6 col-record bg-default rounded"
          );
        }

        var col = document.getElementById("col_" + current_slot);
        col.setAttribute("class", "col-sm-6 col-record bg-success rounded");
        var audio_record = document.getElementById("audio_record");
        var link_div = document.createElement("div");
        link_div.setAttribute("class", "recorded_files text-warning");
        var load_recorded_button = document.createElement("button");
        load_recorded_button.setAttribute("ref_link", url);
        load_recorded_button.setAttribute("id", "record_slot_" + current_slot);
        load_recorded_button.setAttribute(
          "class",
          "btn btn-warning btn-small js-btn-load-recorded m-2"
        );
        load_recorded_button.innerHTML = '<i class="fa fa-play"></i>';
        var hf = document.createElement("a");

        audio_record.src = url;
        aux_audio.src = url;

        hf.setAttribute("class", "text text-warning");
        hf.href = url;
        hf.download = now + "_" + $("#location_number").val() + ".wav";
        hf.innerHTML = hf.download;
        link_div.appendChild(hf);
        link_div.appendChild(load_recorded_button);
        if (link.hasChildNodes()) {
          link.removeChild(link.children[0]);
        }
        link.appendChild(link_div);

        current_slot++;
        if (current_slot > 3) current_slot = 0;
      });
  }
});
