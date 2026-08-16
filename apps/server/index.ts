import express from "express";
import http from "http";
import net from "net";
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

// Proxy WebSocket upgrade requests arriving on public port to internal WS gateway (port 3002)
server.on("upgrade", (req, socket, head) => {
  const wsTargetPort = parseInt(process.env.WS_PORT || "3002", 10);
  const proxySocket = net.connect(wsTargetPort, "127.0.0.1", () => {
    proxySocket.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`);
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      proxySocket.write(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`);
    }
    proxySocket.write("\r\n");
    if (head && head.length > 0) {
      proxySocket.write(head);
    }
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });

  proxySocket.on("error", (err) => {
    console.error("WS upgrade forwarding error:", err.message);
    socket.destroy();
  });

  socket.on("error", () => {
    proxySocket.destroy();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
