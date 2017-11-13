function openStream(){
    let config = {audio: false, video: true}
    return navigator.mediaDevices.getUserMedia(config);
}

function playStream(idVideoTag ,stream){
    let video = document.getElementById(idVideoTag);
    video.srcObject = stream;
    video.play();
}

openStream()
.then(stream => {
    playStream("localStream", stream)
})