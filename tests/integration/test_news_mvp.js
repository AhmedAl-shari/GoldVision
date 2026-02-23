const request = require("supertest");

describe("News MVP: pagination and SSE headers", () => {
  let server;
  let app;

  beforeAll(() => {
    app = require("../../express-backend-enhanced.js");
    server = app.listen(0);
  });

  afterAll(() => {
    server && server.close();
  });

  test("GET /news returns items with cursor fields", async () => {
    const res = await request(server).get("/news?limit=5");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("items");
    expect(res.body).toHaveProperty("next_cursor");
  });

  test("SSE /news/stream returns event-stream headers", async () => {
    const res = await request(server).get("/news/stream");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/event-stream/);
  });
});
