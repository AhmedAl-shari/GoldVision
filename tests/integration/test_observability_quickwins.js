const request = require("supertest");

describe("Observability quick wins: x-request-id, JSON logs, Prometheus", () => {
  let server;
  let app;

  beforeAll(() => {
    app = require("../../express-backend-enhanced.js");
    server = app.listen(0);
  });

  afterAll(() => {
    server && server.close();
  });

  test("x-request-id header is attached", async () => {
    const res = await request(server).get("/health");
    expect(res.status).toBe(200);
    expect(res.headers["x-request-id"]).toBeDefined();
  });

  test("Prometheus metrics endpoint is available", async () => {
    const res = await request(server).get("/metrics");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/plain/);
    expect(res.text).toMatch(/http_requests_total/);
  });
});
