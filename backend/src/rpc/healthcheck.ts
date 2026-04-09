function rpcHealthcheck(
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
  ): string {
    logger.info("Healthcheck RPC called.");
    return JSON.stringify({
      ok: true,
      message: "Nakama backend is working"
    });
  }