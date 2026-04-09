/// <reference types="nakama-runtime" />
/// <reference path="./rpc/healthcheck.ts" />
/// <reference path="./rpc/create_match.ts" />
/// <reference path="./match/tictactoe.ts" />

let InitModule: nkruntime.InitModule = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    initializer: nkruntime.Initializer
  ) {
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