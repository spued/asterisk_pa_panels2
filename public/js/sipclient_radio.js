$(function () {
  const remoteAudio = $("#main_audio")[0];
  const radio_audio = $("#aux_audio")[0];
  var mixedOutput;
  var volume;
  var media_constraints = {
    audio: true,
    video: false,
  };
  navigator.mediaDevices
    .getUserMedia(media_constraints)
    .then(function (stream) {
      var ac = new window.AudioContext();
      volume = ac.createGain();
      volume.gain.value = 0.8;
      mixedOutput = ac.createMediaStreamDestination();
      var microphone = ac.createMediaElementSource(remoteAudio);
      var radio = ac.createMediaElementSource(radio_audio);
      microphone.connect(volume);
      radio.connect(volume);
      volume.connect(mixedOutput);
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

  configuration.uri =
    "sip:" + $("#page_user_bernum").val() + "@astrapa.nt-acs.net:5061";
  configuration.password = $("#page_user_ssap").val();
  //JsSIP.debug.enable('JsSIP:*');
  ua = new JsSIP.UA(configuration);

  $("#btn_main_on").attr("disabled", false);
  $("#btn_main_off").attr("disabled", true);
  $("#btn_main_call").attr("disabled", true);
  $("#btn_main_disconnect").attr("disabled", true);

  ua.on("registered", function () {
    console.log("Registered");
    $("#btn_main_off").attr("disabled", false);
    $("#btn_main_on").attr("disabled", true);

    $("#btn_main_call").attr("disabled", false);
    $("#btn_main_disconnect").attr("disabled", false);
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

    session.connection.addEventListener("track", (evt) => {
      console.log("-- Add outgoing audio track");
      remoteAudio.srcObject = evt.streams[0];
      //remoteAudio.play();
    });

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
    $("#btn_main_disconnect").attr("disabled", true);

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
      volume.gain.value = 0.0;
    } else volume.gain.value = 0.8;
  });

  remoteAudio.addEventListener("play", function (evt) {
    //console.log('play music');
    var on_playing = document.getElementById("led_playing");
    on_playing.setAttribute("class", "led-red");
  });
  remoteAudio.addEventListener("pause", function (evt) {
    //console.log('play pause');
    var on_playing = document.getElementById("led_playing");
    on_playing.setAttribute("class", "led-off");
  });
});
