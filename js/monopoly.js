var Monopoly = {};
Monopoly.allowRoll = true;
Monopoly.moneyAtStart = 250;
Monopoly.doubleCounter = 0;
Monopoly.erasedPlayers = [];
// Monopoly.player1money = document.getElementById("player1money");
// Monopoly.player2money = document.getElementById("player2money");
// Monopoly.player3money = document.getElementById("player3money");
// Monopoly.player4money = document.getElementById("player4money");
// Monopoly.player5money = document.getElementById("player5money");
// Monopoly.player6money = document.getElementById("player6money");

// Monopoly.updateMoneyOnBoard = function() {
//     var playerNumber = document.getElementsByClassName("player").length;
//     for(let i = 1; i < (playerNumber + 1 ); i++ ) {
//         var playerid = document.getElementById("player" + i);
//         var playermoney = playerid.getAttribute("data-money");
//         Monopoly.player1money.textContent = (playerid + "\n" + playermoney);

//         //burada sorun var
//     }
// }

//initializing the game
Monopoly.init = function () {
    $(document).ready(function () {
        Monopoly.adjustBoardSize();
        $(window).bind("resize", Monopoly.adjustBoardSize);
        Monopoly.initDice();
        Monopoly.initPopups();
        Monopoly.start();
    });
};

//showing the introduction pop-up at the start
Monopoly.start = function () {
    Monopoly.showPopup("intro")
};

//initializing the dices, checking if it's allowed to roll the dice
Monopoly.initDice = function () {
    $(".dice").click(function () {
        if (Monopoly.allowRoll) {
            Monopoly.rollDice();
        }
    });
};

//returning the current player
Monopoly.getCurrentPlayer = function () {
    return $(".player.current-turn");
};

//returning the player's cell
Monopoly.getPlayersCell = function (player) {
    return player.closest(".cell");
};

//returning the amount of money player has
Monopoly.getPlayersMoney = function (player) {
    return parseInt(player.attr("data-money"));
};

//reducing the "amount" from the player's money (need to use negative amount to add)
Monopoly.updatePlayersMoney = function (player, amount) {
    var playersMoney = parseInt(player.attr("data-money"));
    playersMoney -= amount;
    if (playersMoney < 0) {
        Monopoly.playSound("not-enough-cash");
        var popupBroke = Monopoly.getPopup("broke");
        var brokePlayer = player.attr("id");
        var button = document.getElementById("broke-ok-button");
        Monopoly.latestBrokePlayer = player;
        button.addEventListener("click", Monopoly.afterBroke);
        Monopoly.showPopup("broke");
        popupBroke.find("#broke-player-id").text(brokePlayer);
    }
    player.attr("data-money", playersMoney);
    player.attr("title", player.attr("id") + ": $" + playersMoney);
    Monopoly.playSound("chaching");
};

//rolling dices randomly
Monopoly.rollDice = function () {
    var result1 = Math.floor(Math.random() * 6) + 1;
    var result2 = Math.floor(Math.random() * 6) + 1;
    $(".dice").find(".dice-dot").css("opacity", 0);
    $(".dice#dice1").attr("data-num", result1).find(".dice-dot.num" + result1).css("opacity", 1);
    $(".dice#dice2").attr("data-num", result2).find(".dice-dot.num" + result2).css("opacity", 1);
    if (result1 == result2) {
        Monopoly.doubleCounter++;
        if (Monopoly.doubleCounter == 3) {
            Monopoly.doubleCounter = 0;
            var player = Monopoly.getCurrentPlayer();
            Monopoly.handleGoToJail(player);
            return;
        }
    }
    else {
        Monopoly.doubleCounter = 0;
    }
    var currentPlayer = Monopoly.getCurrentPlayer();
    Monopoly.handleAction(currentPlayer, "move", result1 + result2);
};

//move the player on the board until there are no steps left
Monopoly.movePlayer = function (player, steps) {
    Monopoly.allowRoll = false;
    var playerMovementInterval = setInterval(function () {
        if (steps == 0) {
            var playerCell = Monopoly.getPlayersCell(player);
            if (playerCell.is("." + player.attr("id"))) {
                player.addClass("happy");
            }
            clearInterval(playerMovementInterval);
            Monopoly.handleTurn(player);
        } else {
            player.removeClass("happy");
            var playerCell = Monopoly.getPlayersCell(player);
            var nextCell = Monopoly.getNextCell(playerCell);
            nextCell.find(".content").append(player);
            steps--;
        }
    }, 200);
};

//checking the newly arrived cell of the player and redirecting to the appropriate function 
Monopoly.handleTurn = function () {
    var player = Monopoly.getCurrentPlayer();
    var playerCell = Monopoly.getPlayersCell(player);
    if (playerCell.is(".available.property")) {
        Monopoly.handleBuyProperty(player, playerCell);
    } else if (playerCell.is(".property:not(.available)") && !playerCell.hasClass(player.attr("id"))) {
        Monopoly.handlePayRent(player, playerCell);
    } else if (playerCell.is(".go-to-jail")) {
        Monopoly.handleGoToJail(player);
    } else if (playerCell.is(".chance")) {
        Monopoly.handleChanceCard(player);
    } else if (playerCell.is(".community")) {
        Monopoly.handleCommunityCard(player);
    } else {
        Monopoly.setNextPlayerTurn();
    }
}

//changing the player to the next one in line and checking jail situation
Monopoly.setNextPlayerTurn = function () {
    if (Monopoly.doubleCounter == 0) {
        var currentPlayerTurn = Monopoly.getCurrentPlayer();
        var playerId = parseInt(currentPlayerTurn.attr("id").replace("player", ""));
        var nextPlayerId = playerId + 1;
        if (nextPlayerId > $(".player").length) {
            nextPlayerId = 1;
        }
        currentPlayerTurn.removeClass("current-turn");
        var nextPlayer = $(".player#player" + nextPlayerId);
        nextPlayer.addClass("current-turn");
        if (nextPlayer.is(".jailed")) {
            var currentJailTime = parseInt(nextPlayer.attr("data-jail-time"));
            currentJailTime++;
            nextPlayer.attr("data-jail-time", currentJailTime);
            if (currentJailTime > 3) {
                nextPlayer.removeClass("jailed");
                nextPlayer.removeAttr("data-jail-time");
            }
            Monopoly.setNextPlayerTurn();
            return;
        }
        if (Monopoly.erasedPlayers.includes(nextPlayer[0].id)) {
            Monopoly.setNextPlayerTurn();
            return;
        }
    }
    Monopoly.closePopup();
    Monopoly.allowRoll = true;
};

//when the player comes to an available property offering the option to buy it
Monopoly.handleBuyProperty = function (player, propertyCell) {
    var propertyCost = Monopoly.calculateProperyCost(propertyCell);
    var popup = Monopoly.getPopup("buy");
    popup.find(".cell-price").text(propertyCost);
    popup.find("button").unbind("click").bind("click", function () {
        var clickedBtn = $(this);
        if (clickedBtn.is("#yes")) {
            Monopoly.handleBuy(player, propertyCell, propertyCost);
        } else {
            Monopoly.closeAndNextTurn();
        }
    });
    Monopoly.showPopup("buy");
};

//transfering the rent amount from one player to the other
Monopoly.handlePayRent = function (player, propertyCell) {
    var popup = Monopoly.getPopup("pay");
    var currentRent = parseInt(propertyCell.attr("data-rent"));
    var properyOwnerId = propertyCell.attr("data-owner");
    popup.find("#player-placeholder").text(properyOwnerId);
    popup.find("#amount-placeholder").text(currentRent);
    popup.find("button").unbind("click").bind("click", function () {
        var properyOwner = $(".player#" + properyOwnerId);
        Monopoly.updatePlayersMoney(player, currentRent);
        Monopoly.updatePlayersMoney(properyOwner, -1 * currentRent);
        Monopoly.closeAndNextTurn();
    });
    Monopoly.showPopup("pay");
};

//redirecting to appropriate functions when the player goes to jail
Monopoly.handleGoToJail = function (player) {
    var popup = Monopoly.getPopup("jail");
    popup.find("button").unbind("click").bind("click", function () {
        Monopoly.handleAction(player, "jail");
    });
    Monopoly.showPopup("jail");
};

//getting a chance card from server and redirecting to the handling function with the input from card
Monopoly.handleChanceCard = function (player) {
    var popup = Monopoly.getPopup("chance");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_chance_card", function (chanceJson) {
        popup.find(".popup-content #text-placeholder").text(chanceJson["content"]);
        popup.find(".popup-title").text(chanceJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action", chanceJson["action"]).attr("data-amount", chanceJson["amount"]);
    }, "json");
    popup.find("button").unbind("click").bind("click", function () {
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        Monopoly.handleAction(player, action, amount);
    });
    Monopoly.showPopup("chance");
};

//getting a community card from server and redirecting to the handling function with the input from card
Monopoly.handleCommunityCard = function (player) {
    var popup = Monopoly.getPopup("community");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_community_card", function (chanceJson) {
        popup.find(".popup-content #text-placeholder").text(chanceJson["content"]);
        popup.find(".popup-title").text(chanceJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action", chanceJson["action"]).attr("data-amount", chanceJson["amount"]);
    }, "json");
    popup.find("button").unbind("click").bind("click", function () {
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        Monopoly.handleAction(player, action, amount);
    });
    Monopoly.showPopup("community");
};

//sending the player to jail and setting the jail time
Monopoly.sendToJail = function (player) {
    player.addClass("jailed");
    player.attr("data-jail-time", 1);
    $(".corner.game.cell.in-jail").append(player);
    Monopoly.playSound("woopwoop");
    Monopoly.doubleCounter = 0;
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};

//getting pop-up's according to their id from the html document
Monopoly.getPopup = function (popupId) {
    return $(".popup-lightbox .popup-page#" + popupId);
};

//calculating the property cost based on their data-group
Monopoly.calculateProperyCost = function (propertyCell) {
    var cellGroup = propertyCell.attr("data-group");
    var cellPrice = parseInt(cellGroup.replace("group", "")) * 5;
    if (cellGroup == "rail") {
        cellPrice = 10;
    }
    return cellPrice;
};

//calculating the rent according to the porperty cost
Monopoly.calculateProperyRent = function (propertyCost) {
    return propertyCost / 2;
};

//when an action is done continuing to the next player
Monopoly.closeAndNextTurn = function () {
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};

//in the beginning of the game creating the players
Monopoly.initPopups = function () {
    $(".popup-page#intro").find("button").click(function () {
        var numOfPlayers = $(this).closest(".popup-page").find("input").val();
        if (Monopoly.isValidInput("numofplayers", numOfPlayers)) {
            Monopoly.createPlayers(numOfPlayers);
            Monopoly.closePopup();
        }
    });
};

//if the player wanted to buy the property checking it's money and updating the porperty
Monopoly.handleBuy = function (player, propertyCell, propertyCost) {
    var playersMoney = Monopoly.getPlayersMoney(player)
    if (playersMoney < propertyCost) {
        Monopoly.playSound("not-enough-cash");
        Monopoly.showErrorMsg();
    } else {
        Monopoly.updatePlayersMoney(player, propertyCost);
        var rent = Monopoly.calculateProperyRent(propertyCost);
        propertyCell.removeClass("available")
            .addClass(player.attr("id"))
            .attr("data-owner", player.attr("id"))
            .attr("data-rent", rent);
        player.addClass("happy");
        Monopoly.setNextPlayerTurn();
    }
};

//checking the action and then redirecting to the relevant function
Monopoly.handleAction = function (player, action, amount) {
    switch (action) {
        case "move":
            Monopoly.movePlayer(player, amount);
            break;
        case "pay":
            Monopoly.updatePlayersMoney(player, amount);
            Monopoly.setNextPlayerTurn();
            break;
        case "jail":
            Monopoly.sendToJail(player);
            break;
    };
    Monopoly.closePopup();
};

//creating the players in the beginning of the game
Monopoly.createPlayers = function (numOfPlayers) {
    var startCell = $(".go");
    for (var i = 1; i <= numOfPlayers; i++) {
        var player = $("<div />").addClass("player shadowed").attr("id", "player" + i).attr("title", "player" + i + ": $" + Monopoly.moneyAtStart);
        startCell.find(".content").append(player);
        if (i == 1) {
            player.addClass("current-turn");
        }
        player.attr("data-money", Monopoly.moneyAtStart);
    }
};

//getting the next cell (clock-wise rotation) and checking if passed from the "go"
Monopoly.getNextCell = function (cell) {
    var currentCellId = parseInt(cell.attr("id").replace("cell", ""));
    var nextCellId = currentCellId + 1
    if (nextCellId > 40) {
        Monopoly.handlePassedGo();
        nextCellId = 1;
    }
    return $(".cell#cell" + nextCellId);
};

//giving money each time a player passes "go"
Monopoly.handlePassedGo = function () {
    var player = Monopoly.getCurrentPlayer();
    Monopoly.updatePlayersMoney(player, (-Monopoly.moneyAtStart / 10));
};

//checking if number of players are between 1 and 4
Monopoly.isValidInput = function (validate, value) {
    var isValid = false;
    switch (validate) {
        case "numofplayers":
            if (value > 1 && value <= 6) {
                isValid = true;
            }
    }
    if (!isValid) {
        Monopoly.showErrorMsg();
    }
    return isValid;

}

//showing error pop-up
Monopoly.showErrorMsg = function () {
    $(".popup-page .invalid-error").fadeTo(500, 1);
    setTimeout(function () {
        $(".popup-page .invalid-error").fadeTo(500, 0);
    }, 2000);
};

//adjusting the board size according to the screen size
Monopoly.adjustBoardSize = function () {
    var gameBoard = $(".board");
    var boardSize = Math.min($(window).height(), $(window).width());
    boardSize -= parseInt(gameBoard.css("margin-top")) * 2;
    $(".board").css({ "height": boardSize, "width": boardSize });
}

//hiding the pop-up
Monopoly.closePopup = function () {
    $(".popup-lightbox").fadeOut();
};

//playing the appropriate sound effect
Monopoly.playSound = function (sound) {
    var snd = new Audio("./sounds/" + sound + ".wav");
    snd.play();
}

//showing the pop-up
Monopoly.showPopup = function (popupId) {
    $(".popup-lightbox .popup-page").hide();
    $(".popup-lightbox .popup-page#" + popupId).show();
    $(".popup-lightbox").fadeIn();
};

Monopoly.afterBroke = function () {
    Monopoly.closePopup();
    Monopoly.doubleCounter = 0;
    var brokePlayerID = Monopoly.latestBrokePlayer[0].id;
    var players = document.getElementsByClassName("player");
    if (players.length == 2) {
        Monopoly.declareWinner()
    }
    else {
        for (let i = 1; i < 41; i++) {
            var cell = document.getElementById("cell" + i);
            if (cell.classList.contains(brokePlayerID)) {
                cell.classList.remove(brokePlayerID);
                cell.classList.add("available");
                cell.removeAttribute("data-owner");
            }
        }
        $("#" + brokePlayerID).css("display", "none");
        Monopoly.erasedPlayers.unshift(brokePlayerID);
    }
}

Monopoly.declareWinner = function () {
    var last2players = document.getElementsByClassName("player");
    var player1 = last2players[0].id;
    var player2 = last2players[1].id;
    var brokePlayerID = Monopoly.latestBrokePlayer[0].id;
    var winner;
    if(brokePlayerID == player1) {
        winner = player2;
    }
    else{
        winner = player1;
    }
    var button = document.getElementById("winner-newgame-button");
    button.addEventListener("click", Monopoly.closePopup);
    var popupWinner = Monopoly.getPopup("winner");
    popupWinner.find("#winning-player-id").text(winner);
    Monopoly.showPopup("winner");
}

//when the page first opened, initializing the game
Monopoly.init();