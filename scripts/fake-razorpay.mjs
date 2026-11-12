// Minimal stand-in for api.razorpay.com so the real order-creation code path can be tested offline.
import http from "node:http";
import { randomBytes } from "node:crypto";
const expect = "Basic " + Buffer.from("rzp_test_x:test_secret").toString("base64");
http.createServer((req, res) => {
  let b = ""; req.on("data", (c) => (b += c));
  req.on("end", () => {
    const send = (code, o) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(o)); };
    if (req.method !== "POST" || req.url !== "/v1/orders") return send(404, {});
    if (req.headers.authorization !== expect) return send(401, { error: { description: "Authentication failed" } });
    const o = JSON.parse(b);
    if (o.currency !== "INR" || !Number.isInteger(o.amount) || o.amount < 100) return send(400, { error: { description: "Bad order" } });
    send(200, { id: "order_" + randomBytes(7).toString("hex"), amount: o.amount, currency: "INR", status: "created", notes: o.notes });
  });
}).listen(4010, () => console.log("fake razorpay on 4010"));
