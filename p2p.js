
$('#btnStart').on('click', function(){
    start();
})
$('#btnCall').on('click', function(){
    call();
})

var pc1;
var pc2;
var localVideo = document.getElementById('localStream');
var remoteVideo = document.getElementById('remoteStream');

var offerOptions = {
  	offerToReceiveAudio: 1,
  	offerToReceiveVideo: 1
};

var offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

function playStream(idVideoTag, stream){
    const video = document.getElementById(idVideoTag);
    video.srcObject = stream;
    video.play();
}

// Start local stream
function start() {
  console.log('Requesting local stream');
  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true
  })
  .then(gotStream)
  .catch(function(e) {
    alert('getUserMedia() error: ' + e.name);
  });
}

function gotStream(stream) {
  console.log('Received local stream');
  playStream("localStream", stream);
}
//End

function call() {
	var servers = null;
	////////////////////////////////////////////////
	pc1 = new RTCPeerConnection(servers);
	console.log('Created remote peer connection object pc2');
	pc1.onicecandidate = function(e) {
	    onIceCandidate(pc1, e);
	};

	pc2 = new RTCPeerConnection(servers);
  	console.log('Created remote peer connection object pc2');
  	pc2.onicecandidate = function(e) {
    	onIceCandidate(pc2, e);
  	};
  	////////////////////////////////////////////////
  	pc1.oniceconnectionstatechange = function(e) {
    	onIceStateChange(pc1, e);
  	};
  	pc2.oniceconnectionstatechange = function(e) {
    	onIceStateChange(pc2, e);
  	};
  	////////////////////////////////////////////////
  	pc2.onaddstream = gotRemoteStream;

  	function gotRemoteStream(e) {
  		console.log("-----------------------------------------");
  		console.log(e.stream);
		playStream("remoteStream", e.stream);
		console.log('pc2 received remote stream');
	}
	///////////////////////////////////////////////
	pc1.addStream(localStream.srcObject); 
  	console.log('Added local stream to pc1');
  	///////////////////////////////////////////////
  	console.log('pc1 createOffer start');
  	pc1.createOffer(
    	offerOptions
  	).then(
    	onCreateOfferSuccess,
    	onCreateSessionDescriptionError
  	);

  	function onCreateOfferSuccess(desc) {
  		console.log('Offer from pc1\n' + desc.sdp);
  		console.log('pc1 setLocalDescription start');
  		///////////////////
  		pc1.setLocalDescription(desc).then(
    		function() {
      			onSetLocalSuccess(pc1); //TB
    		},
    		onSetSessionDescriptionError //TB
  		);
  		///////////////////
  		console.log('pc2 setRemoteDescription start');
  		pc2.setRemoteDescription(desc).then(
    		function() {
      			onSetRemoteSuccess(pc2); //TB
    		},
    		onSetSessionDescriptionError //TB
  		);
  		///////////////////
  		console.log('pc2 createAnswer start');
  		// Since the 'remote' side has no media stream we need
  		// to pass in the right constraints in order for it to
  		// accept the incoming offer of audio and video.
 		 pc2.createAnswer().then(
    		onCreateAnswerSuccess,
   			onCreateSessionDescriptionError //TB
  		);
	}

	function onCreateAnswerSuccess(desc) {
  		console.log('Answer from pc2:\n' + desc.sdp);
  		console.log('pc2 setLocalDescription start');
  		////////////////
  		pc2.setLocalDescription(desc).then(
		    function() {
		      	onSetLocalSuccess(pc2); //TB
		    },
    		onSetSessionDescriptionError //TB
  		);
  		////////////////
  		console.log('pc1 setRemoteDescription start');
  		pc1.setRemoteDescription(desc).then(
    		function() {
      			onSetRemoteSuccess(pc1); //TB
    		},
    		onSetSessionDescriptionError //TB
  		);
	}

	function onIceCandidate(pc, event) {
  		getOtherPc(pc).addIceCandidate(event.candidate)
  		.then(
    		function() {
      			onAddIceCandidateSuccess(pc);
    		},
    		function(err) {
      			onAddIceCandidateError(pc, err);
    		}
  		);
  		console.log(getName(pc) + ' ICE candidate: \n' + (event.candidate ? event.candidate.candidate : '(null)'));
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

	function hangup() {
  		trace('Ending call');
  		pc1.close();
  		pc2.close();
  		pc1 = null;
  		pc2 = null;
	}


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
}