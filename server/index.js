const io 	= require('socket.io')(process.env.PORT || 3000);
let arrUser = [];

io.on('connection', socket => {
	socket.on("USER_REGISTER", userInfo => {
		let isExist = arrUser.some(e => e.userName === userInfo.userName)
		socket.peerId = userInfo.peerId
		if(isExist){
			return socket.emit("USER_TONTAI");
		}
		arrUser.push(userInfo);
		socket.emit("USER_LIST", arrUser);
		socket.broadcast.emit("USER_NEW", userInfo);
	});

	socket.on("disconnect", () => {
		let index = arrUser.findIndex(user => user.peerId === socket.peerId)
		arrUser.splice(index,1);
		io.emit("USER_DISCONNECT" , socket.peerId);
	})
})