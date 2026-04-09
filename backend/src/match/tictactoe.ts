type Mark = "" | "X" | "O";

interface PlayerInfo {
  userId: string;
  username: string;
}

interface TicTacToeState extends nkruntime.MatchState {
  presences: { [userId: string]: nkruntime.Presence };
  board: Mark[];
  currentTurn: Mark;
  playerX: PlayerInfo | null;
  playerO: PlayerInfo | null;
  winner: Mark | "draw" | null;
  winnerUsername: string | null;
  status: "waiting" | "playing" | "finished";
  emptyTicks: number;
}

const TICK_RATE = 1;
const MAX_EMPTY_TICKS = 30;

const OP_CODE_MOVE = 1;
const OP_CODE_STATE = 2;
const OP_CODE_ERROR = 3;

function getPublicState(state: TicTacToeState) {
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

function checkWinner(board: Mark[]): Mark | "draw" | null {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];

  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (board[a] !== "" && board[a] === board[b] && board[b] === board[c]) {
      return board[a];
    }
  }

  for (let i = 0; i < board.length; i++) {
    if (board[i] === "") return null;
  }

  return "draw";
}

let matchInit: nkruntime.MatchInitFunction = function (
  ctx,
  logger,
  nk,
  params
) {
  const state: TicTacToeState = {
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

let matchJoinAttempt: nkruntime.MatchJoinAttemptFunction = function (
  ctx,
  logger,
  nk,
  dispatcher,
  tick,
  state,
  presence,
  metadata
) {
  const s = state as TicTacToeState;
  const count = Object.keys(s.presences).length;

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

let matchJoin: nkruntime.MatchJoinFunction = function (
  ctx,
  logger,
  nk,
  dispatcher,
  tick,
  state,
  presences
) {
  const s = state as TicTacToeState;

  logger.info("matchJoin called, presences=%d", presences.length);

  for (let i = 0; i < presences.length; i++) {
    const p = presences[i];
    s.presences[p.userId] = p;

    if (!s.playerX) {
      s.playerX = {
        userId: p.userId,
        username: p.username
      };
    } else if (!s.playerO && (!s.playerX || s.playerX.userId !== p.userId)) {
      s.playerO = {
        userId: p.userId,
        username: p.username
      };
    }
  }

  if (s.playerX && s.playerO) {
    s.status = "playing";
  }

  dispatcher.broadcastMessage(
    OP_CODE_STATE,
    JSON.stringify(getPublicState(s))
  );

  return { state: s };
};

let matchLeave: nkruntime.MatchLeaveFunction = function (
  ctx,
  logger,
  nk,
  dispatcher,
  tick,
  state,
  presences
) {
  const s = state as TicTacToeState;

  logger.info("matchLeave called, presences=%d", presences.length);

  for (let i = 0; i < presences.length; i++) {
    const p = presences[i];
    delete s.presences[p.userId];

    if (s.playerX && s.playerX.userId === p.userId) s.playerX = null;
    if (s.playerO && s.playerO.userId === p.userId) s.playerO = null;
  }

  if (!s.playerX || !s.playerO) {
    s.status = "waiting";
  }

  return { state: s };
};

let matchLoop: nkruntime.MatchLoopFunction = function (
  ctx,
  logger,
  nk,
  dispatcher,
  tick,
  state,
  messages
) {
  const s = state as TicTacToeState;

  if (Object.keys(s.presences).length === 0) {
    s.emptyTicks++;
    if (s.emptyTicks >= MAX_EMPTY_TICKS) {
      logger.info("matchLoop ending due to empty match");
      return null;
    }
  } else {
    s.emptyTicks = 0;
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    if (msg.opCode !== OP_CODE_MOVE) continue;
    if (s.status !== "playing") continue;
    if (s.winner) continue;

    let payload: { index: number };

    try {
      payload = JSON.parse(nk.binaryToString(msg.data));
    } catch (e) {
      dispatcher.broadcastMessage(
        OP_CODE_ERROR,
        JSON.stringify({ message: "Invalid payload" }),
        [msg.sender]
      );
      continue;
    }

    const idx = payload.index;

    if (idx < 0 || idx > 8) {
      dispatcher.broadcastMessage(
        OP_CODE_ERROR,
        JSON.stringify({ message: "Invalid cell index" }),
        [msg.sender]
      );
      continue;
    }

    const expectedUserId =
      s.currentTurn === "X" ? s.playerX?.userId : s.playerO?.userId;

    if (msg.sender.userId !== expectedUserId) {
      dispatcher.broadcastMessage(
        OP_CODE_ERROR,
        JSON.stringify({ message: "Not your turn" }),
        [msg.sender]
      );
      continue;
    }

    if (s.board[idx] !== "") {
      dispatcher.broadcastMessage(
        OP_CODE_ERROR,
        JSON.stringify({ message: "Cell already filled" }),
        [msg.sender]
      );
      continue;
    }

    s.board[idx] = s.currentTurn;

    const result = checkWinner(s.board);
    if (result) {
      s.winner = result;
      s.status = "finished";

      if (result === "X") {
        s.winnerUsername = s.playerX ? s.playerX.username : null;
      } else if (result === "O") {
        s.winnerUsername = s.playerO ? s.playerO.username : null;
      } else {
        s.winnerUsername = null;
      }
    } else {
      s.currentTurn = s.currentTurn === "X" ? "O" : "X";
    }

    dispatcher.broadcastMessage(
      OP_CODE_STATE,
      JSON.stringify(getPublicState(s))
    );
  }

  return { state: s };
};

let matchTerminate: nkruntime.MatchTerminateFunction = function (
  ctx,
  logger,
  nk,
  dispatcher,
  tick,
  state,
  graceSeconds
) {
  logger.info("matchTerminate called");
  return { state: state };
};

let matchSignal: nkruntime.MatchSignalFunction = function (
  ctx,
  logger,
  nk,
  dispatcher,
  tick,
  state,
  data
) {
  logger.info("matchSignal called");
  return {
    state: state,
    data: "ok"
  };
};