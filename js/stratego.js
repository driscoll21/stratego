//TODO: 
// allow picking up pieces in the placing phase
// show the two pieces involved in a collision
// combine player1pieces and player2pieces objects?
// generalize all the duplicated p1/p2 code
// if the final piece is a replace, it doesnt highlight the one left over
// instructions on how to place, how to play
// auto generate names instead of player 1 and player 2
// bomb - &#128163;
// flag - &#9873; or &#9872;
// spy - &#127913;

//initialize the game board
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

//giant function that controls the client side flow
$(function () {
    // if user is running mozilla then use it's built-in WebSocket
    window.WebSocket = window.WebSocket || window.MozWebSocket;

   	var connection = new WebSocket('your connection string here'); //edit
    var submit = document.getElementById("submit");
    var status = document.getElementById("status");
    var lastAction = document.getElementById("lastActionSpan");
    var playersReady = document.getElementById("playersReady");
    var playerDiv = document.getElementById("player");
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

    connection.onopen = function () {
        // connection is opened and ready to use
    	connection.send(JSON.stringify({"action" : "connected"}));
    };

    connection.onerror = function (error) {
        // an error occurred when sending/receiving data
        log("We errored. Closing connection.")
        connection.close();
    };

    connection.onmessage = function (message) {
        // parse json message. all messages from server are json
        try {
            var json = JSON.parse(message.data);
        } catch (e) {
            log('This doesn\'t look like a valid JSON: ', message.data);
            return;
        }

        log(json);
        var action = json['action'];

        switch (action) {
        	case 'waitingForMore':
        		status.innerHTML = "Waiting for more...";
        		playersReady.innerHTML = "1";
        		playState = 1;
        		break;
        	case 'assignPlayer1':
        		gameID = json['gameID'];
        		log(gameID);
        		log(json['gameID']);
        		whichPlayer = 1;
        		playerDiv.innerHTML = "You are Player 1.";
        		status.innerHTML = "Waiting for more...";
        		playersReady.innerHTML = "1";
        		playState = 1;
        		break;
        	case 'assignPlayer2':
        		gameID = json['gameID'];
        		log(gameID);
        		log(json['gameID']);
        		whichPlayer = 2;
        		playerDiv.innerHTML = "You are Player 2."
        		break;
        	case 'boardPlace':
        		log("The game id is: " + gameID);
        		status.innerHTML = "Opponent Found. Begin placing your pieces!";
        		playersReady.innerHTML = "2";
        		submit.value = "ready";
        		submit.innerHTML = "Board Ready";
        		playState = 2;
        		break;
        	case 'player1Ready':
        		if (whichPlayer === 2) {
        			status.innerHTML = "Player 1 is ready, no pressure."
        		} else {
        			status.innerHTML = "Waiting on Player 2...";
        			submit.className += " hidden";
        		}
        		playState = 3;
        		break;
        	case 'player2Ready':
        		if (whichPlayer === 1) {
        			status.innerHTML = "Player 2 is ready, no pressure."
        		} else {
        			status.innerHTML = "Waiting on Player 1..."
        			submit.className += " hidden";
        		}
        		playState = 4;
        		break;
        	case 'startGame':
        		if (whichPlayer === 1) {
        			status.innerHTML = "Game started! Your turn first!"
        		} else {
        			status.innerHTML = "Game started! Player 1 goes first!"
        		}
        		submit.className += " hidden"
        		$("#gamesToJoin").addClass("hidden");
        		$("#lastAction").removeClass("hidden");
        		$("#placePlayer1, #placePlayer2").hide();
        		resetPieceCount();
        		break;
        	case 'boardUpdate' :
        		var boardAction = json['boardAction']; //emptyMove, challengeWon, challengeLost
        		var beforeTile = json['beforeTile'];
        		var afterTile = json['afterTile'];
        		if (boardAction !== "emptyMove") {
        			var beforeTilePiece = json['beforeTilePiece'];
        			var afterTilePiece = json['afterTilePiece'];
        		}

	        	removeFromPieceCount(boardAction, beforeTile, afterTile, beforeTilePiece, afterTilePiece);
        		
        		if (boardAction === "emptyMove") {
	        		$("#t" + afterTile).html($("#t" + beforeTile).html());
	        		$("#t" + beforeTile).html("");

	        		showAffectedTiles(beforeTile, afterTile);

	        		if ($("#t" + beforeTile).hasClass("player1")) {
		        		$("#t" + afterTile).addClass("player1");
	        		} else {
		        		$("#t" + afterTile).addClass("player2");
	        		}

	        		$("#t" + beforeTile).removeClass("player1 player2")

	        		break;
        		} else if (boardAction === "challengeWon") {
	        		
        			$("#t" + afterTile).html($("#t" + beforeTile).html());
	        		$("#t" + beforeTile).html("");

	        		showAffectedTiles(beforeTile, afterTile, beforeTilePiece, afterTilePiece);

	        		$("#t" + afterTile).removeClass("player1 player2")
	        		if ($("#t" + beforeTile).hasClass("player1")) {
		        		$("#t" + afterTile).addClass("player1");
	        		} else {
		        		$("#t" + afterTile).addClass("player2");
	        		}

	        		$("#t" + beforeTile).removeClass("player1 player2")
	        		lastAction.innerHTML = beforeTilePiece + " takes " + afterTilePiece;

	        		break;
        		} else if (boardAction === "challengeLost") {
        			log("Challenge lost. Before Tile Piece: " + beforeTilePiece + " After Tile Piece: " + afterTilePiece)
        			
	        		$("#t" + beforeTile).html("");
	        		
	        		showAffectedTiles(beforeTile, afterTile, beforeTilePiece, afterTilePiece);
	        		
	        		$("#t" + beforeTile).removeClass("player1 player2")
	        		lastAction.innerHTML = afterTilePiece + " defends " + beforeTilePiece;
        			break;
        		} else if (boardAction === "challengeMet") {
	        		showAffectedTiles(beforeTile, afterTile, beforeTilePiece, afterTilePiece, "challengeMet");
        			$("#t" + beforeTile).html("");
        			$("#t" + beforeTile).removeClass("player1 player2");
        			$("#t" + afterTile).html("");
        			$("#t" + afterTile).removeClass("player1 player2");
	        		lastAction.innerHTML = beforeTilePiece + " draws with " + afterTilePiece;
        			log("Challenge Met. Before Tile Piece: " + beforeTilePiece + " After Tile Piece: " + afterTilePiece)
        			break;
        		} else {
        			break;
        		}
        	case 'player1Turn':
        		playState = 6;
        		tileSelected = 0;
        		$(".validMove").removeClass("validMove");
        		status.innerHTML = "Player 1's turn!"
        		break;
        	case 'player2Turn':
        		playState = 7;
        		tileSelected = 0;
        		$(".validMove").removeClass("validMove");
        		status.innerHTML = "Player 2's turn!"
        		break;
        	case 'gameOver':
        		playState = 8;
        		tileSelected = 0;
        		var winner = json['player'];
        		lastAction.innerHTML += ". Player " + winner + " wins! Good game!";
        		break;
        	case 'restartGame':
        		var disconnected = json['player'];
        		log("restart game " + disconnected);
        		status.innerHTML = "Player " + disconnected + " has disconnected. The game has been reset.";
        		playersReady.innerHTML = "0";
        		playState = 1;
        		whichPlayer = 0;
        		resetBoard();
        		$("#gamesToJoin").removeClass("hidden");
        		$("#lastAction").addClass("hidden");
        		$("#placePlayer1, #placePlayer2").show();
        		submit.value = "joinGame";
        		submit.innerHTML = "Join";
        	default:
        		break;
        }
    };

    submit.onclick = function() {
    	try {
    		var currentAction = submit.value;

    		if (currentAction === "ready") {
    			checkIfValidBoardStart();
    		} else {
    			log(gameID + " << GameID")
    			connection.send(JSON.stringify({
    				"action" : submit.value
    				, "gameID" : gameID
    			}))
    		}
    	} catch (e) {
    		log("We errored on submit")
    		return;
    	}

    	function checkIfValidBoardStart() {
    		if (whichPlayer === 1) {
    			var sum = 0;
    			for (var key in player1Pieces) {
    				sum+= player1Pieces[key];
    			}
    			if (sum === 0) {
    				buildBoardState();
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
    				connection.send(JSON.stringify({
    					"action" : "ready"
    					, "gameID" : gameID
    					, "boardState" : boardState}))
    			} else {
    				log("Not a valid configuration for P2." + sum)
    			}
    		}
    	}

    	function buildBoardState() {
    		if (whichPlayer === 1) {
    			for (var i = 0; i < 40; i++) {
    				var tempPiece = $("#t" + i).html();
    				if (tempPiece === "&#128163;") {
    					boardState[i] = "B";
		   			} else if (tempPiece === "&#9873;") {
    					boardState[i] = "F";
		   			} else if (tempPiece === "&#127913;") {
    					boardState[i] = "S";
		   			} else {
    					boardState[i] = tempPiece;
		   			}
    			}
    		} else {
    			for (var i = 60; i < 100; i++) {
    				var tempPiece = $("#t" + i).html();
    				if (tempPiece === "&#128163;") {
    					boardState[i] = "B";
		   			} else if (tempPiece === "&#9873;") {
    					boardState[i] = "F";
		   			} else if (tempPiece === "&#127913;") {
    					boardState[i] = "S";
		   			} else {
    					boardState[i] = tempPiece;
		   			}
    			}
    		}
    	}
    }

    //functions for placing p1 pieces
    $(".player1Pieces li").on("click", function() {
    	if (whichPlayer === 1) {
    		pieceToPlace = $(this).attr("class");
    		
    		if(player1Pieces[pieceToPlace] !== 0) {
	    		$(".player1Pieces li").css({"background": ""})
	    		$(".player1Pieces ." + pieceToPlace).css({"background" : "lightblue"})
    		} else {
    			pieceToPlace = 0;
    		}
    	}
    })

    //functions for placing p2 pieces
    $(".player2Pieces li").on("click", function() {
    	if (whichPlayer === 2) {
    		pieceToPlace = $(this).attr("class");
    		if(player2Pieces[pieceToPlace] !== 0) {
	    		$(".player2Pieces li").css({"background": ""})
	    		$(".player2Pieces ." + pieceToPlace).css({"background" : "lightblue"})
    		} else {
    			pieceToPlace = 0;
    		}
    	}
    })

    $(".boardRow .player1").on("click", function() {
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

    $(".boardRow .player2").on("click", function() {
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

    //place pieces fast for testing.. might use this later
    $("#placePlayer1").on("click", function() {
    	if(playState == 2 || playState == 3 || playState == 4) {
    		if (whichPlayer == 1) {
    			placePieces(1);
    			pieceToPlace = 0;
		    	$(".player1Pieces li").css({"background" : ""})
    		}
    	}
    })

    $("#placePlayer2").on("click", function() {
    	if(playState == 2 || playState == 3 || playState == 4) {
    		if (whichPlayer == 2) {
    			placePieces(2);
    			pieceToPlace = 0;
		    	$(".player2Pieces li").css({"background" : ""})
    		}
    	}
    })

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

    //use this delegated event because we dynamically generate things
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
    
    //use this delegated event because we dynamically generate things
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

    $(".tile").on("click", function() {
    	if ($(this).hasClass("validMove")) {
	    	destinationTile = $(this).attr("id").substring(1);
	    	sendMove();
    	}
    })

    function showValidMoves (player, tile, tilePiece) {
    	$(".validMove").removeClass("validMove");
    	checkLeft(player, parseInt(tile) - 1, tilePiece);
    	checkUp(player, parseInt(tile) - 10, tilePiece);
    	checkRight(player, parseInt(tile) + 1, tilePiece);
    	checkDown(player, parseInt(tile) + 10, tilePiece);
    	return;
    }

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

    	//unclickables yo
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

    	//unclickables yo
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

    	//unclickables yo
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

    	//unclickables yo
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

    function resetBoard() {
    	for(i = 0; i < 10; i++) {
    		for (j = 0; j < 10; j++) {
    			// tileDiv.className = "tile";
    			if (i === 0) {
    				var tileDiv = document.getElementById(j)
    			} else {
    				var tileDiv = document.getElementById(i + "" + j)
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
    	$("#t42, #t43, #t46, #t47, #t52, #t53, #t56, #t57").addClass("unclickable");
    }

    function showAffectedTiles(beforeTile, afterTile, beforeTilePiece, afterTilePiece, challengeMet) {
    	$("#t" + beforeTile).removeClass("affectedTile");
    	$("#t" + afterTile).removeClass("affectedTile");
    	var originalBefore = $("#t" + beforeTile).html();
    	var originalAfter = $("#t" + afterTile).html();
    	//show the tile piece to both players
    	if (beforeTilePiece) {
    		$("#t" + beforeTile).html(beforeTilePiece);
    	}

    	if (afterTilePiece) {
    		$("#t" + afterTile).html(afterTilePiece);

    	}

    	setTimeout(function() {
    		$("#t" + beforeTile).addClass("affectedTile");
    		$("#t" + afterTile).addClass("affectedTile");
	    	
	    	if (challengeMet !== "challengeMet") {
		    	$("#t" + beforeTile).html(originalBefore);
		    	$("#t" + afterTile).html(originalAfter);
	    	}

    	}, 1);
    }

    function resetPieceCount() {
    	$(".piecesWrapper .pieces li").each(function() {
    		var pieceClass = $(this).attr("class");
    		$("span", $(this)).html("Remaining: " + originalPieceCount[pieceClass])
    	})
    }

    function removeFromPieceCount(boardAction, beforeTile, afterTile, beforeTilePiece, afterTilePiece) {
    	if (boardAction === "challengeWon") {
    		if ($("#t" + afterTile).hasClass("player1")) {
    			var currentSpan = $(".piecesWrapper .player1Pieces ul ." + afterTilePiece + " span").html();
    			var currentRemaining = currentSpan.substring(currentSpan.length - 1);
    			$(".piecesWrapper .player1Pieces ul ." + afterTilePiece + " span").html("Remaining: " + (currentRemaining - 1));
    		} else {
    			var currentSpan = $(".piecesWrapper .player2Pieces ul ." + afterTilePiece + " span").html();
    			var currentRemaining = currentSpan.substring(currentSpan.length - 1);
    			$(".piecesWrapper .player2Pieces ul ." + afterTilePiece + " span").html("Remaining: " + (currentRemaining - 1));
    		}
    	} else if (boardAction === "challengeLost") {
    		if ($("#t" + beforeTile).hasClass("player1")) {
    			var currentSpan = $(".piecesWrapper .player1Pieces ul ." + beforeTilePiece + " span").html();
    			var currentRemaining = currentSpan.substring(currentSpan.length - 1);
    			$(".piecesWrapper .player1Pieces ul ." + beforeTilePiece + " span").html("Remaining: " + (currentRemaining - 1));
    		} else {
    			var currentSpan = $(".piecesWrapper .player2Pieces ul ." + beforeTilePiece + " span").html();
    			var currentRemaining = currentSpan.substring(currentSpan.length - 1);
    			$(".piecesWrapper .player2Pieces ul ." + beforeTilePiece + " span").html("Remaining: " + (currentRemaining - 1));
    		}
    	} else if (boardAction === "challengeMet") {
    		var currentSpan = $(".piecesWrapper .pieces ul ." + beforeTilePiece + " span").html();
    		var currentRemaining = currentSpan.substring(currentSpan.length - 1);
    		$(".piecesWrapper .pieces ul ." + beforeTilePiece + " span").html("Remaining: " + currentRemaining - 1);
    	}
    }

    function log(message, override) {
    	if (verbose === 1 || override === 1) {
    		console.log(message);
    	}
    }
});