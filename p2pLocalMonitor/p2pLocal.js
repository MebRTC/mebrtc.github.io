$('#btnCall').on('click', function(){
    call();
})

var pc1;
var pc2;
var localVideo = document.getElementById('localStream');
var remoteVideo = document.getElementById('remoteStream');
var hangupButton = document.querySelector('button#hangupButton');
var bandwidthSelector = document.querySelector('select#bandwidth');

var localStream;

var bitrateGraph;
var bitrateSeries;

var packetGraph;
var packetSeries;

var lastResult;

var offerOptions = {
  	offerToReceiveAudio: 0,
  	offerToReceiveVideo: 1
};
/*-------------------------------------------------------------------------------*/
// Start call
function call() {
    bandwidthSelector.disabled = false;
    let server = null;
    let pcConstraints = {
      'optional': []
    };
    ////////////////////////////////////////////////
    pc1 = new RTCPeerConnection(server, pcConstraints);
    console.log('Created local  peer connection object pc1');
    pc1.onicecandidate = onIceCandidate.bind(pc1);

    pc2 = new RTCPeerConnection(server, pcConstraints);
    console.log('Created remote peer connection object pc2');
    pc2.onicecandidate = onIceCandidate.bind(pc2);
    ////////////////////////////////////////////////
    
    ////////////////////////////////////////////////
    pc2.onaddstream = gotRemoteStream;

    navigator.mediaDevices.getUserMedia({
      video: true
    })
    .then(gotStream)
    .catch(function(e) {
      alert('getUserMedia() error: ' + e.name);
    });
}
//Function
function playStream(idVideoTag, stream){
    const video = document.getElementById(idVideoTag);
    video.srcObject = stream;
    video.play();
}
function gotRemoteStream(e) {
  playStream("remoteStream", e.stream);
  console.log('pc2 received remote stream');
}
function gotStream(stream) {
  console.log('Received local stream');
  localStream = stream;
  playStream("localStream", stream);
  pc1.addStream(stream);

  console.log('Adding Local Stream to peer connection');

  pc1.createOffer(
    offerOptions
  ).then(
    gotDescription1,
    onCreateSessionDescriptionError
  );

  bitrateSeries = new TimelineDataSeries();
  bitrateGraph = new TimelineGraphView('bitrateGraph', 'bitrateCanvas');
  bitrateGraph.updateEndDate();

  packetSeries = new TimelineDataSeries();
  packetGraph = new TimelineGraphView('packetGraph', 'packetCanvas');
  packetGraph.updateEndDate();
}

function gotDescription1(desc) {
  console.log('Offer from pc1 \n' + desc.sdp);
  pc1.setLocalDescription(desc).then(
    function() {
      pc2.setRemoteDescription(desc).then(
        function() {
          pc2.createAnswer().then(
            gotDescription2,
            onCreateSessionDescriptionError
          );
        },
        onSetSessionDescriptionError
      );
    },
    onSetSessionDescriptionError
  );
}

function gotDescription2(desc) {
  pc2.setLocalDescription(desc).then(
    function() {
      console.log('Answer from pc2 \n' + desc.sdp);
      pc1.setRemoteDescription({
        type: desc.type,
        sdp: updateBandwidthRestriction(desc.sdp, '500')
      }).then(
        function() {
        },
        onSetSessionDescriptionError
      );
    },
    onSetSessionDescriptionError
  );
}

function hangup() {
  console.log('Ending call');
  localStream.getTracks().forEach(function(track) {
    track.stop();
  });
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
  bandwidthSelector.disabled = true;
}

function onIceCandidate(event) {
		getOtherPc(this).addIceCandidate(event.candidate)
		.then(
  		function() {
    			onAddIceCandidateSuccess(this);
  		},
  		function(err) {
    			onAddIceCandidateError(this, err);
  		}
		);
}

function getName(pc) {
		return (pc === pc1) ? 'pc1' : 'pc2';
}

function getOtherPc(pc) {
		return (pc === pc1) ? pc2 : pc1;
}

function onIceStateChange(pc, event) {
		if (pc) {
  		console.log(getName(pc) + ' ICE state: ' + pc.iceConnectionState);
  		console.log('ICE state change event: ', event);
		}
}

//Listen event
// renegotiate bandwidth on the fly.
bandwidthSelector.onchange = function() {
  bandwidthSelector.disabled = true;
  var bandwidth = bandwidthSelector.options[bandwidthSelector.selectedIndex]
      .value;
  pc1.createOffer()
  .then(function(offer) {
    return pc1.setLocalDescription(offer);
  })
  .then(function() {
    var desc = {
      type: pc1.remoteDescription.type,
      sdp: bandwidth === 'unlimited'
          ? removeBandwidthRestriction(pc1.remoteDescription.sdp)
          : updateBandwidthRestriction(pc1.remoteDescription.sdp, bandwidth)
    };
    console.log('Applying bandwidth restriction to setRemoteDescription:\n' +
        desc.sdp);
    return pc1.setRemoteDescription(desc);
  })
  .then(function() {
    bandwidthSelector.disabled = false;
  })
  .catch(onSetSessionDescriptionError);
};

function updateBandwidthRestriction(sdp, bandwidth) {
  var modifier = 'AS';
  // if (adapter.browserDetails.browser === 'firefox') {
  //   bandwidth = (bandwidth >>> 0) * 1000;
  //   modifier = 'TIAS';
  // }
  if (sdp.indexOf('b=' + modifier + ':') === -1) {
    // insert b= after c= line.
    sdp = sdp.replace(/c=IN (.*)\r\n/,
        'c=IN $1\r\nb=' + modifier + ':' + bandwidth + '\r\n');
  } else {
    sdp = sdp.replace(new RegExp('b=' + modifier + ':.*\r\n'),
        'b=' + modifier + ':' + bandwidth + '\r\n');
  }
  return sdp;
}

function removeBandwidthRestriction(sdp) {
  return sdp.replace(/b=AS:.*\r\n/, '').replace(/b=TIAS:.*\r\n/, '');
}

//Job 1s update graph bandwidth
// query getStats every second
window.setInterval(function() {
  if (!window.pc1) {
    return;
  }
  window.pc1.getStats().then(function(res) {
    res.forEach(function(report) {
      var bytes;
      var packets;
      var now = report.timestamp;
      if ((report.type === 'outboundrtp') ||
          (report.type === 'outbound-rtp') ||
          (report.type === 'ssrc' && report.bytesSent)) {
        bytes = report.bytesSent;
        packets = report.packetsSent;
        if (lastResult && lastResult.get(report.id)) {
          // calculate bitrate
          var bitrate = 8 * (bytes - lastResult.get(report.id).bytesSent) /
              (now - lastResult.get(report.id).timestamp);

          // append to chart
          bitrateSeries.addPoint(now, bitrate);
          bitrateGraph.setDataSeries([bitrateSeries]);
          bitrateGraph.updateEndDate();

          // calculate number of packets and append to chart
          packetSeries.addPoint(now, packets -
              lastResult.get(report.id).packetsSent);
          packetGraph.setDataSeries([packetSeries]);
          packetGraph.updateEndDate();
        }
      }
    });
    lastResult = res;
  });
}, 1000);


//TB
//Susscess
function onSetLocalSuccess(pc) {
		console.log(getName(pc) + ' setLocalDescription complete');
}

function onSetRemoteSuccess(pc) {
		console.log(getName(pc) + ' setRemoteDescription complete');
}
function onAddIceCandidateSuccess(pc) {
		console.log(getName(pc) + ' addIceCandidate success');
}
//Error
function onAddIceCandidateError(pc, error) {
		console.log(getName(pc) + ' failed to add ICE Candidate: ' + error.toString());
}
function onSetSessionDescriptionError(error) {
		console.log('Failed to set session description: ' + error.toString());
}
function onCreateSessionDescriptionError(error) {
		console.log('Failed to create session description: ' + error.toString());
}
