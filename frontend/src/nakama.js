import { Client } from "@heroiclabs/nakama-js";

const client = new Client("defaultkey", "127.0.0.1", "7350", false);
client.timeout = 10000;

export async function authenticateDevice(username) {
  const cleanUsername = username.trim();

  if (!cleanUsername) {
    throw new Error("Username is required");
  }

  const storageKey = `nakama-device-id-${cleanUsername}`;
  let deviceId = localStorage.getItem(storageKey);

  if (!deviceId) {
    deviceId = `device-${cleanUsername}-${Date.now()}`;
    localStorage.setItem(storageKey, deviceId);
  }

  console.log("Authenticating with:", {
    host: "127.0.0.1",
    port: "7350",
    username: cleanUsername,
    deviceId
  });

  const session = await client.authenticateDevice(deviceId, true, cleanUsername);
  console.log("Authenticated session:", session);

  return session;
}

export function createSocket() {
  const socket = client.createSocket();

  socket.onclose = (evt) => {
    console.log("Socket closed:", evt);
  };

  socket.onerror = (err) => {
    console.log("Socket error:", err);
  };

  return socket;
}

export async function connectSocket(socket, session) {
  await socket.connect(session, true);
  console.log("Socket connected successfully");
}

export async function createMatch(session) {
  const res = await client.rpc(session, "create_match", "{}");

  console.log("RPC raw response:", res);

  let payload = res.payload;

  if (typeof payload === "string") {
    payload = JSON.parse(payload);
  }

  return payload;
}

export async function joinMatch(socket, matchId) {
  return await socket.joinMatch(matchId);
}

export function sendMove(socket, matchId, index) {
  return socket.sendMatchState(matchId, 1, JSON.stringify({ index }));
}

export { client };