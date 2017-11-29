const socket = io('https://socketiomanhnv.herokuapp.com/')
$('#info').hide();

socket.on('USER_LIST', arrUser => {
	console.log(arrUser);
	$('#info').show();
	$('#register').hide();
	arrUser.map(userInfo => {
		let {userName, peerId} = userInfo;
		$('#listUser').append(`<li id="${peerId}">${userName}</li>`)
	})
	socket.on('USER_NEW', userInfo => {
		console.log(userInfo);
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


const peer = new Peer({key: "peerjs", host: 'webrtcmanhnv.herokuapp.com', secure: true, port: 443});

peer.on('open', id => {
	console.log("123");
	$('#myPeer').append(id);

	$('#btnSignUp').click(() => {
		const userName = $('#userName').val();
		socket.emit("USER_REGISTER", {userName: userName ,peerId: id});
		console.log("userName");
		openStream()
			.then( stream => {
				playStream("localStream", stream);
			})
	});
});

// //Caller
// $('#btnCall').click(() => {
// 	const id = $('#remoteId').val();
// 	openStream()
// 	.then( stream => {
// 		playStream("localStream", stream);
// 		const call = peer.call(id, null);
// 		call.on('stream', remoteStream => playStream("remoteStream", remoteStream));
// 	})
// })

//Receiver
peer.on('call', call => {
	openStream()
	.then(stream => {
		call.answer(null);
		// playStream("localStream", stream);
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