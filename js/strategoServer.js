/**
 * The entire strategoServer is one self executing function.
 * It handles all the incoming messages from the clients
 * and contains objects defining all the current connections
 * and games that are being played.
 * @function
 */
(function() {
	var verbose = 0;

	var WebSocket = require('ws');

	var options = {
		port: 8080
		, clientTracking : 'true'
	}

	var wss = new WebSocket.Server(options);
	var connections = {};
	var connectionCounter = 0;
	var games = {};
	var gameCounter = 0;

	/**
	 * This is a built-in websocket function that we call when a connection is made.
	 * The function adds handlers for message and close events by the client.
	 * @function
	 * @param {object} ws
	 */
	wss.on('connection', function connection(ws) {

		/**
		 * This is a built-in websocket function that we call when a message 
		 * is sent to the server from the client. The message is always JSON
		 * and always is one of our predefined actions. Connected, joinGame, ready,
		 * move, rematch, foreit. We process the message and always respond with a 
		 * message of our own to progress the game.
		 * @function
		 * @param {object} message
		 */
		ws.on('message', function incoming(message) {
			var json = JSON.parse(message);
			var action = json['action'];
			var clientID = ws['id'];
			var whichPlayer = 0;
			var gameID = 0;
			log("")
			log(Date().toLocaleString())

			if (action !== "connected" && action !== "joinGame") {
				gameID = json['gameID'];

				if (games[gameID]['player1'] === clientID) {
					whichPlayer = 1;
				} else if (games[gameID]['player2'] === clientID) {
					whichPlayer = 2;
				}
			}
			
			switch (action) {
				case 'connected':
					connectionCounter++;
					ws.id = connectionCounter;
					connections[connectionCounter] = ws;
					if (gameCounter === 0) {
			    		initGame(++gameCounter);
					} else if (games[gameCounter]['players'] === 2) {
						initGame(++gameCounter);
					}
			    	break;
				case 'joinGame':
			    	if(games[gameCounter]['players'] === 0) {
			    		games[gameCounter]['players'] = 1;
			    		games[gameCounter]['player1'] = clientID;
			    		games[gameCounter]['playState'] = 1;

			    		sendToPlayer1(gameCounter, "assignPlayer1");
			    	} else if(games[gameCounter]['players'] === 1) {
			    		games[gameCounter]['players'] = 2;
			    		games[gameCounter]['player2'] = clientID;
			    		games[gameCounter]['playState'] = 2;

			    		sendToPlayer2(gameCounter, "assignPlayer2");
			    		sendToAllPlayers(gameCounter, "boardPlace");
			    	}
			    	break;
			  	case 'ready':
			    	if (games[gameID]['player1'] === clientID && games[gameID]['playState'] === 2) {
			    		games[gameID]['playState'] = 3;
			    		boardStateInit(gameID, json['boardState'], 1);
			    		sendToAllPlayers(gameID, "player1Ready");
			    		log("P1 Ready");
			    	} else if (games[gameID]['player1'] === clientID && games[gameID]['playState'] === 4) {
			    		games[gameID]['playState'] = 6;
			    		boardStateInit(gameID, json['boardState'], 1);
			    		sendToAllPlayers(gameID, "startGame");
			    		sendToAllPlayers(gameID, "player1Turn");
			    		log("P1 Ready, Start Game");
			    	} else if (games[gameID]['player2'] === clientID && games[gameID]['playState'] === 2) {
			    		games[gameID]['playState'] = 4;
			    		boardStateInit(gameID, json['boardState'], 2);
			    		sendToAllPlayers(gameID, "player2Ready");
			    		log("P2 Ready");
			    	} else if (games[gameID]['player2'] === clientID && games[gameID]['playState'] === 3) {
			    		games[gameID]['playState'] = 6;
			    		boardStateInit(gameID, json['boardState'], 2);
			    		sendToAllPlayers(gameID, "startGame");
			    		sendToAllPlayers(gameID, "player1Turn");
			    		log("P2 Ready, Start Game");
			    	}
			    	log("Board State:")
			    	log(json['boardState'])
			    	break;
			  	case 'move':
			  		var originTile = json['originTile'];
			  		var destinationTile = json['destinationTile'];
			  		var originTilePiece = games[gameID]['boardState'][originTile]['piece'];
			  		var destinationTilePiece = games[gameID]['boardState'][destinationTile]['piece'];
			  		log("Origin Tile Piece: " + originTilePiece)
			  		log("Destinination Tile Piece: " + destinationTilePiece)
			  		
			  		if (games[gameID]['boardState'][destinationTile]['player'] == 0) { // if the destination is empty
			  			boardStateUpdate(gameID, whichPlayer, "emptyMove", originTile, destinationTile, originTilePiece, destinationTilePiece);
			  			sendToAllPlayers(gameID, "boardUpdate", "emptyMove", originTile, destinationTile);
			  		} else if (originTilePiece == destinationTilePiece) { //if they are the same piece
			  			boardStateUpdate(gameID, whichPlayer, "challengeMet", originTile, destinationTile, originTilePiece, destinationTilePiece);
			  			sendToAllPlayers(gameID, "boardUpdate", "challengeMet", originTile, destinationTile, originTilePiece, destinationTilePiece);
			  		} else if (destinationTilePiece == "B" && originTilePiece != 3) { //bomb makes a mutual kill
			  			boardStateUpdate(gameID, whichPlayer, "challengeMet", originTile, destinationTile, originTilePiece, destinationTilePiece);
			  			sendToAllPlayers(gameID, "boardUpdate", "challengeMet", originTile, destinationTile, originTilePiece, destinationTilePiece);
			  		} else if (destinationTilePiece == "B" && originTilePiece == 3) { // miner beats bomb
			  			boardStateUpdate(gameID, whichPlayer, "challengeWon", originTile, destinationTile, originTilePiece, destinationTilePiece);
			  			sendToAllPlayers(gameID, "boardUpdate", "challengeWon", originTile, destinationTile, originTilePiece, destinationTilePiece);
			  		} else if (destinationTilePiece == "F") { // flag always loses, rip
			  			boardStateUpdate(gameID, whichPlayer, "challengeWon", originTile, destinationTile, originTilePiece, destinationTilePiece);
			  			sendToAllPlayers(gameID, "boardUpdate", "challengeWon", originTile, destinationTile, originTilePiece, destinationTilePiece);
			  			sendToAllPlayers(gameID, "gameOver", whichPlayer);
			  			resetGame(gameID);
			  		} else if (originTilePiece == "S" && destinationTilePiece == 10) { // spy initiating on 10 always wins
			  			boardStateUpdate(gameID, whichPlayer, "challengeWon", originTile, destinationTile, originTilePiece, destinationTilePiece);
			  			sendToAllPlayers(gameID, "boardUpdate", "challengeWon", originTile, destinationTile, originTilePiece, destinationTilePiece);
			  		} else if (destinationTilePiece == "S") { // spy getting attacked always loses
			  			boardStateUpdate(gameID, whichPlayer, "challengeWon", originTile, destinationTile, originTilePiece, destinationTilePiece);
			  			sendToAllPlayers(gameID, "boardUpdate", "challengeWon", originTile, destinationTile, originTilePiece, destinationTilePiece);
			  		} else if (originTilePiece == "S") {
			  			boardStateUpdate(gameID, whichPlayer, "challengeLost", originTile, destinationTile, originTilePiece, destinationTilePiece);
			  			sendToAllPlayers(gameID, "boardUpdate", "challengeLost", originTile, destinationTile, originTilePiece, destinationTilePiece);
			  		} else if (originTilePiece == 10) {
			  			boardStateUpdate(gameID, whichPlayer, "challengeWon", originTile, destinationTile, originTilePiece, destinationTilePiece);
			  			sendToAllPlayers(gameID, "boardUpdate", "challengeWon", originTile, destinationTile, originTilePiece, destinationTilePiece);
			  		} else if (destinationTilePiece == 10) {
			  			boardStateUpdate(gameID, whichPlayer, "challengeLost", originTile, destinationTile, originTilePiece, destinationTilePiece);
			  			sendToAllPlayers(gameID, "boardUpdate", "challengeLost", originTile, destinationTile, originTilePiece, destinationTilePiece);
			  		} else if (originTilePiece > destinationTilePiece) {
			  			boardStateUpdate(gameID, whichPlayer, "challengeWon", originTile, destinationTile, originTilePiece, destinationTilePiece);
			  			sendToAllPlayers(gameID, "boardUpdate", "challengeWon", originTile, destinationTile, originTilePiece, destinationTilePiece);
			  		} else if (originTilePiece < destinationTilePiece) {
			  			boardStateUpdate(gameID, whichPlayer, "challengeLost", originTile, destinationTile, originTilePiece, destinationTilePiece);
			  			sendToAllPlayers(gameID, "boardUpdate", "challengeLost", originTile, destinationTile, originTilePiece, destinationTilePiece);
			  		} 

			  		if (games[gameID]['player1'] === clientID) {
			  			sendToAllPlayers(gameID, "player2Turn");
			  		} else {
			  			sendToAllPlayers(gameID, "player1Turn");
			  		}

			  		break;
			  	case 'rematch':
			  		if(games[gameID]['players'] === 0) {
			  			games[gameID]['players'] = 1;
			  			games[gameID]['player1'] = clientID;
			  			games[gameID]['playState'] = 1;

			  			sendToPlayer1(gameID, "assignPlayer1");
			  		} else if(games[gameID]['players'] === 1) {
			  			games[gameID]['players'] = 2;
			  			games[gameID]['player2'] = clientID;
			  			games[gameID]['playState'] = 2;

			  			sendToPlayer2(gameID, "assignPlayer2");
			  			sendToAllPlayers(gameID, "boardPlace");
			  		}
			  		break;
			  	case 'forfeit':
			    	break;
			  	default:
			    	break;
			}

			log("Client: " + ws['id']);
			log("Action: " + action);
			log("Game ID: " + gameID)
			log("Game Counter: " + gameCounter)
			log("")
		});

		/**
		 * This is a built-in websocket function that we call when a connection is closed.
		 * The function removes them from our current connections list and also
		 * resets any games they were involved in.
		 * @function
		 * @param {int} code
		 * @param {string} reason
		 */
		ws.on('close', function close(code, reason) {
			//when we detect a closed connection, remove from our list
			for (var key in connections) {
				var readyState = connections[key]['readyState'];
				var connectionID = connections[key]['id'];
				var gameID = findGameID(connectionID);

				// if the connection was a player in a game, end that game
				if (gameID !== 0) {
					if (connectionID == games[gameID]['player1'] && (readyState === 2 || readyState === 3)) {
						games[gameID]['players'] = 1;
						games[gameID]['player1'] = 0;
						games[gameID]['playState'] = 1;
						sendToAllPlayers(gameID, "restartGame", 1);
					} else if (connectionID == games[gameID]['player2'] && (readyState === 2 || readyState === 3)) {
						games[gameID]['players'] = 1;
						games[gameID]['player2'] = 0;
						games[gameID]['playState'] = 1;
						sendToAllPlayers(gameID, "restartGame", 2);
					}
				}
				delete connections[connectionID];
			}
		})
	});

	/**
	 * This is a helper function used when a new game needs to be created. 
	 * Valid playstates are 0 - not started,
	 * 1 - Waiting for more, 2 - Placing pieces, 3 - Player 1 ready,
	 * 4 - Player 2 ready, 5 - Game start, 6 - Player 1 turn, 7 - Player 2 turn
	 * @function
	 * @param {int} gc - the gameID
	 */
	function initGame(gc) {
		games[gc] = {};
		games[gc]["playState"] = 0;
		games[gc]["players"] = 0;
		games[gc]["player1"] = 0;
		games[gc]["player2"] = 0;
		games[gc]["boardState"] = {};

		for (var i = 0; i < 100; i++) {
			games[gc]['boardState'][i] = {"player" : 0, "piece" : 0};
		}
	}

	/**
	 * This is a helper function used when a new game needs to be reset. 
	 * This is called to help with a rematch.
	 * @function
	 * @param {int} gc - the game ID
	 */
	function resetGame(gc) {
		games[gc]["playState"] = 0;
		games[gc]["players"] = 0;
		games[gc]["player1"] = 0;
		games[gc]["player2"] = 0;
		games[gc]["boardState"] = {};

		for (var i = 0; i < 100; i++) {
			games[gc]['boardState'][i] = {"player" : 0, "piece" : 0};
		}
	}

	/**
	 * This is a helper function used to initiate the boardState object for the server.
	 * This object is the representation of the current state of the game board.
	 * @function
	 * @param {int} gc - the game ID
	 * @param {object} sentBoardState - object of
	 * @param {int} player - player 1 or 2
	 */
	function boardStateInit(gID, sentBoardState, player) {
		if (player === 1) {
			for (var i = 0; i < 40; i++) {
				games[gID]['boardState'][i]['player'] = 1;
				games[gID]['boardState'][i]['piece'] = sentBoardState[i];
			}
		} else if (player === 2) {
			for (var i = 60; i < 100; i++) {
				games[gID]['boardState'][i]['player'] = 2;
				games[gID]['boardState'][i]['piece'] = sentBoardState[i];
			}
		}
	}

	/**
	 * This is a helper function used to return the gameID that a given client is in.
	 * @function
	 * @param {int} cID - the client ID
	 * @return {int} 
	 */
	function findGameID (cID) {
		for (var key in games) {
			if (games[key]['player1'] === cID
				|| games[key]['player2'] === cID) {
				return key;
			}
		}
		return 0;
	}

	/**
	 * This is a helper function used to send a message to all players of a certain game.
	 * @function
	 * @param {int} gID - the game ID
	 * @param {string} action - what action to send the client
	 * @param {string} boardAction - what piece interaction is happening in a move action. 
	 * emptyMove - a piece moves into an empty tile, challengeLost - the initiate lost,
	 * challengeWon - the initiate won, challengeMet - the two pieces drew
	 * @param {string} originTile - id of the tile where the move originated
	 * @param {string} destinationTile - id of the tile where the move ended
	 * @param {string} originTilePiece - piece that was on the origin tile
	 * @param {string} destinationTilePiece - piece that was on the destination tile
	 */
	function sendToAllPlayers(gID, action, boardAction, originTile, destinationTile, originTilePiece, destinationTilePiece) {
		for (var key in connections) {
			var readyState = connections[key]['readyState'];
			if (readyState === 1) {
				if(connections[key]['id'] === games[gID]['player1'] 
					|| connections[key]['id'] === games[gID]['player2']) {
					if (action === "boardUpdate" && boardAction !== "emptyMove") {
						connections[key].send(JSON.stringify({
							"action" : action
							, "boardAction" : boardAction
							, "beforeTile" : originTile
							, "afterTile" : destinationTile
							, "beforeTilePiece" : originTilePiece
							, "afterTilePiece" : destinationTilePiece
						}))
					} else if (action === "boardUpdate") {
						connections[key].send(JSON.stringify({
							"action" : action
							, "boardAction" : boardAction
							, "beforeTile" : originTile
							, "afterTile" : destinationTile
						}))
					} else if (action === "gameOver") {
						connections[key].send(JSON.stringify({
							"action" : action
							, "player" : boardAction
						}));
					} else if (action === "restartGame") {
						games[gID]['players'] = 0;
						games[gID]['playState'] = 0;
						games[gID]['player1'] = 0;
						games[gID]['player2'] = 0;

						for (var i = 0; i < 100; i++) {
							games[gID]['boardState'][i] = {"player" : 0, "piece" : 0};
						}
						connections[key].send(JSON.stringify({
							"action" : action
							, "player" : boardAction
						}));
					} else {
						connections[key].send(JSON.stringify({"action" : action}));
					}
				}
			}
		}
	}

	/**
	 * This is a helper function used to send a message to a given clientID
	 * @function
	 * @param {int} gID - the gameID
	 * @param {string} action - what action to send
	 */
	function sendToClientID(cID, action) {
		for (var key in connections) {
			if(connections[key]['id'] === cID) {
				connections[key].send(JSON.stringify({
					"action" : action
					, "gameID" : gameCounter
				}));
			}
		}	
	}

	/**
	 * This is a helper function used to send a message to player 2 in the given game
	 * @function
	 * @param {int} gID - the gameID
	 * @param {string} action - what action to send
	 */
	function sendToPlayer1(gID, action) {
		for (var key in connections) {
			if(connections[key]['id'] === games[gID]['player1']) {
				connections[key].send(JSON.stringify({
					"action" : action
					, "gameID" : gID
				}));
			}
		}	
	}

	/**
	 * This is a helper function used to send a message to player 2 in the given game
	 * @function
	 * @param {int} gID - the gameID
	 * @param {string} action - what action to send
	 */
	function sendToPlayer2(gID, action) {
		for (var key in connections) {
			if(connections[key]['id'] === games[gID]['player2']) {
				connections[key].send(JSON.stringify({
					"action" : action
					, "gameID" : gID
				}));
			}
		}
	}

	/**
	 * This is a helper function used to update the boardState object after a move
	 * from the client
	 * @function
	 * @param {int} gID - the game ID
	 * @param {int} player - which player started the move
	 * @param {string} actionType - what piece interaction is happening in a move action. 
	 * @param {string} originTile - id of the tile where the move originated
	 * @param {string} destinationTile - id of the tile where the move ended
	 * @param {string} originTilePiece - piece that was on the origin tile
	 * @param {string} destinationTilePiece - piece that was on the destination tile
	 */
	function boardStateUpdate(gID, player, actionType, originTile, destinationTile, originTilePiece, destinationTilePiece) {
		//in every case, the origin tile will be empty
		games[gID]['boardState'][originTile]['player'] = 0;
		games[gID]['boardState'][originTile]['piece'] = 0;
		switch (actionType) {
			case "emptyMove" :
				games[gID]['boardState'][destinationTile]['player'] = player;
				games[gID]['boardState'][destinationTile]['piece'] = originTilePiece;
				break;
			case "challengeMet" :
				games[gID]['boardState'][destinationTile]['player'] = 0;
				games[gID]['boardState'][destinationTile]['piece'] = 0;
				break;
			case "challengeWon" :
				games[gID]['boardState'][destinationTile]['player'] = player;
				games[gID]['boardState'][destinationTile]['piece'] = originTilePiece;
				break;
			case "challengeLost" :
				//the only thing that happens is the first two lines of this function
				break;
		}
	}

	/**
	 * This is a helper function used to control my log statements.
	 * @function
	 * @param {string} message - what to print out
	 */
	function log(message) {
		if (verbose === 1) {
			console.log(message);
		}
	}

})();