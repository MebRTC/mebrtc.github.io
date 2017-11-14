const socket = io('http://sockets.edubig.vn/')
$('#info').hide();

socket.on('USER_LIST', arrUser => {
	$('#info').show();
	$('#register').hide();
	arrUser.map(userInfo => {
		let {userName, peerId} = userInfo;
		$('#listUser').append(`<li id="${peerId}">${userName}</li>`)
	})
	socket.on('USER_NEW', userInfo => {
		let {userName, peerId} = userInfo;
		$('#listUser').append(`<li id="${peerId}">${userName}</li>`)
	});
});

socket.on("USER_TONTAI", () => {
	alert("Username da ton tai !");
})

socket.on("USER_DISCONNECT", peerId => {
	$(`#${peerId}`).remove();
})

function openStream(){
	const config = {audio: false, video: true};
	return navigator.mediaDevices.getUserMedia(config);
}

function playStream(idVideoTag, stream){
	const video = document.getElementById(idVideoTag);
	video.srcObject = stream;
	video.play();
}

const peer = new Peer({key: "peerjs", host: 'peeranhlh2.herokuapp.com', secure: true, port: 443});

peer.on('open', id => {
	$('#myPeer').append(id);

	$('#btnSignUp').click(() => {
		const userName = $('#userName').val();
		socket.emit("USER_REGISTER", {userName: userName ,peerId: id});
	});
});

//Caller
$('#btnCall').click(() => {
	const id = $('#remoteId').val();
	openStream()
	.then( stream => {
		playStream("localStream", stream);
		const call = peer.call(id, stream);
		call.on('stream', remoteStream => playStream("remoteStream", remoteStream));
	})
})

//Receiver
peer.on('call', call => {
	openStream()
	.then(stream => {
		call.answer(stream);
		playStream("localStream", stream);
		call.on('stream', remoteStream => playStream("remoteStream", remoteStream));
	})
});

$('#listUser').on('click','li', function(){
	let id = $(this).attr('id');
	$('#myPeer').append(id);
	openStream()
	.then( stream => {
		playStream("localStream", stream);
		const call = peer.call(id, stream);
		call.on('stream', remoteStream => playStream("remoteStream", remoteStream));
	})
})