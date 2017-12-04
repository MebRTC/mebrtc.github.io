//Declare var, const
const socket = io('https://socketiomanhnv.herokuapp.com/')
var pc;

//Video
var bitrateVideoSentGraph;
var bitrateVideoSentSeries;
var packetVideoSentGraph;
var packetVideoSentSeries;

var bitrateVideoReceivedGraph;
var bitrateVideoReceivedSeries;
var packetVideoReceivedGraph;
var packetVideoReceivedSeries;
//Audio
var bitrateAudioSentGraph;
var bitrateAudioSentSeries;
var packetAudioSentGraph;
var packetAudioSentSeries;

var bitrateAudioReceivedGraph;
var bitrateAudioReceivedSeries;
var packetAudioReceivedGraph;
var packetAudioReceivedSeries;

var lastResult;

// var configuration   = null;
var configuration   = {'iceServers': [{ 'url': 'stun:stun.l.google.com:19302' }]};
var optional        = {optional: [{DtlsSrtpKeyAgreement: true}]};
var offerOptions    = {offerToReceiveAudio: 1,  offerToReceiveVideo: 1};

var bandwidthSelector = document.querySelector('select#bandwidth');
var visualizerAudioCanvas = document.getElementById('visualizerAudioCanvas');

//Listener socket
socket.on('CALL_SOCKET_CLIENT', evt => {
    if (!pc){
        updateStatusCall("Calling...");
        start(false);
    }
    let {sdp, candidate, bandwidth} = evt;
    // If var sdp exist then setRemoteDescription(sdp PC remote)
    if (sdp){
        pc.setRemoteDescription({
            type: sdp.type,
            sdp: updateBandwidthRestriction(updateBandwidthRestriction(sdp.sdp, 'video', '500'), 'audio', '50')
        }).then(
            function() {
                onSetRemoteSuccess(pc); //TB
            },
            onSetSessionDescriptionError //TB
        );
    }else if(bandwidth){
        let desc = {
            type: pc.remoteDescription.type,
            sdp: bandwidth === 'unlimited'
                ? removeBandwidthRestriction(pc.remoteDescription.sdp)
                : updateBandwidthRestriction(updateBandwidthRestriction(pc.remoteDescription.sdp, 'video', bandwidth),'audio', bandwidth/10)
        };
        console.log('Applying bandwidth restriction to setRemoteDescription:\n' + desc.sdp);
        pc.setRemoteDescription(desc);
    }else{
        //Add Ice Candidate of PC remote
        pc.addIceCandidate(new RTCIceCandidate(candidate))
        .then(
            function() {
                onAddIceCandidateSuccess(pc); //TB
            },
            function(err) {
                onAddIceCandidateError(pc, err); //TB
            }
        );
    }
});

socket.on('HANG_UP_SOCKET_CLIENT', evt => {
    if(pc){
        pc.close();
        pc = null;
    }
    location.reload();
});

//Listener action click
$('#btnStart').on('click', function(){
    start(true);
})

$('#btnHangup').on('click', function(){
    hangup();
})

// run start(true) to initiate a call
function start(isCaller) {
    bandwidthSelector.disabled = false;
    pc = new RTCPeerConnection(configuration, optional);
    // send any ice candidates to the other peer
    pc.onicecandidate = function (evt) {
        if (!evt || !evt.candidate) return;
        socket.emit("CALL_SOCKET_SERVER", {candidate: evt.candidate});
    };

    // once remote stream arrives, show it in the remote video element
    pc.onaddstream = function (evt) {
        playStream("remoteStream", evt.stream);
        var streamVisualizer = new StreamVisualizer(evt.stream, visualizerAudioCanvas);
        streamVisualizer.start();
    };

    //Start open camera and send stream to pc remote
    openStream()
    .then( stream => {
        playStream("localStream", stream);
        pc.addStream(stream);

        if (isCaller){
            updateStatusCall("Calling...");
            pc.createOffer(
                offerOptions
            ).then(
                gotDescription,
                onCreateSessionDescriptionError
            );
        }
        else{
            pc.createAnswer().then(
                gotDescription,
                onCreateSessionDescriptionError //TB
            );
        }

        //VIDEO
        //Add bitrate send to canvas
        bitrateVideoSentSeries = new TimelineDataSeries();
        bitrateVideoSentGraph = new TimelineGraphView('bitrateVideoSentGraph', 'bitrateVideoCanvas');
        bitrateVideoSentGraph.updateEndDate();

        packetVideoSentSeries = new TimelineDataSeries();
        packetVideoSentGraph = new TimelineGraphView('packetVideoSentGraph', 'packetVideoCanvas');
        packetVideoSentGraph.updateEndDate();

        //Add bitrate received to canvas
        bitrateVideoReceivedSeries = new TimelineDataSeries();
        bitrateVideoReceivedGraph = new TimelineGraphView('bitrateVideoReceivedGraph', 'bitrateVideoReceivedCanvas');
        bitrateVideoReceivedGraph.updateEndDate();

        packetVideoReceivedSeries = new TimelineDataSeries();
        packetVideoReceivedGraph = new TimelineGraphView('packetVideoReceivedGraph', 'packetVideoReceivedCanvas');
        packetVideoReceivedGraph.updateEndDate();

        //AUDIO
        //Add bitrate send to canvas
        bitrateAudioSentSeries = new TimelineDataSeries();
        bitrateAudioSentGraph = new TimelineGraphView('bitrateAudioSentGraph', 'bitrateAudioCanvas');
        bitrateAudioSentGraph.updateEndDate();

        packetAudioSentSeries = new TimelineDataSeries();
        packetAudioSentGraph = new TimelineGraphView('packetAudioSentGraph', 'packetAudioCanvas');
        packetAudioSentGraph.updateEndDate();

        //Add bitrate received to canvas
        bitrateAudioReceivedSeries = new TimelineDataSeries();
        bitrateAudioReceivedGraph = new TimelineGraphView('bitrateAudioReceivedGraph', 'bitrateAudioReceivedCanvas');
        bitrateAudioReceivedGraph.updateEndDate();

        packetAudioReceivedSeries = new TimelineDataSeries();
        packetAudioReceivedGraph = new TimelineGraphView('packetAudioReceivedGraph', 'packetAudioReceivedCanvas');
        packetAudioReceivedGraph.updateEndDate();
    });
}

//Declare function hangUp
function hangup() {
    socket.emit("HANG_UP_SOCKET_SERVER");
    if(pc){
        pc.close();
        pc = null;
    }    
    location.reload();
}

/*Declare funtion*/
function playStream(idVideoTag, stream){
    const video = document.getElementById(idVideoTag);
    video.srcObject = stream;
    video.play();
}

function openStream(){
    const config = {audio: true, video: true};
    return navigator.mediaDevices.getUserMedia(config);
}

function gotDescription(desc) {
    console.log('Offer from pc1\n' + desc.sdp);
    console.log('pc setLocalDescription start');
    pc.setLocalDescription(desc).then(
        function() {
            onSetLocalSuccess(pc); //TB
        },
        onSetSessionDescriptionError //TB
    );
    socket.emit("CALL_SOCKET_SERVER", {sdp: desc});
} 

function updateStatusCall(status){
    $("#statusCall").html(status);
}

// renegotiate bandwidth on the fly.
bandwidthSelector.onchange = function() {
    bandwidthSelector.disabled = true;
    var bandwidth = bandwidthSelector.options[bandwidthSelector.selectedIndex].value;
    pc.createOffer(offerOptions)
    .then(function(offer) {
        console.log(offer);
        pc.setLocalDescription(offer).then(
            function() {
                onSetLocalSuccess(pc); //TB
                //socket.emit("CALL_SOCKET_SERVER", {bandwidth: bandwidth});
                let desc = {
                    type: pc.remoteDescription.type,
                    sdp: bandwidth === 'unlimited'
                        ? removeBandwidthRestriction(pc.remoteDescription.sdp)
                        : updateBandwidthRestriction(updateBandwidthRestriction(pc.remoteDescription.sdp, 'video', bandwidth),'audio', bandwidth/10)
                };
                console.log(desc.sdp);
                pc.setRemoteDescription(desc);
            },
            onSetSessionDescriptionError //TB
        );
    }).then(function() {
        //Then
    }).then(function() {
        bandwidthSelector.disabled = false;
    })
    .catch(onSetSessionDescriptionError);
};


function updateBandwidthRestriction(sdp, media, bandwidth) {
  var lines = sdp.split("\n");
  var line = -1;
  for (var i = 0; lines.length; i++) {
    if (lines[i].indexOf("m="+media) === 0) {
      line = i;
      break;
    }
  }
  if (line === -1) {
    console.debug("Could not find the m line for", media);
    return sdp;
  }
  console.debug("Found the m line for", media, "at line", line);

  // Pass the m line
  line++;

  // Skip i and c lines
  while(lines[line].indexOf("i=") === 0 || lines[line].indexOf("c=") === 0) {
    line++;
  }

  // If we're on a b line, replace it
  if (lines[line].indexOf("b") === 0) {
    console.debug("Replaced b line at line", line);
    lines[line] = "b=AS:"+bandwidth;
    return lines.join("\n");
  }
  
  // Add a new b line
  console.debug("Adding new b line before line", line);
  var newLines = lines.slice(0, line)
  newLines.push("b=AS:"+bandwidth)
  newLines = newLines.concat(lines.slice(line, lines.length))
  return newLines.join("\n")
}


function removeBandwidthRestriction(sdp) {
  return sdp.replace(/b=AS:.*\r\n/, '').replace(/b=TIAS:.*\r\n/, '');
}

// query getStats every second
window.setInterval(function() {
  if (!window.pc) {
    return;
  }
  window.pc.getStats().then(function(res) {
    res.forEach(function(report) {
      
      //VIDEO
      //Video sent
      if (((report.type === 'outboundrtp') ||
          (report.type === 'outbound-rtp') ||
          (report.type === 'ssrc' && report.bytesSent)) && 
          (report.mediaType === 'video')) {

        let bytesSent;
        let packetsSent;
        let now = report.timestamp;

        bytesSent = report.bytesSent;
        packetsSent = report.packetsSent;
        if (lastResult && lastResult.get(report.id)) {
          // calculate bitrate
          var bitrateSent = 8 * (bytesSent - lastResult.get(report.id).bytesSent) /
              (now - lastResult.get(report.id).timestamp);

          // append to chart
          bitrateVideoSentSeries.addPoint(now, bitrateSent);
          bitrateVideoSentGraph.setDataSeries([bitrateVideoSentSeries]);
          bitrateVideoSentGraph.updateEndDate();

          // calculate number of packets and append to chart
          packetVideoSentSeries.addPoint(now, packetsSent -
          lastResult.get(report.id).packetsSent);
          packetVideoSentGraph.setDataSeries([packetVideoSentSeries]);
          packetVideoSentGraph.updateEndDate();
        }
      }
      //Video received
      if (((report.type === 'inboundrtp') ||
          (report.type === 'inbound-rtp') ||
          (report.type === 'ssrc' && report.bytesReceived)) && 
          (report.mediaType === 'video')) {

        var bytesReceived;
        var packetsReceived;
        let now = report.timestamp;

        bytesReceived = report.bytesReceived;
        packetsReceived = report.packetsReceived;
        if (lastResult && lastResult.get(report.id)) {
          // calculate bitrate
          var bitrateReceived = 8 * (bytesReceived - lastResult.get(report.id).bytesReceived) /
              (now - lastResult.get(report.id).timestamp);

          // append to chart
          bitrateVideoReceivedSeries.addPoint(now, bitrateReceived);
          bitrateVideoReceivedGraph.setDataSeries([bitrateVideoReceivedSeries]);
          bitrateVideoReceivedGraph.updateEndDate();

          // calculate number of packets and append to chart
          packetVideoReceivedSeries.addPoint(now, packetsReceived -
          lastResult.get(report.id).packetsReceived);
          packetVideoReceivedGraph.setDataSeries([packetVideoReceivedSeries]);
          packetVideoReceivedGraph.updateEndDate();
        }
      }

      //AUDIO
      //Audio sent
      if (((report.type === 'outboundrtp') ||
          (report.type === 'outbound-rtp') ||
          (report.type === 'ssrc' && report.bytesSent)) && 
          (report.mediaType === 'audio')) {

        let bytesSent;
        let packetsSent;
        let now = report.timestamp;

        bytesSent = report.bytesSent;
        packetsSent = report.packetsSent;
        if (lastResult && lastResult.get(report.id)) {
          // calculate bitrate
          var bitrateSent = 8 * (bytesSent - lastResult.get(report.id).bytesSent) /
              (now - lastResult.get(report.id).timestamp);

          // append to chart
          bitrateAudioSentSeries.addPoint(now, bitrateSent);
          bitrateAudioSentGraph.setDataSeries([bitrateAudioSentSeries]);
          bitrateAudioSentGraph.updateEndDate();

          // calculate number of packets and append to chart
          packetAudioSentSeries.addPoint(now, packetsSent -
          lastResult.get(report.id).packetsSent);
          packetAudioSentGraph.setDataSeries([packetAudioSentSeries]);
          packetAudioSentGraph.updateEndDate();
        }
      }

      //Audio received
      if (((report.type === 'inboundrtp') ||
          (report.type === 'inbound-rtp') ||
          (report.type === 'ssrc' && report.bytesReceived)) && 
          (report.mediaType === 'audio')) {

        var bytesReceived;
        var packetsReceived;
        let now = report.timestamp;

        bytesReceived = report.bytesReceived;
        packetsReceived = report.packetsReceived;
        if (lastResult && lastResult.get(report.id)) {
          // calculate bitrate
          var bitrateReceived = 8 * (bytesReceived - lastResult.get(report.id).bytesReceived) /
              (now - lastResult.get(report.id).timestamp);

          // append to chart
          bitrateAudioReceivedSeries.addPoint(now, bitrateReceived);
          bitrateAudioReceivedGraph.setDataSeries([bitrateAudioReceivedSeries]);
          bitrateAudioReceivedGraph.updateEndDate();

          // calculate number of packets and append to chart
          packetAudioReceivedSeries.addPoint(now, packetsReceived -
          lastResult.get(report.id).packetsReceived);
          packetAudioReceivedGraph.setDataSeries([packetAudioReceivedSeries]);
          packetAudioReceivedGraph.updateEndDate();
        }
      }

    });
    lastResult = res;
  });
}, 1000);

//Functions change bandWidth
// function updateBandwidthRestriction(sdp, bandwidth) {
//   var modifier = 'AS';
//   // if (adapter.browserDetails.browser === 'firefox') {
//   //   bandwidth = (bandwidth >>> 0) * 1000;
//   //   modifier = 'TIAS';
//   // }
//   if (sdp.indexOf('b=' + modifier + ':') === -1) {
//     // insert b= after c= line.
//     console.log("---------------1---------------");
//     console.log(sdp);
//     sdp = sdp.replace(/c=IN (.*)\r\n/gi,
//         'c=IN $1\r\nb=' + modifier + ':' + bandwidth + '\r\n');
//     console.log("---------------2---------------");
//     console.log(sdp);
//   } else {
//     sdp = sdp.replace(new RegExp('b=' + modifier + ':.*\r\n'),
//         'b=' + modifier + ':' + bandwidth + '\r\n');
//   }
//   return sdp;
// }

/*Declare function alert*/
function onSetLocalSuccess(pc) {
    console.log('setLocalDescription complete');
} 
function onSetSessionDescriptionError(error) {
    console.log('Failed to set session description: ' + error.toString());
}     
function onSetRemoteSuccess(pc) {
    console.log('setRemoteDescription complete');
}
function onCreateSessionDescriptionError(error) {
    console.log('Failed to create session description: ' + error.toString());
}
function onAddIceCandidateSuccess(pc) {
    updateStatusCall("Call success");
    console.log('addIceCandidate success');
}
function onAddIceCandidateError(pc, error) {
    console.log('failed to add ICE Candidate: ' + error.toString());
}



