function rpcCreateMatch(
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
  ): string {
    const matchId = nk.matchCreate("tictactoe", {});
    logger.info("Created TicTacToe match: %s", matchId);
  
    return JSON.stringify({
      ok: true,
      matchId: matchId
    });
  }