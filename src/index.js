import { DurableObject } from "cloudflare:workers";

export default {
  async fetch(request, env) {
    const upgradeHeader = request.headers.get("Upgrade");

    if (upgradeHeader !== "websocket") {
      return new Response("FPS Online Server", {
        status: 200,
      });
    }

    const url = new URL(request.url);

    // 今回はまず1部屋だけ使用
    const roomName = url.searchParams.get("room") || "room1";

    const id = env.GAME_ROOM.idFromName(roomName);
    const room = env.GAME_ROOM.get(id);

    return room.fetch(request);
  },
};

export class GameRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
  }

  async fetch(request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("GameRoom is running");
    }

    const pair = new WebSocketPair();

    const client = pair[0];
    const server = pair[1];

    this.ctx.acceptWebSocket(server);

    server.send(
      JSON.stringify({
        type: "connected",
        message: "Connected to FPS room",
      })
    );

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws, message) {
    // 受け取ったメッセージを他のプレイヤーへ送る
    for (const client of this.ctx.getWebSockets()) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  async webSocketClose(ws) {
    ws.close();
  }

  async webSocketError(ws, error) {
    console.error(error);
  }
}
