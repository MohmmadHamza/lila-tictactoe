import { useEffect, useState } from "react";
import {
  authenticateDevice,
  createSocket,
  connectSocket,
  createMatch,
  joinMatch,
  sendMove
} from "./nakama";

function App() {
  const [username, setUsername] = useState("");
  const [session, setSession] = useState(null);
  const [socket, setSocket] = useState(null);
  const [matchId, setMatchId] = useState("");
  const [joinedMatchId, setJoinedMatchId] = useState("");
  const [status, setStatus] = useState("Enter username to start");
  const [board, setBoard] = useState(["", "", "", "", "", "", "", "", ""]);
  const [currentTurn, setCurrentTurn] = useState("X");
  const [winner, setWinner] = useState(null);
  const [gameStatus, setGameStatus] = useState("waiting");
  const [error, setError] = useState("");
  const [playerX, setPlayerX] = useState(null);
  const [playerO, setPlayerO] = useState(null);
  const [winnerUsername, setWinnerUsername] = useState(null);

  const handleLogin = async () => {
    try {
      setError("");
      console.log("1. Starting login");
  
      const authSession = await authenticateDevice(username);
      console.log("2. Auth success", authSession);
  
      const sock = createSocket();
      console.log("3. Socket created", sock);
  
      sock.onmatchdata = (message) => {
        console.log("5. Match data received", message);
  
        try {
          let raw = message.data;
  
          if (raw instanceof Uint8Array) {
            raw = new TextDecoder().decode(raw);
          }
  
          const decoded = typeof raw === "string" ? JSON.parse(raw) : raw;
  
          if (message.op_code === 2) {
            setBoard(decoded.board || ["", "", "", "", "", "", "", "", ""]);
            setCurrentTurn(decoded.currentTurn || "X");
            setWinner(decoded.winner || null);
            setWinnerUsername(decoded.winnerUsername || null);
            setPlayerX(decoded.playerX || null);
            setPlayerO(decoded.playerO || null);
            setGameStatus(decoded.status || "waiting");
            setStatus("Match state updated");
          }
  
          if (message.op_code === 3) {
            setError(decoded.message || "Unknown error");
          }
        } catch (parseError) {
          console.error("Failed to parse match data:", parseError, message.data);
        }
      };
  
      sock.ondisconnect = (evt) => {
        console.log("Socket disconnected", evt);
        setStatus("Socket disconnected");
      };
  
      await connectSocket(sock, authSession);
      console.log("4. Socket connected");
  
      setSession(authSession);
      setSocket(sock);
      setStatus("Logged in and socket connected");
      console.log("6. Login flow completed");
    } catch (err) {
      console.error("Login failed:", err);
  
      if (err && err.status) {
        setError(`Login failed (${err.status})`);
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError("Login failed");
      }
    }
  };

  const handleCreateMatch = async () => {
    try {
      setError("");
  
      if (!session) {
        setError("Please login first");
        return;
      }
  
      if (!socket) {
        setError("Socket not ready. Please login again.");
        return;
      }
  
      console.log("Creating match...");
  
      const res = await createMatch(session);
      console.log("Create match response:", res);
  
      const createdMatchId = res?.matchId;
  
      if (!createdMatchId) {
        throw new Error("No matchId returned from create_match RPC");
      }
  
      setMatchId(createdMatchId);
  
      const result = await joinMatch(socket, createdMatchId);
      console.log("Joined created match:", result);
  
      setJoinedMatchId(result.match_id || createdMatchId);
      setStatus(`Created and joined match: ${createdMatchId}`);
    } catch (err) {
      console.error("Create match failed:", err);
  
      if (err?.message) {
        setError(err.message);
      } else {
        setError("Failed to create or join match");
      }
    }
  };

  const handleJoinMatch = async () => {
    try {
      setError("");
  
      if (!socket) {
        setError("Socket not ready. Please login first.");
        return;
      }
  
      if (!matchId || !matchId.trim()) {
        setError("Please enter a valid match ID");
        return;
      }
  
      const cleanMatchId = matchId.trim();
      console.log("Joining match with ID:", cleanMatchId);
  
      const result = await joinMatch(socket, cleanMatchId);
      console.log("Join match response:", result);
  
      setJoinedMatchId(result.match_id || cleanMatchId);
      setStatus(`Joined match: ${result.match_id || cleanMatchId}`);
    } catch (err) {
      console.error("Join match failed:", err);
  
      if (err?.message) {
        setError(err.message);
      } else {
        setError("Failed to join match");
      }
    }
  };

  const handleCellClick = async (index) => {
    if (!socket || !joinedMatchId) return;
    if (gameStatus === "finished") return;
    if (board[index] !== "") return;
  
    try {
      setError("");
      await sendMove(socket, joinedMatchId, index);
    } catch (err) {
      console.error(err);
      setError("Failed to send move");
    }
  };

  return (
    <div className="app">
      <h1>Lila Tic-Tac-Toe</h1>

      <div className="card">
        <input
          type="text"
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <button onClick={handleLogin} disabled={!username}>
          Login
        </button>
      </div>

      <div className="card">
      <button onClick={handleCreateMatch} disabled={!session || !socket}>
        Create & Join Match
      </button>

        <input
          type="text"
          placeholder="Paste match ID"
          value={matchId}
          onChange={(e) => setMatchId(e.target.value)}
        />

        <button
          onClick={handleJoinMatch}
          disabled={!socket || !matchId.trim() || joinedMatchId === matchId.trim()}
          >
          Join Match
        </button>
      </div>

      <div className="card">
        <p><strong>Status:</strong> {status}</p>
        <p><strong>Game Status:</strong> {gameStatus}</p>
        <p><strong>Current Turn:</strong> {currentTurn}</p>
        <p><strong>Player X:</strong> {playerX?.username || "-"}</p>
        <p><strong>Player O:</strong> {playerO?.username || "-"}</p>
        <p><strong>Winner:</strong> {winnerUsername || (winner === "draw" ? "Draw" : "-")}</p>
        <p><strong>Joined Match ID:</strong> {joinedMatchId || "-"}</p>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="board">
        {board.map((cell, index) => (
          <button
            key={index}
            className="cell"
            onClick={() => handleCellClick(index)}
          >
            {cell}
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;