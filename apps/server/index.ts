import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { getRedisClient } from "@repo/redis";
import { engineRouter } from "./routes/engine.routes";
import { userRouter } from "./routes/user.routes";

const app = express();

app.use((req, res, next) => {
  req.url = req.url.replace(/\/{2,}/g, "/");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

app.use(express.json());
app.use(userRouter);
app.use(engineRouter);

const server = http.createServer(app);

// Native WebSocket server attached directly to the public HTTP server (Port 3000)
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log(`Frontend client connected. Total clients: ${wss.clients.size}`);
  ws.on("close", () => {
    console.log(`Frontend client disconnected. Total clients: ${wss.clients.size}`);
  });
});

async function startEngineSubscriber() {
  try {
    const subscriber = await getRedisClient();
    await subscriber.subscribe("engine-data", (message) => {
      for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      }
    });
    console.log("WebSocket engine-data subscriber active");
  } catch (err) {
    console.error("Failed to subscribe to engine-data:", err);
  }
}

void startEngineSubscriber();

const PORT = parseInt(process.env.PORT || "3000", 10);
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on 0.0.0.0:${PORT}`);
});
