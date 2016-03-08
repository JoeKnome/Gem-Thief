"use strict";

// CLASS: handles an instance of Gem Thief
class GameManager {
	constructor(io, roomName, player1, player2) {
		this.io = io;
		this.room = roomName;
		this.p1 = player1;
		this.p2 = player2;
		// pass new players to handlers
		this.onUpdate(p1);
		this.onUpdate(p2);
		this.onClick(p1);
		this.onClick(p2);
		this.onRelease(p1);
		this.onRelease(p2);
		
		// set screen size
		this.screen.x = 640;
		this.screen.y = 480;
		
		// size constants
		var playerRad = 3;
		var gemRad = 10;
		var goalWidth = 100;
		
		// set players to default starting locations
		this.p1.pos = {
			x: 15,
			y: this.screen.y / 2
		};
		this.p2.pos = {
			x: this.screen.x - 15,
			y: this.screen.y / 2
		};
		
		// randomly create gems
		this.gems = [];
		for (var i = 0; i < 20; i++) {
			var newGem = {};
			newGem.pos.x = (Math.random() * (this.screen.x - (2 * goalWidth) - (2 * gemRad)) + goalWidth + gemRad);
			newGem.pos.y = (Math.random() * (this.screen.y - (2 * gemRad)) + gemRad);
			this.gems.push(newGem);
		}
		
		// update player 1
		this.p1.emit("msg", {msg: "Game started. You are playing against " + this.p2.name + "."});
		this.p1.emit(
			"update",
			{
				object: "player",
				pos: this.p1.pos,
				side: 0
			}
		);
		this.p1.emit(
			"update",
			{
				object: "opponent",
				name: this.p2.name,
				pos: this.p2.pos,
				side: 1
			}
		);
		this.p1.emit(
			"update",
			{
				object: "gems",
				gems: this.gems
			}
		);
		
		// update player 2
		this.p2.emit("msg", {msg: "Game started. You are playing against " + this.p1.name + "."});
		this.p2.emit(
			"update",
			{
				object: "player",
				pos: this.p2.pos,
				side: 1
			}
		);
		this.p2.emit(
			"update",
			{
				object: "opponent",
				name: this.p1.name,
				pos: this.p1.pos,
				side: 0
			}
		);
		this.p2.emit(
			"update",
			{
				object: "gems",
				gems: this.gems
			}
		);
		
		// start player update loops
		this.io.sockets.in(this.room).emit("beginPlay");
	}
	
	// Callback for user update
	onUpdate(socket) {
		socket.on("update", function(data) {
			socket.pos = data.pos;
			socket.broadcast.to(socket.room).emit(
				"update", 
				{ 
					object: "opponent", 
					pos: data.pos 
				}
			);
		});
	}
	
	// Callback for user click
	onClick(socket) {
		socket.on("click", function(data) {
			// check click against all gems, starting from the closest to the camera
			for (var i = gems.length - 1; i >= 0; i--) {
				if(distance(data.pos, gems[i].pos) < (gemRad + playerRad)) {
					// remove clicked gem from world array
					delete gems[i];
					
					// update players of interaction
					this.io.sockets.in(this.room).emit(
						"update",
						{
							object: "gems",
							gems: this.gems
						}
					);
					
					socket.emit(
						"update",
						{
							object: "player",
							grabbed: 1
						}
					);
					
					socket.broadcast.to(socket.room).emit(
						"update",
						{
							object: "opponent",
							grabbed: 1
						}
					);
					
					return;
				}
			}
		});
	}
	
	// Callback for user click release
	onRelease(socket) {
		socket.on("release", function(data) {
			// make sure player has a gem grabbed
			if(socket.grabbed) {
				// add new gem to world where player dropped it
				var newGem = {
					pos: {
						x: socket.pos.x,
						y: socket.pos.y
					}
				}
				
				this.gems.push(newGem);
				
				// update players of interaction
				this.io.sockets.in(this.room).emit(
					"update",
					{
						object: "gems",
						gems: this.gems
					}
				);
				
				socket.emit(
					"update",
					{
						object: "player",
						grabbed: 0
					}
				);
				
				socket.broadcast.to(socket.room).emit(
					"update",
					{
						object: "opponent",
						grabbed: 0
					}
				);
				
				// check for scored point
				checkScore();
			}
		});
	}
	
	// FUNCTION: distance formula
	distance(a, b) {
		return Math.sqrt(Math.pow(b.pos.x - a.pos.x, 2) + Math.pow(b.pos.y - a.pos.y, 2));
	}
	
	// FUNCTION: check gems to see if a point has been scored
	checkScore() {
		for (var i = 0; i < this.gems.length; i++) {
			// player 1 scores
			if(this.gems[i].pos.x < (this.goalWidth - this.gemRad)) {
				// remove scored gem
				delete this.gems[i];
				i--;
				
				// notify of score
				this.io.sockets.in(this.room).emit(
					"update",
					{
						object: "gems",
						gems: this.gems
					}
				);
				
				this.io.sockets.in(this.room).emit("score", {side: 0});
			}
			
			// player 2 scores
			else if(this.gems[i].pos.x > (this.screen.x - this.goalWidth + this.gemRad)) {
				// remove scored gem
				delete gems[i];
				i--;
				
				// notify of score
				this.io.sockets.in(this.room).emit(
					"update",
					{
						object: "gems",
						gems: this.gems
					}
				);
				
				this.io.sockets.in(this.room).emit("score", {side: 1});
			}
		}
		
		// check for win
		if(this.gems.length === 0) {
			// player 1 wins
			if(this.p1.score > this.p2.score) {
				this.io.sockets.in(this.room).emit("end", {side: 0});
			}
			
			// player 2 wins
			else if(this.p2.score > this.p1.score) {
				this.io.sockets.in(this.room).emit("end", {side: 1});
			} 
			
			// tie
			else {
				this.io.sockets.in(this.room).emit("end", {side: 2});
			} 
		}
	}
}

// export game manager as a module
module.exports = GameManager;