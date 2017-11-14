function openStream(){
    let config = {audio: false, video: true};
    return navigator.mediaDevices.getUserMedia(config);
}

function playStream(idVideoTag ,stream){
    let video = document.getElementById(idVideoTag);
    video.srcObject = stream;
    video.play();
}

// openStream()
// .then(stream => {
//     playStream("localStream", stream);
// })

const peer = new Peer({key: "peerjs", host: 'peeranhlh2.herokuapp.com', secure: true, port: 443});

peer.on('open', id => {
    $('#myPeer').append(id);
});

//caller
$('#call').click(()=>{
    let id = $('#remoteId').val();
    openStream()
    .then(stream => {
        playStream("localStream", stream);
        let call = peer.call(id, stream);
        call.on('stream', remoteStream => {
            playStream("remoteStream", remoteStream);
        });
    })
});

peer.on('call', call => {
    openStream()
    .then(stream => {
        call.answer(stream);
        playStream("localStream", stream);
        call.on('stream', remoteStream => {
            playStream("remoteStream", remoteStream);
        });
    })
});