/**
 * This is a self executing function used to intitialize the game board
 * @function
 */
$(function () {
	for(i = 0; i < 10; i++) {
		var rowDiv = document.createElement("div");
		rowDiv.className = "boardRow";
		rowDiv.id = "boardRow" + i;

		document.getElementById("gameBoard").appendChild(rowDiv);

		for (j = 0; j < 10; j++) {
			var tileDiv = document.createElement("div");
			if (i === 0) {
				tileDiv.id = "t" + j;
			} else {
				tileDiv.id = "t" + i + "" + j;
			}

			if (i < 4) {
				tileDiv.className = "tile player1";
				tileDiv.innerHTML = "player1";
			} else if (i > 5) {
				tileDiv.className = "tile player2";
				tileDiv.innerHTML = "player2";
			} else {
				tileDiv.className = "tile";
			}

			document.getElementById(rowDiv.id).appendChild(tileDiv);
		}
	}
	// removing the lakes tiles that are not the top left tile
	$("#t42, #t43, #t46, #t47, #t52, #t53, #t56, #t57").addClass("lakeTile");
	$("#t42, #t43, #t46, #t47, #t52, #t53, #t56, #t57").removeClass("tile");
});

/**
 * This is a self executing function used to define the
 * entire client
 * @function
 */
$(function () {
    
    //initialize all the variables we need
    window.WebSocket = window.WebSocket || window.MozWebSocket;
   	var connection = new WebSocket('ws://willdriscoll.io:8080');

    var submit = $("#submit")
    var status = $("#status");
    var lastAction = $("#lastActionSpan");
    var playersReady = $("#playersReady");
    var playerDiv = $("#player");

    var playState = 0;
    var whichPlayer = 0;
    var pieceToPlace = 0;
    var tileSelected = 0;
    var originTile = 0;
    var destinationTile = 0;
    var gameID = 0;
    var verbose = 0;

    var boardState = {};

    var player1Pieces = {
    	"10" : 1
    	, "9" : 1
    	, "8" : 2
    	, "7" : 3
    	, "6" : 4
    	, "5" : 4
    	, "4" : 4
    	, "3" : 5
    	, "2" : 8
    	, "S" : 1
    	, "B" : 6
    	, "F" : 1
    }

    var player2Pieces = {
    	"10" : 1
    	, "9" : 1
    	, "8" : 2
    	, "7" : 3
    	, "6" : 4
    	, "5" : 4
    	, "4" : 4
    	, "3" : 5
    	, "2" : 8
    	, "S" : 1
    	, "B" : 6
    	, "F" : 1
    }

    var originalPieceCount = {
    	"10" : 1
    	, "9" : 1
    	, "8" : 2
    	, "7" : 3
    	, "6" : 4
    	, "5" : 4
    	, "4" : 4
    	, "3" : 5
    	, "2" : 8
    	, "S" : 1
    	, "B" : 6
    	, "F" : 1
    }

    var unclickableTiles = [42, 43, 46, 47, 52, 53, 56, 57];

    /**
     * This is a built-in websocket function that we call when
     * a connection is made.
     * We send a message telling the server we connected.
     * @function
     */
    connection.onopen = function () {
    	connection.send(JSON.stringify({"action" : "connected"}));
    };

    /**
     * This is a built-in websocket function that we call when 
     * a connection errors. Then we close the connection.
     * @function
     */
    connection.onerror = function (error) {
        log("We errored. Closing connection.")
        connection.close();
    };

    
    /**
     * This is a built-in websocket function that we call when 
     * we receive a message from the server. It can be one of 12
     * different messages depending on the situation.
     * @function
     * @param {object} message - the json message from the server
     */
    connection.onmessage = function (message) {
        try {
            var json = JSON.parse(message.data);
        } catch (e) {
            log('This doesn\'t look like a valid JSON: ', message.data);
            return;
        }

        log(json);
        var action = json['action'];

        switch (action) {
        	// need one more to play the game
        	case 'waitingForMore':
        		status.html("Waiting for more...");
        		playersReady.html("1");
        		playState = 1;
        		break;
        	// you are player 1
        	case 'assignPlayer1':
        		gameID = json['gameID'];
        		log(gameID);
        		log(json['gameID']);
        		whichPlayer = 1;
        		playerDiv.html("You are Player 1.");
        		status.html("Waiting for more...");
        		playersReady.html("1");
        		playState = 1;
        		resetBoard();
        		break;
        	// you are player 2
        	case 'assignPlayer2':
        		gameID = json['gameID'];
        		log(gameID);
        		log(json['gameID']);
        		whichPlayer = 2;
        		playerDiv.html("You are Player 2.");
        		resetBoard();
        		break;
        	// both players may begin placing pieces
        	case 'boardPlace':
        		log("The game id is: " + gameID);
        		status.html("Opponent Found. Begin placing your pieces! Start by clicking the piece you want to place in the sidebar.");
        		playersReady.html("2");
        		$("#lastAction").addClass("hidden")
        		$("#lastActionSpan").html("")
        		// lastAction.addClass("hidden");
        		// lastAction.html("");
        		submit.attr({"value" : "ready"})
        		submit.html("Board Ready");
        		playState = 2;
        		$("#placePlayer").show();
        		break;
        	// player 1 has submitted a valid starting board state
        	case 'player1Ready':
        		if (whichPlayer === 2) {
        			status.html("Player 1 is ready, no pressure.");
        		} else {
        			status.html("Waiting on Player 2...");
        			submit.addClass("hidden");
        		}
        		playState = 3;
        		break;
        	// player 2 has submitted a valid starting board state
        	case 'player2Ready':
        		if (whichPlayer === 1) {
        			status.html("Player 2 is ready, no pressure.");
        		} else {
        			status.html("Waiting on Player 1...");
        			submit.addClass("hidden");
        		}
        		playState = 4;
        		break;
        	// the game has begun
        	case 'startGame':
        		if (whichPlayer === 1) {
        			status.html("Game started! Your turn first!");
        		} else {
        			status.html("Game started! Player 1 goes first!");
        		}
        		// submit.addClass += " hidden"
        		submit.addClass("hidden");
        		$("#lastAction").removeClass("hidden");
        		$("#gamesToJoin").addClass("hidden");
        		$("#placePlayer").hide();
        		resetPieceCount();
        		break;
        	// a player has made a successful move, the board needs to be updated
        	// based on the move
        	case 'boardUpdate' :
        		var boardAction = json['boardAction']; //emptyMove, challengeWon, challengeLost
        		var beforeTile = json['beforeTile'];
        		var afterTile = json['afterTile'];

        		if (boardAction !== "emptyMove") {
        			var beforeTilePiece = json['beforeTilePiece'];
        			var afterTilePiece = json['afterTilePiece'];
        		}

	        	removeFromPieceCount(boardAction, beforeTile, afterTile, beforeTilePiece, afterTilePiece);
        		
        		showAffectedTiles(boardAction, beforeTile, afterTile, beforeTilePiece, afterTilePiece);
        		break;
        	// it is player 1's turn
        	case 'player1Turn':
        		playState = 6;
        		tileSelected = 0;
        		$(".validMove").removeClass("validMove");
        		status.html("Player 1's turn!");
        		break;
        	// it is player 2's turn
        	case 'player2Turn':
        		playState = 7;
        		tileSelected = 0;
        		$(".validMove").removeClass("validMove");
        		status.html("Player 2's turn!");
        		break;
        	// one of the players has found the flag
        	case 'gameOver':
        		playState = 8;
        		tileSelected = 0;
        		var winner = json['player'];
        		lastAction.html(lastAction.html() + ". Player " + winner + " wins! Good game!");
        		disableBoard();
        		$(".validMove").removeClass("validMove");
        		submit.attr({"value" : "rematch"});
        		submit.html("Rematch");
        		submit.removeClass("hidden");
        		status.html("Game over!")
        		$("#submit").show();
        		break;
        	// the game has restarted due to a disconnect
        	case 'restartGame':
        		var disconnected = json['player'];
        		log("restart game " + disconnected);
        		status.html("Player " + disconnected + " has disconnected. The game has been reset.");
        		playersReady.html("0");
        		playState = 1;
        		whichPlayer = 0;
        		resetBoard();
        		$("#gamesToJoin").removeClass("hidden");
        		$("#placePlayer").show();
        		submit.attr({"value" : "joinGame"});
        		submit.html("Join");
        	default:
        		break;
        }
    };

    /**
     * This is a helper function to send a message based on the user hitting
     * the submit button
     * @function
     */
    submit.on("click", function() {
    	try {
    		var currentAction = submit.val();

    		if (currentAction === "ready") {
    			checkIfValidBoardStart();
    		} else {
    			log(gameID + " << GameID")
    			log()
    			connection.send(JSON.stringify({
    				"action" : currentAction
    				, "gameID" : gameID
    			}))
    		}
    	} catch (e) {
    		log("We errored on submit" + e)
    		return;
    	}

    	/**
    	 * This is a helper function to ensure the placement is valid
    	 * before sending the board placement off to the server
    	 * @function
    	 */
    	function checkIfValidBoardStart() {
    		if (whichPlayer === 1) {
    			var sum = 0;
    			for (var key in player1Pieces) {
    				sum+= player1Pieces[key];
    			}
    			if (sum === 0) {
    				buildBoardState();
    				log(boardState, 1);
    				connection.send(JSON.stringify({
    					"action" : "ready"
    					, "gameID" : gameID
    					, "boardState" : boardState}))
    			} else {
    				log("Not a valid configuration for P1." + sum)
    			}
    		} else if (whichPlayer === 2) {
    			var sum = 0;
    			for (var key in player2Pieces) {
    				sum+= player2Pieces[key];
    			}
    			if (sum === 0) {
    				buildBoardState();
    				log(boardState, 1);
    				connection.send(JSON.stringify({
    					"action" : "ready"
    					, "gameID" : gameID
    					, "boardState" : boardState}))
    			} else {
    				log("Not a valid configuration for P2." + sum)
    			}
    		}
    	}

    	
    	/**
    	 * This is a helper function to build the board state
    	 * we send to the server
    	 * @function
    	 */
    	function buildBoardState() {
    		if (whichPlayer === 1) {
    			for (var i = 0; i < 40; i++) {
    				var tempPiece = $("#t" + i).html();

    				//use charCodeAt to work with the unicode values for bomb/flag/spy
    				if (tempPiece.charCodeAt(0) == "55357") {
    					boardState[i] = "B";
		   			} else if (tempPiece.charCodeAt(0) == "9873") {
    					boardState[i] = "F";
		   			} else if (tempPiece.charCodeAt(0) == "55356") {
    					boardState[i] = "S";
		   			} else {
    					boardState[i] = tempPiece;
		   			}
    			}
    		} else {
    			for (var i = 60; i < 100; i++) {
    				var tempPiece = $("#t" + i).html();
    				if (tempPiece.charCodeAt(0) == "55357") {
    					boardState[i] = "B";
		   			} else if (tempPiece.charCodeAt(0) == "9873") {
    					boardState[i] = "F";
		   			} else if (tempPiece.charCodeAt(0) == "55356") {
    					boardState[i] = "S";
		   			} else {
    					boardState[i] = tempPiece;
		   			}
    			}
    		}
    	}
    })

    /**
     * This is a helper function to disable the board after the game ends
     * @function
     */
    function disableBoard() {
    	for (var i = 0; i < 100; i++) {
    		$("#t" + i).addClass("immovable");
    	}
    }

    /**
     * This is a helper function to facilitate with the board place process
     * for player 2
     * @function
     */
    $(".player1Pieces li").on("click", function() {
    	console.log("p1 pieces li")
    	if (whichPlayer === 1) {
    		var tempPieceToPlace = $(this).attr("class");
    		
    		if(player1Pieces[tempPieceToPlace] !== 0) {
    			pieceToPlace = tempPieceToPlace;
	    		$(".player1Pieces li").css({"background": ""})
	    		$(".player1Pieces ." + pieceToPlace).css({"background" : "lightblue"})
    		} else {
    			pieceToPlace = 0;
	    		$(".player1Pieces li").css({"background": ""})
    		}
    	}
    })

    /**
     * This is a helper function to facilitate with the board place process
     * for player 2
     * @function
     */
    $(".player2Pieces li").on("click", function() {
    	if (whichPlayer === 2) {
    		var tempPieceToPlace = $(this).attr("class");

    		if(player2Pieces[tempPieceToPlace] !== 0) {
    			pieceToPlace = tempPieceToPlace;
	    		$(".player2Pieces li").css({"background": ""})
	    		$(".player2Pieces ." + pieceToPlace).css({"background" : "lightblue"})
    		} 
    	}
    })

    /**
     * This is a helper function to facilitate with the board place process
     * for player 2
     * @function
     */
    $(".boardRow .player1").on("click", function() {
    	// this if allows you to pick up your pieces if you have none selected
    	if (whichPlayer === 1 && pieceToPlace === 0 && playState ==2) {
    		var currentPiece = $(this).html();
    		if (currentPiece !== "player1") {
				if (currentPiece.charCodeAt(0) == "55357") {
					currentPiece = "B";
	   			} else if (currentPiece.charCodeAt(0) == "9873") {
					currentPiece = "F";
	   			} else if (currentPiece.charCodeAt(0) == "55356") {
					currentPiece = "S";
	   			} 

    			var currentSpan = $(".piecesWrapper .player1Pieces ul ." + currentPiece + " span").html();
    			var currentRemaining = currentSpan.substring(currentSpan.length - 1);
    			$(".piecesWrapper .player1Pieces ul ." + currentPiece + " span").html("Remaining: " + (parseInt(currentRemaining) + 1));
    			$(this).html("player1");
    			player1Pieces[currentPiece] = player1Pieces[currentPiece] + 1;
    		}
    	}
    	if (whichPlayer === 1 && pieceToPlace !== 0) {
    		var currentPiece = $(this).html();

    		if (pieceToPlace === "S") {
    			$(this).html("&#127913;");
    		} else if (pieceToPlace === "B") {
    			$(this).html("&#128163;");
    		} else if (pieceToPlace === "F") {
    			$(this).html("&#9873;");
    		} else {
    			$(this).html(pieceToPlace);
    		}

    		if (pieceToPlace === "B" || pieceToPlace === "F") {
    			$(this).addClass("immovable");
    		}
    		
    		player1Pieces[pieceToPlace] = player1Pieces[pieceToPlace] - 1;
    		$(".player1Pieces li." + pieceToPlace + " span").html("Remaining: " + player1Pieces[pieceToPlace]);
    		
    		if (player1Pieces[pieceToPlace] === 0) {
    			$(".player1Pieces ." + pieceToPlace).css({"background" : ""});
    			var originalPiece = pieceToPlace;
    			if (pieceToPlace === "F") {
    				var nextPieceToPlace = "10";
    			} else {
    				var nextPieceToPlace = $(".player1Pieces ." + pieceToPlace).next().attr("class");
    			}
   				var placed = 0;
   				var counter = 0;
   				while (placed === 0) {
    				if (player1Pieces[nextPieceToPlace] > 0) {
		    			$(".player1Pieces ." + nextPieceToPlace).css({"background" : "lightblue"})
		    			pieceToPlace = nextPieceToPlace;
    					placed = 1;
    				} else if (originalPiece == nextPieceToPlace) {
    					pieceToPlace = 0;
    					placed = 1;
    				} else if (player1Pieces[nextPieceToPlace] === 0 && nextPieceToPlace === "F") {
    					nextPieceToPlace = "10";
    				} else {
    					nextPieceToPlace = $(".player1Pieces ." + nextPieceToPlace).next().attr("class");
    				}
    			}
    		}

    		if(currentPiece !== "player1") {
    			player1Pieces[currentPiece] = player1Pieces[currentPiece] + 1;
    			$(".player1Pieces li." + currentPiece + " span").html("Remaining: " + player1Pieces[currentPiece]);
    		}

    	}
    })

    /**
     * This is a helper function to facilitate with the board place process
     * for player 2
     * @function
     */
    $(".boardRow .player2").on("click", function() {
    	if (whichPlayer === 2 && pieceToPlace === 0 && playState ==2) {
    		var currentPiece = $(this).html();
    		if (currentPiece !== "player2") {
				if (currentPiece.charCodeAt(0) == "55357") {
					currentPiece = "B";
	   			} else if (currentPiece.charCodeAt(0) == "9873") {
					currentPiece = "F";
	   			} else if (currentPiece.charCodeAt(0) == "55356") {
					currentPiece = "S";
	   			} 

    			var currentSpan = $(".piecesWrapper .player2Pieces ul ." + currentPiece + " span").html();
    			var currentRemaining = currentSpan.substring(currentSpan.length - 1);
    			$(".piecesWrapper .player2Pieces ul ." + currentPiece + " span").html("Remaining: " + (parseInt(currentRemaining) + 1));
    			$(this).html("player2");
    			player2Pieces[currentPiece] = player2Pieces[currentPiece] + 1;
    		}
    	}
    	if (whichPlayer === 2 && pieceToPlace !== 0) {
    		var currentPiece = $(this).html();

    		if (pieceToPlace === "S") {
    			$(this).html("&#127913;");
    		} else if (pieceToPlace === "B") {
    			$(this).html("&#128163;");
    		} else if (pieceToPlace === "F") {
    			$(this).html("&#9873;");
    		} else {
    			$(this).html(pieceToPlace);
    		}

    		if (pieceToPlace === "B" || pieceToPlace === "F") {
    			$(this).addClass("immovable");
    		}
    		
    		player2Pieces[pieceToPlace] = player2Pieces[pieceToPlace] - 1;
    		$(".player2Pieces li." + pieceToPlace + " span").html("Remaining: " + player2Pieces[pieceToPlace]);
    		
    		if (player2Pieces[pieceToPlace] === 0) {
    			$(".player2Pieces ." + pieceToPlace).css({"background" : ""});
    			var originalPiece = pieceToPlace;
    			if (pieceToPlace === "F") {
    				var nextPieceToPlace = "10";
    			} else {
    				var nextPieceToPlace = $(".player2Pieces ." + pieceToPlace).next().attr("class");
    			}
   				var placed = 0;
   				var counter = 0;
   				while (placed === 0) {
    				if (player2Pieces[nextPieceToPlace] > 0) {
		    			$(".player2Pieces ." + nextPieceToPlace).css({"background" : "lightblue"})
		    			pieceToPlace = nextPieceToPlace;
    					placed = 1;
    				} else if (originalPiece == nextPieceToPlace) {
    					pieceToPlace = 0;
    					placed = 1;
    				} else if (player2Pieces[nextPieceToPlace] === 0 && nextPieceToPlace === "F") {
    					nextPieceToPlace = "10";
    				} else {
    					nextPieceToPlace = $(".player2Pieces ." + nextPieceToPlace).next().attr("class");
    				}
    			}
    		}

    		if(currentPiece !== "player2") {
    			player2Pieces[currentPiece] = player2Pieces[currentPiece] + 1;
    			$(".player2Pieces li." + currentPiece + " span").html("Remaining: " + player2Pieces[currentPiece]);
    		}

    	}
    })

    /**
     * This is a helper function to place pieces for either player.
     * @function
     */
    $("#placePlayer").on("click", function() {
    	if(playState == 2 || playState == 3 || playState == 4) {
    		if (whichPlayer == 1) {
    			placePieces(1);
    			pieceToPlace = 0;
		    	$(".player1Pieces li").css({"background" : ""})
    		} else if (whichPlayer == 2) {
    			placePieces(2);
    			pieceToPlace = 0;
		    	$(".player2Pieces li").css({"background" : ""})
    		}
    	}
    })

    /**
     * This is a helper function to randomly place pieces on the board
     * during the boardPlace setting
     * @function
     */
    function placePieces (player) {
    	var piecesToPlace = [10, 9, 8, 8, 7, 7, 7, 6, 6, 6, 6, 5, 5, 5, 5, 4, 4, 4, 4, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, "S", "B", "B", "B", "B", "B", "B", "F"];
    	if (player === 1) {
			for (i = 0; i < 4; i++) {
				for(j = 0; j < 10; j++) {
		   			var item = piecesToPlace[Math.floor(Math.random()*piecesToPlace.length)];
		   			var indexOf = piecesToPlace.indexOf(item);
		   			piecesToPlace.splice(indexOf, 1);
		   			if (i === 0) {
			   			if (item === "B") {
	    					$("#t" + j).html("&#128163;");
			   			} else if (item === "F") {
	    					$("#t" + j).html("&#9873;");
			   			} else if (item === "S") {
	    					$("#t" + j).html("&#127913;");
			   			}	else {
	    					$("#t" + j).html(item);
			   			}
		   			} else {
		   				if (item === "B") {
	    					$("#t" + i + "" + j).html("&#128163;");
			   			} else if (item === "F") {
	    					$("#t" + i + "" + j).html("&#9873;");
			   			} else if (item === "S") {
	    					$("#t" + i + "" + j).html("&#127913;");
			   			}	else {
	    					$("#t" + i + "" + j).html(item);
			   			}
		   			}
		   			
    				if (item === "B" || item === "F") {
    					$("#t" + i + "" + j).addClass("immovable");
    				}
				}
			}
			for (var key in player1Pieces) {
				player1Pieces[key] = 0;
			}
    		$(".player1Pieces li span").text("Remaining: 0");
    	} else if (player === 2) {
    		for (i = 6; i < 10; i++) {
    			for(j = 0; j < 10; j++) {
		   			var item = piecesToPlace[Math.floor(Math.random()*piecesToPlace.length)];
		   			var indexOf = piecesToPlace.indexOf(item);
		   			piecesToPlace.splice(indexOf, 1);
		   			if (item === "B") {
    					$("#t" + i + "" + j).html("&#128163;");
		   			} else if (item === "F") {
    					$("#t" + i + "" + j).html("&#9873;");
		   			} else if (item === "S") {
    					$("#t" + i + "" + j).html("&#127913;");
		   			} else {
    					$("#t" + i + "" + j).html(item);
		   			}

    				if (item === "B" || item === "F") {
    					$("#t" + i + "" + j).addClass("immovable");
    				}
    			}
    		}
    		for (var key in player2Pieces) {
    			player2Pieces[key] = 0;
    		}
    		$(".player2Pieces li span").text("Remaining: 0");
    	}
    }

    /**
     * This is a helper function to select a tile and see
     * what valid moves are from it for player 2.
     * @function
     */
    $("div").on("click", ".player1:not('.immovable, .validMove')", function() {
    	if (whichPlayer === 1) {
	    	if (playState === 6) {
	    		tileSelected = $(this).attr("id").substring(1);
	    		tileSelectedPiece = $(this).html();
	    		
	    		log("The tile selected was: " + tileSelected);
	    		log("The piece is: " + tileSelectedPiece);
	    		
	    		showValidMoves(1, tileSelected, tileSelectedPiece)
	    	} 
    	}
    })
    
    /**
     * This is a helper function to select a tile and see
     * what valid moves are from it for player 1.
     * @function
     */
    $("div").on("click", ".player2:not('.immovable, .validMove')", function() {
    	log("inside pl2 clicked a piece. wp: " + whichPlayer + ". Playstate: " + playState);
    	//your turn and nothing selected
    	if (whichPlayer === 2) {
	    	if (playState === 7) {
	    		tileSelected = $(this).attr("id").substring(1);
	    		tileSelectedPiece = $(this).html();
	    		log("The tile selected was: " + tileSelected);
	    		log("The piece is: " + tileSelectedPiece);
	    		showValidMoves(2, tileSelected, tileSelectedPiece)
	    	}
    	}
    })

    /**
     * This is a helper function that sends a move if we click on a tile
     * with validMove class
     * @function
     */
    $(".tile").on("click", function() {
    	if ($(this).hasClass("validMove")) {
	    	destinationTile = $(this).attr("id").substring(1);
	    	sendMove();
    	}
    })

    /**
     * This is a helper function to call check in all four directions
     * @function
     */
    function showValidMoves (player, tile, tilePiece) {
    	$(".validMove").removeClass("validMove");
    	checkLeft(player, parseInt(tile) - 1, tilePiece);
    	checkUp(player, parseInt(tile) - 10, tilePiece);
    	checkRight(player, parseInt(tile) + 1, tilePiece);
    	checkDown(player, parseInt(tile) + 10, tilePiece);
    	return;
    }

    /**
     * This is a helper function to check all valid moves in the left direction
     * Can be called recursively if tilePiece is 2
     * @function
     * @param {int} player - player 1 or 2
     * @param {int} tile - the tile we want to move from
     * @param {string} tilePiece - what piece is contained at the tile
     */
    function checkLeft(player, tile, tilePiece) {
    	log("CheckLeft was run.")
    	log("Player: " + player + " Tile: " + tile + " Piece: " + tilePiece)
    	//crossed boundary
    	if (tile % 10 === 9) {
    		return;
    	}

    	var tileExists = $("#t" + tile);
    	if (!tileExists) {
    		return;
    	}

    	//can't move into unclickable
    	if (unclickableTiles.indexOf(tile) !== -1) {
    		return;
    	}

    	// can't move into your own tiles
    	if (tileExists.hasClass("player" + player)) {
    		return;
    	}

    	if (tilePiece == 2) {
    		var player1Tile = tileExists.hasClass("player1");
    		var player2Tile = tileExists.hasClass("player2");

    		if (player1Tile && player === 2) {
    			tileExists.addClass("validMove");
    		} else if (player2Tile && player === 1) {
    			tileExists.addClass("validMove");
    		} else {
    			tileExists.addClass("validMove");
    			if ((tile - 1) % 10 !== 9) {
    				checkLeft(player, tile - 1, tilePiece)
    			}
    		}
    	} else {
    		tileExists.addClass("validMove");
    	}
    }

    /**
     * This is a helper function to check all valid moves in the up direction
     * Can be called recursively if tilePiece is 2
     * @function
     * @param {int} player - player 1 or 2
     * @param {int} tile - the tile we want to move from
     * @param {string} tilePiece - what piece is contained at the tile
     */
    function checkUp(player, tile, tilePiece) {
    	log("CheckUp was run.")
    	log("Player: " + player + " Tile: " + tile + " Piece: " + tilePiece)

    	//crossed boundary
    	if (tile < 0) {
    		return;
    	}

    	var tileExists = $("#t" + tile);
    	if (!tileExists) {
    		return;
    	}

    	//can't move into unclickable
    	if (unclickableTiles.indexOf(tile) !== -1) {
    		return;
    	}

    	// can't move into your own tiles
    	if (tileExists.hasClass("player" + player)) {
    		return;
    	}

    	if (tilePiece == 2) {
    		var player1Tile = tileExists.hasClass("player1");
    		var player2Tile = tileExists.hasClass("player2");

    		if (player1Tile && player === 2) {
    			tileExists.addClass("validMove");
    		} else if (player2Tile && player === 1) {
    			tileExists.addClass("validMove");
    		} else {
    			tileExists.addClass("validMove");
    			if ((tile - 10) > 0) {
    				checkUp(player, tile - 10, tilePiece)
    			}
    		}
    	} else {
    		tileExists.addClass("validMove");
    	}
    }

    /**
     * This is a helper function to check all valid moves in the right direction
     * Can be called recursively if tilePiece is 2
     * @function
     * @param {int} player - player 1 or 2
     * @param {int} tile - the tile we want to move from
     * @param {string} tilePiece - what piece is contained at the tile
     */
    function checkRight(player, tile, tilePiece) {
    	log("CheckRight was run.")
    	log("Player: " + player + " Tile: " + tile + " Piece: " + tilePiece)

    	//crossed boundary
    	if (tile % 10 === 0) {
    		return;
    	}

    	var tileExists = $("#t" + tile);
    	if (!tileExists) {
    		return;
    	}

    	//can't move into unclickable
    	if (unclickableTiles.indexOf(tile) !== -1) {
    		return;
    	}

    	// can't move into your own tiles
    	if (tileExists.hasClass("player" + player)) {
    		return;
    	}

    	if (tilePiece == 2) {
    		var player1Tile = tileExists.hasClass("player1");
    		var player2Tile = tileExists.hasClass("player2");

    		if (player1Tile && player === 2) {
    			tileExists.addClass("validMove");
    		} else if (player2Tile && player === 1) {
    			tileExists.addClass("validMove");
    		} else {
    			tileExists.addClass("validMove");
    			if ((tile + 1) % 10 !== 0) {
    				checkRight(player, tile + 1, tilePiece)
    			}
    		}
    	} else {
    		tileExists.addClass("validMove");
    	}
    }

    /**
     * This is a helper function to check all valid moves in the down direction
     * Can be called recursively if tilePiece is 2
     * @function
     * @param {int} player - player 1 or 2
     * @param {int} tile - the tile we want to move from
     * @param {string} tilePiece - what piece is contained at the tile
     */
    function checkDown(player, tile, tilePiece) {
    	log("Check down was run.")
    	log("Player: " + player + " Tile: " + tile + " Piece: " + tilePiece)

    	//crossed boundary
    	if (tile > 99) {
    		return;
    	}

    	var tileExists = $("#t" + tile);
    	if (!tileExists) {
    		return;
    	}

    	//can't move into unclickable
    	if (unclickableTiles.indexOf(tile) !== -1) {
    		return;
    	}

    	// can't move into your own tiles
    	if (tileExists.hasClass("player" + player)) {
    		return;
    	}

    	if (tilePiece == 2) {
    		var player1Tile = tileExists.hasClass("player1");
    		var player2Tile = tileExists.hasClass("player2");
    		log("Player1Tile: " + player1Tile + ". Player2Tile: " + player2Tile)
    		log("Player: " + player)

    		if (player1Tile && player === 2) {
    			tileExists.addClass("validMove");
    		} else if (player2Tile && player === 1) {
    			tileExists.addClass("validMove");
    		} else {
    			tileExists.addClass("validMove");
    			if ((tile + 10) < 100) {
    				checkDown(player, tile + 10, tilePiece)
    			}
    		}
    	} else {
    		tileExists.addClass("validMove");
    	}
    }

    /**
     * This is a helper function to send the move to the server
     * @function
     */
    function sendMove() {
    	try {
	    	connection.send(JSON.stringify({
	    		"action" : "move"
	    		, "gameID" : gameID
	    		, "originTile" : tileSelected
	    		, "destinationTile" : destinationTile}))
    	} catch (e) {
    		log("We errored on move")
    		return;
    	}
    }

    /**
     * This is a helper function to reset the board between games
     * @function
     */
    function resetBoard() {
    	for(i = 0; i < 10; i++) {
    		for (j = 0; j < 10; j++) {
    			if (i === 0) {
    				var tileDiv = document.getElementById("t" + j)
    			} else {
    				var tileDiv = document.getElementById("t" + i + "" + j)
    			}

    			if (i < 4) {
    				tileDiv.className = "tile player1";
    				tileDiv.innerHTML = "player1";
    			} else if (i > 5) {
    				tileDiv.className = "tile player2";
    				tileDiv.innerHTML = "player2";
    			} else {
    				tileDiv.className = "tile";
    				tileDiv.innerHTML = "";
    			}
    		}
    	}
    	$("#t42, #t43, #t46, #t47, #t52, #t53, #t56, #t57").removeClass("tile");
    	$("#t42, #t43, #t46, #t47, #t52, #t53, #t56, #t57").addClass("lakeTile unclickable");
    }

    /**
     * This is a helper function to show the two pieces involved in a challenge
     * @function
     */
    function showAffectedTiles(boardAction, beforeTile, afterTile, beforeTilePiece, afterTilePiece) {
    	log("BeforeTilePiece: " + beforeTilePiece, 1)
    	log("AfterTilePiece: " + afterTilePiece, 1)
    	
    	var originalBefore = $("#t" + beforeTile).html();
    	var originalAfter = $("#t" + afterTile).html();
		
		//animate the two affected tiles
		$("#t" + beforeTile).addClass("affectedTile");
		$("#t" + afterTile).addClass("affectedTile");
    	
    	//show the tile piece to both players if not an empty move
    	if (boardAction !== "emptyMove") {

    		if (beforeTilePiece == "B") {
    			$("#t" + beforeTile).html("&#128163;");
    		} else if (beforeTilePiece == "S") {
    			$("#t" + beforeTile).html("&#127913;");
    		} else if (beforeTilePiece == "F") {
    			$("#t" + beforeTile).html("&#9873;");
    		} else {
    			$("#t" + beforeTile).html(beforeTilePiece);
    		}

    		if (afterTilePiece == "B") {
    			$("#t" + afterTile).html("&#128163;");
    		} else if (afterTilePiece == "S") {
    			$("#t" + afterTile).html("&#127913;");
    		} else if (afterTilePiece == "F") {
    			$("#t" + afterTile).html("&#9873;");
    		} else {
    			$("#t" + afterTile).html(afterTilePiece);
    		}
    	}

    	setTimeout(function() {

    		if (boardAction !== "emptyMove") {
    			updateLastAction(boardAction, beforeTilePiece, afterTilePiece);
    		}
    			
    		if (boardAction === "emptyMove") {

    			$("#t" + afterTile).html(originalBefore);
    			$("#t" + beforeTile).html("");


    			if ($("#t" + beforeTile).hasClass("player1")) {
    				$("#t" + afterTile).addClass("player1");
    			} else {
    				$("#t" + afterTile).addClass("player2");
    			}

    			$("#t" + beforeTile).removeClass("player1 player2")

    		} else if (boardAction === "challengeWon") { // the initiating piece won the exchange
    			
    			$("#t" + afterTile).html(originalBefore);
    			$("#t" + beforeTile).html("");

    			$("#t" + afterTile).removeClass("player1 player2 immovable")
    			if ($("#t" + beforeTile).hasClass("player1")) {
    				$("#t" + afterTile).addClass("player1");
    			} else {
    				$("#t" + afterTile).addClass("player2");
    			}

    			$("#t" + beforeTile).removeClass("player1 player2")

    		} else if (boardAction === "challengeLost") { // the initiating piece lost the exchange
    			log("Challenge lost. Before Tile Piece: " + beforeTilePiece + " After Tile Piece: " + afterTilePiece)
    			
    			$("#t" + beforeTile).html("");
    			
    			
    			$("#t" + beforeTile).removeClass("player1 player2")
    			$("#t" + afterTile).removeClass("immovable")
    			$("#t" + afterTile).html(originalAfter);
    		} else if (boardAction === "challengeMet") {
    			$("#t" + beforeTile).html("");
    			$("#t" + beforeTile).removeClass("player1 player2");
    			$("#t" + afterTile).html("");
    			$("#t" + afterTile).removeClass("player1 player2 immovable");
    			log("Challenge Met. Before Tile Piece: " + beforeTilePiece + " After Tile Piece: " + afterTilePiece)
    		}

	    	$("#t" + beforeTile).removeClass("affectedTile");
	    	$("#t" + afterTile).removeClass("affectedTile");


    	}, 1000);
    }

    /**
     * This is a helper function to reset the sidebar
     * @function
     */
    function resetPieceCount() {
    	$(".piecesWrapper .pieces li").each(function() {
    		var pieceClass = $(this).attr("class");
    		$("span", $(this)).html("Remaining: " + originalPieceCount[pieceClass])
    	})
    }

    /**
     * This is a helper function to update the sidebar when a piece
     * is removed from the board.
     * @function
     */
    function removeFromPieceCount(boardAction, beforeTile, afterTile, beforeTilePiece, afterTilePiece) {
    	if (boardAction === "challengeWon") {
    		if ($("#t" + afterTile).hasClass("player1")) {
    			var currentSpan = $(".piecesWrapper .player1Pieces ul ." + afterTilePiece + " span").html();
    			var currentRemaining = currentSpan.substring(currentSpan.length - 1);
    			log("Current Span: " + currentSpan, 1);
    			log("Current Remaining: " + currentRemaining, 1);
    			$(".piecesWrapper .player1Pieces ul ." + afterTilePiece + " span").html("Remaining: " + (currentRemaining - 1));
    		} else {
    			var currentSpan = $(".piecesWrapper .player2Pieces ul ." + afterTilePiece + " span").html();
    			var currentRemaining = currentSpan.substring(currentSpan.length - 1);
    			log("Current Span: " + currentSpan, 1);
    			log("Current Remaining: " + currentRemaining, 1);
    			$(".piecesWrapper .player2Pieces ul ." + afterTilePiece + " span").html("Remaining: " + (currentRemaining - 1));
    		}
    	} else if (boardAction === "challengeLost") {
    		if ($("#t" + beforeTile).hasClass("player1")) {
    			var currentSpan = $(".piecesWrapper .player1Pieces ul ." + beforeTilePiece + " span").html();
    			var currentRemaining = currentSpan.substring(currentSpan.length - 1);
    			log("Current Span: " + currentSpan, 1);
    			log("Current Remaining: " + currentRemaining, 1);
    			$(".piecesWrapper .player1Pieces ul ." + beforeTilePiece + " span").html("Remaining: " + (currentRemaining - 1));
    		} else {
    			var currentSpan = $(".piecesWrapper .player2Pieces ul ." + beforeTilePiece + " span").html();
    			var currentRemaining = currentSpan.substring(currentSpan.length - 1);
    			$(".piecesWrapper .player2Pieces ul ." + beforeTilePiece + " span").html("Remaining: " + (currentRemaining - 1));
    		}
    	} else if (boardAction === "challengeMet") {
    		var currentSpan = $(".piecesWrapper .pieces ul ." + beforeTilePiece + " span").html();
    		var currentRemaining = currentSpan.substring(currentSpan.length - 1);
    		log("Current Span: " + currentSpan, 1);
    		log("Current Remaining: " + currentRemaining, 1);
    		$(".piecesWrapper .pieces ul ." + beforeTilePiece + " span").html("Remaining: " + (currentRemaining - 1));
    	}
    }

    /**
     * This is a helper function to update the status field in the game header
     * @function
     */
    function updateLastAction(boardAction, beforeTilePiece, afterTilePiece) {
		var actionToUpdate = "";
    	if (beforeTilePiece == "B") {
    		beforeTilePiece = "&#128163;"
    	} else if (beforeTilePiece == "S") {
    		beforeTilePiece = "&#127913;"
    	} else if (beforeTilePiece == "F") {
    		beforeTilePiece = "&#9873;"
    	}

    	if (afterTilePiece == "B") {
    		afterTilePiece = "&#128163;"
    	} else if (afterTilePiece == "S") {
    		afterTilePiece = "&#127913;"
    	} else if (afterTilePiece == "F") {
    		afterTilePiece = "&#9873;"
    	}

    	if (boardAction == "challengeWon") {
    		actionToUpdate = beforeTilePiece + " takes " + afterTilePiece;
    	} else if (boardAction == "challengeLost") {
    		actionToUpdate = afterTilePiece + " defends " + beforeTilePiece;
    	} else if (boardAction == "challengeMet") {
    		actionToUpdate = beforeTilePiece + " draws with " + afterTilePiece;
    	}

    	lastAction.html(actionToUpdate);
    }

    /**
     * This is a helper function to make logging easier
     * @function
     */
    function log(message, override) {
    	if (verbose === 1 || override === 1) {
    		console.log(message);
    	}
    }
});