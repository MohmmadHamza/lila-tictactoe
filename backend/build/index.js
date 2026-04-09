function rpcHealthcheck(ctx, logger, nk, payload) {
    logger.info("Healthcheck RPC called.");
    return JSON.stringify({
        ok: true,
        message: "Nakama backend is working"
    });
}
function rpcCreateMatch(ctx, logger, nk, payload) {
    var matchId = nk.matchCreate("tictactoe", {});
    logger.info("Created TicTacToe match: %s", matchId);
    return JSON.stringify({
        ok: true,
        matchId: matchId
    });
}
var TICK_RATE = 1;
var MAX_EMPTY_TICKS = 30;
var OP_CODE_MOVE = 1;
var OP_CODE_STATE = 2;
var OP_CODE_ERROR = 3;
function getPublicState(state) {
    return {
        board: state.board,
        currentTurn: state.currentTurn,
        playerX: state.playerX,
        playerO: state.playerO,
        winner: state.winner,
        winnerUsername: state.winnerUsername,
        status: state.status
    };
}
function checkWinner(board) {
    var lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6]
    ];
    for (var i = 0; i < lines.length; i++) {
        var _a = lines[i], a = _a[0], b = _a[1], c = _a[2];
        if (board[a] !== "" && board[a] === board[b] && board[b] === board[c]) {
            return board[a];
        }
    }
    for (var i = 0; i < board.length; i++) {
        if (board[i] === "")
            return null;
    }
    return "draw";
}
var matchInit = function (ctx, logger, nk, params) {
    var state = {
        presences: {},
        board: ["", "", "", "", "", "", "", "", ""],
        currentTurn: "X",
        playerX: null,
        playerO: null,
        winner: null,
        winnerUsername: null,
        status: "waiting",
        emptyTicks: 0
    };
    logger.info("matchInit called");
    return {
        state: state,
        tickRate: TICK_RATE,
        label: "tictactoe"
    };
};
var matchJoinAttempt = function (ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
    var s = state;
    var count = Object.keys(s.presences).length;
    logger.info("matchJoinAttempt userId=%s count=%d", presence.userId, count);
    if (count >= 2) {
        return {
            state: s,
            accept: false,
            rejectMessage: "Match is full"
        };
    }
    return {
        state: s,
        accept: true
    };
};
var matchJoin = function (ctx, logger, nk, dispatcher, tick, state, presences) {
    var s = state;
    logger.info("matchJoin called, presences=%d", presences.length);
    for (var i = 0; i < presences.length; i++) {
        var p = presences[i];
        s.presences[p.userId] = p;
        if (!s.playerX) {
            s.playerX = {
                userId: p.userId,
                username: p.username
            };
        }
        else if (!s.playerO && (!s.playerX || s.playerX.userId !== p.userId)) {
            s.playerO = {
                userId: p.userId,
                username: p.username
            };
        }
    }
    if (s.playerX && s.playerO) {
        s.status = "playing";
    }
    dispatcher.broadcastMessage(OP_CODE_STATE, JSON.stringify(getPublicState(s)));
    return { state: s };
};
var matchLeave = function (ctx, logger, nk, dispatcher, tick, state, presences) {
    var s = state;
    logger.info("matchLeave called, presences=%d", presences.length);
    for (var i = 0; i < presences.length; i++) {
        var p = presences[i];
        delete s.presences[p.userId];
        if (s.playerX && s.playerX.userId === p.userId)
            s.playerX = null;
        if (s.playerO && s.playerO.userId === p.userId)
            s.playerO = null;
    }
    if (!s.playerX || !s.playerO) {
        s.status = "waiting";
    }
    return { state: s };
};
var matchLoop = function (ctx, logger, nk, dispatcher, tick, state, messages) {
    var _a, _b;
    var s = state;
    if (Object.keys(s.presences).length === 0) {
        s.emptyTicks++;
        if (s.emptyTicks >= MAX_EMPTY_TICKS) {
            logger.info("matchLoop ending due to empty match");
            return null;
        }
    }
    else {
        s.emptyTicks = 0;
    }
    for (var i = 0; i < messages.length; i++) {
        var msg = messages[i];
        if (msg.opCode !== OP_CODE_MOVE)
            continue;
        if (s.status !== "playing")
            continue;
        if (s.winner)
            continue;
        var payload = void 0;
        try {
            payload = JSON.parse(nk.binaryToString(msg.data));
        }
        catch (e) {
            dispatcher.broadcastMessage(OP_CODE_ERROR, JSON.stringify({ message: "Invalid payload" }), [msg.sender]);
            continue;
        }
        var idx = payload.index;
        if (idx < 0 || idx > 8) {
            dispatcher.broadcastMessage(OP_CODE_ERROR, JSON.stringify({ message: "Invalid cell index" }), [msg.sender]);
            continue;
        }
        var expectedUserId = s.currentTurn === "X" ? (_a = s.playerX) === null || _a === void 0 ? void 0 : _a.userId : (_b = s.playerO) === null || _b === void 0 ? void 0 : _b.userId;
        if (msg.sender.userId !== expectedUserId) {
            dispatcher.broadcastMessage(OP_CODE_ERROR, JSON.stringify({ message: "Not your turn" }), [msg.sender]);
            continue;
        }
        if (s.board[idx] !== "") {
            dispatcher.broadcastMessage(OP_CODE_ERROR, JSON.stringify({ message: "Cell already filled" }), [msg.sender]);
            continue;
        }
        s.board[idx] = s.currentTurn;
        var result = checkWinner(s.board);
        if (result) {
            s.winner = result;
            s.status = "finished";
            if (result === "X") {
                s.winnerUsername = s.playerX ? s.playerX.username : null;
            }
            else if (result === "O") {
                s.winnerUsername = s.playerO ? s.playerO.username : null;
            }
            else {
                s.winnerUsername = null;
            }
        }
        else {
            s.currentTurn = s.currentTurn === "X" ? "O" : "X";
        }
        dispatcher.broadcastMessage(OP_CODE_STATE, JSON.stringify(getPublicState(s)));
    }
    return { state: s };
};
var matchTerminate = function (ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
    logger.info("matchTerminate called");
    return { state: state };
};
var matchSignal = function (ctx, logger, nk, dispatcher, tick, state, data) {
    logger.info("matchSignal called");
    return {
        state: state,
        data: "ok"
    };
};
/// <reference types="nakama-runtime" />
/// <reference path="./rpc/healthcheck.ts" />
/// <reference path="./rpc/create_match.ts" />
/// <reference path="./match/tictactoe.ts" />
var InitModule = function (ctx, logger, nk, initializer) {
    initializer.registerRpc("healthcheck", rpcHealthcheck);
    initializer.registerRpc("create_match", rpcCreateMatch);
    initializer.registerMatch("tictactoe", {
        matchInit: matchInit,
        matchJoinAttempt: matchJoinAttempt,
        matchJoin: matchJoin,
        matchLeave: matchLeave,
        matchLoop: matchLoop,
        matchTerminate: matchTerminate,
        matchSignal: matchSignal
    });
    logger.info("Lila TicTacToe backend module loaded.");
};
!InitModule && InitModule.bind(null);
