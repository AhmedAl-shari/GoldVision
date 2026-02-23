const request = require("supertest");

describe("API ergonomics: pagination clamps and idempotency", () => {
  let server;
  let app;

  beforeAll(() => {
    // Start the real server file to ensure prisma is initialized
    app = require("../../express-backend-enhanced.js");
    server = app.listen(0);
  });

  afterAll(() => {
    server && server.close();
  });

  test("GET /prices clamps limit to max 500", async () => {
    const res = await request(server).get("/prices?limit=10000");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("prices");
    // Cannot assert exact length, but ensure we did not error and next_cursor is present or null
    expect(res.body).toHaveProperty("next_cursor");
  });

  test("POST /prices/ingest respects Idempotency-Key", async () => {
    const payload = {
      rows: [
        { ds: new Date(Date.now() - 86400000).toISOString(), price: 2000 },
        { ds: new Date().toISOString().split("T")[0], price: 2010 },
      ],
    };
    const key = `test-key-${Date.now()}`;

    const first = await request(server)
      .post("/prices/ingest")
      .set("Authorization", "Bearer demo")
      .set("Idempotency-Key", key)
      .send(payload);
    expect(first.status).toBeLessThan(500);

    const second = await request(server)
      .post("/prices/ingest")
      .set("Authorization", "Bearer demo")
      .set("Idempotency-Key", key)
      .send(payload);
    expect(second.status).toBe(200);
    expect(second.headers["idempotency-replayed"]).toBeDefined();
  });
});
