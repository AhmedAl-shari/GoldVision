const request = require('supertest');
const app = require('../../enhanced-backend.js');

describe('Monte Carlo Simulation API Tests', () => {
  describe('POST /simulate', () => {
    it('should run GBM simulation with default parameters', async () => {
      const response = await request(app)
        .post('/simulate')
        .send({
          days: 10,
          method: 'gbm',
          n: 1000
        })
        .expect(200);

      expect(response.body).toHaveProperty('method', 'gbm');
      expect(response.body).toHaveProperty('days', 10);
      expect(response.body).toHaveProperty('n', 1000);
      expect(response.body).toHaveProperty('asset', 'XAU');
      expect(response.body).toHaveProperty('currency', 'USD');
      expect(response.body).toHaveProperty('fan');
      expect(response.body).toHaveProperty('var95');
      expect(response.body).toHaveProperty('cvar95');
      expect(response.body).toHaveProperty('seed', 42);
      
      // Validate fan data structure
      expect(response.body.fan).toBeInstanceOf(Array);
      expect(response.body.fan.length).toBe(10);
      
      response.body.fan.forEach((point, index) => {
        expect(point).toHaveProperty('ds');
        expect(point).toHaveProperty('p01');
        expect(point).toHaveProperty('p05');
        expect(point).toHaveProperty('p10');
        expect(point).toHaveProperty('p50');
        expect(point).toHaveProperty('p90');
        expect(point).toHaveProperty('p95');
        expect(point).toHaveProperty('p99');
        
        // Validate monotonic quantiles
        expect(point.p01).toBeLessThanOrEqual(point.p05);
        expect(point.p05).toBeLessThanOrEqual(point.p10);
        expect(point.p10).toBeLessThanOrEqual(point.p50);
        expect(point.p50).toBeLessThanOrEqual(point.p90);
        expect(point.p90).toBeLessThanOrEqual(point.p95);
        expect(point.p95).toBeLessThanOrEqual(point.p99);
        
        // Validate date format
        expect(point.ds).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
      
      // Validate VaR and CVaR
      expect(typeof response.body.var95).toBe('number');
      expect(typeof response.body.cvar95).toBe('number');
      expect(response.body.var95).toBeGreaterThan(0);
      expect(response.body.cvar95).toBeGreaterThan(0);
    });

    it('should run bootstrap simulation', async () => {
      const response = await request(app)
        .post('/simulate')
        .send({
          days: 5,
          method: 'bootstrap',
          n: 5000
        })
        .expect(200);

      expect(response.body).toHaveProperty('method', 'bootstrap');
      expect(response.body).toHaveProperty('days', 5);
      expect(response.body).toHaveProperty('n', 5000);
      expect(response.body.fan.length).toBe(5);
    });

    it('should handle custom volatility for GBM', async () => {
      const response = await request(app)
        .post('/simulate')
        .send({
          days: 7,
          method: 'gbm',
          annual_vol: 25,
          n: 2000
        })
        .expect(200);

      expect(response.body).toHaveProperty('method', 'gbm');
      expect(response.body).toHaveProperty('days', 7);
      expect(response.body.fan.length).toBe(7);
    });

    it('should handle custom drift for GBM', async () => {
      const response = await request(app)
        .post('/simulate')
        .send({
          days: 5,
          method: 'gbm',
          drift_adj: 5,
          n: 1000
        })
        .expect(200);

      expect(response.body).toHaveProperty('method', 'gbm');
      expect(response.body).toHaveProperty('days', 5);
      expect(response.body.fan.length).toBe(5);
    });

    it('should handle different number of paths', async () => {
      const response = await request(app)
        .post('/simulate')
        .send({
          days: 3,
          method: 'gbm',
          n: 10000
        })
        .expect(200);

      expect(response.body).toHaveProperty('n', 10000);
      expect(response.body.fan.length).toBe(3);
    });

    it('should work with different assets and currencies', async () => {
      const testCases = [
        { asset: 'XAG', currency: 'EUR' },
        { asset: 'XPT', currency: 'SAR' },
        { asset: 'XAU', currency: 'USD' }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/simulate')
          .send({
            ...testCase,
            days: 3,
            method: 'gbm',
            n: 1000
          })
          .expect(200);

        expect(response.body).toHaveProperty('asset', testCase.asset);
        expect(response.body).toHaveProperty('currency', testCase.currency);
        expect(response.body.fan.length).toBe(3);
      }
    });

    it('should validate method parameter', async () => {
      const response = await request(app)
        .post('/simulate')
        .send({
          method: 'invalid_method',
          days: 5
        })
        .expect(400);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail).toContain('Invalid method');
    });

    it('should validate days parameter', async () => {
      const response = await request(app)
        .post('/simulate')
        .send({
          days: 0,
          method: 'gbm'
        })
        .expect(400);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail).toContain('days must be positive');
    });

    it('should validate asset parameter', async () => {
      const response = await request(app)
        .post('/simulate')
        .send({
          asset: 'INVALID',
          days: 5,
          method: 'gbm'
        })
        .expect(400);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail).toContain('Invalid asset');
    });

    it('should validate currency parameter', async () => {
      const response = await request(app)
        .post('/simulate')
        .send({
          currency: 'INVALID',
          days: 5,
          method: 'gbm'
        })
        .expect(400);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail).toContain('Invalid currency');
    });

    it('should handle insufficient data gracefully', async () => {
      const response = await request(app)
        .post('/simulate')
        .send({
          asset: 'XAU',
          currency: 'INVALID_CURRENCY',
          days: 5,
          method: 'gbm'
        })
        .expect(400);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail).toContain('Insufficient historical data');
    });

    it('should cache simulation results', async () => {
      const simulationData = {
        days: 5,
        method: 'gbm',
        n: 1000
      };

      // First request
      const response1 = await request(app)
        .post('/simulate')
        .send(simulationData)
        .expect(200);

      // Second request should be faster (cached)
      const startTime = Date.now();
      const response2 = await request(app)
        .post('/simulate')
        .send(simulationData)
        .expect(200);
      const endTime = Date.now();

      // Results should be identical
      expect(response1.body).toEqual(response2.body);
      
      // Should be fast (cached)
      expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second
    });

    it('should generate different results for different parameters', async () => {
      const response1 = await request(app)
        .post('/simulate')
        .send({
          days: 5,
          method: 'gbm',
          annual_vol: 15,
          n: 1000
        })
        .expect(200);

      const response2 = await request(app)
        .post('/simulate')
        .send({
          days: 5,
          method: 'gbm',
          annual_vol: 30,
          n: 1000
        })
        .expect(200);

      // Results should be different due to different volatility
      expect(response1.body.fan).not.toEqual(response2.body.fan);
    });

    it('should handle edge case of 1 day simulation', async () => {
      const response = await request(app)
        .post('/simulate')
        .send({
          days: 1,
          method: 'gbm',
          n: 1000
        })
        .expect(200);

      expect(response.body).toHaveProperty('days', 1);
      expect(response.body.fan.length).toBe(1);
      expect(response.body.fan[0]).toHaveProperty('p50');
    });

    it('should handle maximum days simulation', async () => {
      const response = await request(app)
        .post('/simulate')
        .send({
          days: 60,
          method: 'gbm',
          n: 1000
        })
        .expect(200);

      expect(response.body).toHaveProperty('days', 60);
      expect(response.body.fan.length).toBe(60);
    });
  });
});

