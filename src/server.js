import { createServer } from "node:http";
import { greet } from "./greet.js";

const port = Number(process.env.PORT ?? 3000);
createServer((req, res) => {
  const name = new URL(req.url, "http://localhost").searchParams.get("name") ?? undefined;
  res.writeHead(200, { "content-type": "text/plain" });
  res.end(greet(name));
}).listen(port, () => console.log(`Listening on http://localhost:${port}`));
