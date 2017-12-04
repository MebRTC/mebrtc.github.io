//Declare var, const
const socket = io('https://socketiomanhnv.herokuapp.com/')
var pc;
var configuration = {'iceServers': [{ 'url': 'stun:stun.l.google.com:19302' }]};
var optional = {optional: [{DtlsSrtpKeyAgreement: true}]};
var offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

//Listener socket
socket.on('CALL_SOCKET_CLIENT', evt => {
    if (!pc){
        updateStatusCall("Calling...");
        start(false);
    }
    let {sdp, candidate} = evt;
    // If var sdp exist then setRemoteDescription(sdp PC remote)
    if (sdp){
        pc.setRemoteDescription(sdp).then(
            function() {
                onSetRemoteSuccess(pc); //TB
            },
            onSetSessionDescriptionError //TB
        );
    }
    else{
        //Add Ice Candidate of PC remote
        pc.addIceCandidate(candidate)
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
    console.log("isCaller " + isCaller);
    pc = new RTCPeerConnection(configuration, optional);
    // send any ice candidates to the other peer
    pc.onicecandidate = function (evt) {
        socket.emit("CALL_SOCKET_SERVER", {candidate: evt.candidate});
    };

    // once remote stream arrives, show it in the remote video element
    pc.onaddstream = function (evt) {
        playStream("remoteStream", evt.stream);
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
    const config = {audio: false, video: true};
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



