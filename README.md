# Lila Games – Multiplayer Tic-Tac-Toe (Backend Engineering Assignment)

## Overview

This project implements a **real-time multiplayer Tic-Tac-Toe game** using a **server-authoritative architecture**.
The backend is powered by **Nakama**, and the frontend is built using **React + Vite**.

The game allows two players to join a match using a **match ID**, play turns in real time, and receive synchronized game state updates from the server.

The main goal of this assignment is to demonstrate:

* Multiplayer architecture
* Real-time game state synchronization
* Server-authoritative gameplay logic
* Clean frontend integration with backend services
* Scalable backend design for multiplayer games

---

# Tech Stack

### Frontend

* React
* Vite
* Nakama JS SDK
* CSS

### Backend

* Nakama (Heroic Labs)
* TypeScript
* Node.js

### Infrastructure

* Docker
* Docker Compose

---

# Architecture Overview

This project follows a **server-authoritative multiplayer architecture**.

All game logic is executed on the **Nakama backend**, ensuring fairness and preventing client-side cheating.

## Flow

1. Player enters a username
2. Player authenticates using Nakama device authentication
3. Player creates or joins a match
4. Nakama creates an authoritative match instance
5. Players send moves through WebSocket
6. Backend validates the move
7. Backend updates game state
8. Updated state is broadcast to all players

---

# Features

### Authentication

Players log in using a **username-based device authentication** system provided by Nakama.

### Matchmaking

Players can:

* Create a new match
* Share the generated match ID
* Join an existing match using the match ID

### Real-Time Gameplay

* Players take turns placing X or O
* Server validates moves
* Board updates instantly for both players

### Server-Authoritative Logic

All critical game logic is handled by the server:

* Turn validation
* Move validation
* Winner detection
* Game state updates

### Player Information

The system tracks:

* Player X username
* Player O username
* Current turn
* Game status
* Winner username

### Game Status

The UI displays:

* Waiting for players
* Playing
* Game finished

### Winner Detection

The backend determines the winner and broadcasts:

* Winning player username
* Draw state (if applicable)

---

# Project Structure

```
lila-tictactoe
│
├── backend
│   ├── src
│   │   ├── main.ts
│   │   ├── match
│   │   │   └── tictactoe.ts
│   │   └── rpc
│   │       ├── create_match.ts
│   │       └── healthcheck.ts
│   │
│   ├── package.json
│   └── tsconfig.json
│
├── frontend
│   ├── src
│   │   ├── App.jsx
│   │   ├── nakama.js
│   │   └── main.jsx
│   │
│   └── package.json
│
├── infra
│   └── docker-compose.yml
│
└── README.md
```

---

# Installation Guide

## Prerequisites

Make sure the following are installed:

* Node.js (v18+ recommended)
* Docker
* Docker Desktop
* npm

---

# Backend Setup

Navigate to the backend directory:

```
cd backend
```

Install dependencies:

```
npm install
```

Build the backend TypeScript code:

```
npm run build
```

---

# Start Nakama Server

Navigate to infrastructure folder:

```
cd ../infra
```

Start the server:

```
docker compose up --build
```

This will start:

* Nakama game server
* Postgres database

Nakama will run on:

```
http://127.0.0.1:7350
```

---

# Frontend Setup

Navigate to frontend directory:

```
cd frontend
```

Install dependencies:

```
npm install
```

Start the development server:

```
npm run dev
```

The frontend will run on:

```
http://localhost:5173
```

---

# How to Play

### Step 1

Open the frontend in two browser windows.

### Step 2

Player 1:

* Enter a username
* Click **Login**
* Click **Create Match**

A match ID will be generated.

### Step 3

Player 2:

* Enter a different username
* Click **Login**
* Enter the match ID
* Click **Join Match**

### Step 4

Players take turns placing X and O.

### Step 5

The system automatically detects:

* Winner
* Draw

---

# Game Rules

Standard Tic-Tac-Toe rules apply.

* 3x3 board
* Players alternate turns
* First player to align three symbols wins
* If board fills without a winner → draw

---

# Server-Authoritative Design

All critical operations occur on the server:

| Action           | Location |
| ---------------- | -------- |
| Move validation  | Server   |
| Turn validation  | Server   |
| Board update     | Server   |
| Winner detection | Server   |

Clients only send **move requests**.

---

# Future Improvements

Possible enhancements:

* Spectator mode
* Rematch system
* Match history
* Persistent player profiles
* Public matchmaking lobby
* Production deployment (AWS)

---

# Deployment

For this assignment the project runs locally using Docker.

In production, the system can be deployed using:

* AWS EC2
* Kubernetes
* Managed Nakama cloud

---

# Author

Mohammed Hamza Shaikh
Backend Developer
Ahmedabad, India

GitHub: https://github.com/<your-github>

---

# Notes

This project was built as part of the **Lila Games Backend Engineering Assignment** to demonstrate real-time multiplayer architecture and server-authoritative gameplay design.
