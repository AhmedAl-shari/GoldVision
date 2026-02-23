const request = require('supertest');
const app = require('../../enhanced-backend.js');

describe('Multi-Asset Multi-Currency API Tests', () => {
  describe('GET /prices', () => {
    it('should return prices for XAU/USD by default', async () => {
      const response = await request(app)
        .get('/prices')
        .expect(200);

      expect(response.body).toHaveProperty('prices');
      expect(response.body).toHaveProperty('count');
      expect(response.body.prices).toBeInstanceOf(Array);
      
      if (response.body.prices.length > 0) {
        expect(response.body.prices[0]).toHaveProperty('ds');
        expect(response.body.prices[0]).toHaveProperty('price');
        expect(response.body.prices[0]).toHaveProperty('asset', 'XAU');
        expect(response.body.prices[0]).toHaveProperty('currency', 'USD');
      }
    });

    it('should return prices for XAG/EUR when requested', async () => {
      const response = await request(app)
        .get('/prices?asset=XAG&currency=EUR')
        .expect(200);

      expect(response.body).toHaveProperty('prices');
      expect(response.body.prices).toBeInstanceOf(Array);
      
      if (response.body.prices.length > 0) {
        expect(response.body.prices[0]).toHaveProperty('asset', 'XAG');
        expect(response.body.prices[0]).toHaveProperty('currency', 'EUR');
      }
    });

    it('should return prices for XPT/SAR when requested', async () => {
      const response = await request(app)
        .get('/prices?asset=XPT&currency=SAR')
        .expect(200);

      expect(response.body).toHaveProperty('prices');
      expect(response.body.prices).toBeInstanceOf(Array);
      
      if (response.body.prices.length > 0) {
        expect(response.body.prices[0]).toHaveProperty('asset', 'XPT');
        expect(response.body.prices[0]).toHaveProperty('currency', 'SAR');
      }
    });

    it('should validate asset parameter', async () => {
      const response = await request(app)
        .get('/prices?asset=INVALID')
        .expect(400);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail).toContain('Invalid asset');
    });

    it('should validate currency parameter', async () => {
      const response = await request(app)
        .get('/prices?currency=INVALID')
        .expect(400);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail).toContain('Invalid currency');
    });

    it('should support date range filtering', async () => {
      const fromDate = '2024-01-01';
      const toDate = '2024-01-31';
      
      const response = await request(app)
        .get(`/prices?from=${fromDate}&to=${toDate}`)
        .expect(200);

      expect(response.body).toHaveProperty('prices');
      expect(response.body.prices).toBeInstanceOf(Array);
    });

    it('should support limit parameter', async () => {
      const response = await request(app)
        .get('/prices?limit=5')
        .expect(200);

      expect(response.body).toHaveProperty('prices');
      expect(response.body.prices.length).toBeLessThanOrEqual(5);
    });
  });

  describe('POST /forecast', () => {
    it('should generate forecast for XAU/USD by default', async () => {
      const response = await request(app)
        .post('/forecast')
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty('generated_at');
      expect(response.body).toHaveProperty('horizon_days');
      expect(response.body).toHaveProperty('asset', 'XAU');
      expect(response.body).toHaveProperty('currency', 'USD');
      expect(response.body).toHaveProperty('forecast');
      expect(response.body.forecast).toBeInstanceOf(Array);
    });

    it('should generate forecast for XAG/EUR when requested', async () => {
      const response = await request(app)
        .post('/forecast')
        .send({
          asset: 'XAG',
          currency: 'EUR',
          horizon_days: 14
        })
        .expect(200);

      expect(response.body).toHaveProperty('asset', 'XAG');
      expect(response.body).toHaveProperty('currency', 'EUR');
      expect(response.body).toHaveProperty('horizon_days', 14);
    });

    it('should validate asset parameter', async () => {
      const response = await request(app)
        .post('/forecast')
        .send({ asset: 'INVALID' })
        .expect(400);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail).toContain('Invalid asset');
    });

    it('should validate currency parameter', async () => {
      const response = await request(app)
        .post('/forecast')
        .send({ currency: 'INVALID' })
        .expect(400);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail).toContain('Invalid currency');
    });

    it('should include history when requested', async () => {
      const response = await request(app)
        .post('/forecast')
        .send({ include_history: true })
        .expect(200);

      expect(response.body).toHaveProperty('history');
      expect(response.body.history).toBeInstanceOf(Array);
    });
  });

  describe('POST /simulate', () => {
    it('should run GBM simulation for XAU/USD by default', async () => {
      const response = await request(app)
        .post('/simulate')
        .send({
          days: 5,
          method: 'gbm',
          n: 1000
        })
        .expect(200);

      expect(response.body).toHaveProperty('method', 'gbm');
      expect(response.body).toHaveProperty('days', 5);
      expect(response.body).toHaveProperty('n', 1000);
      expect(response.body).toHaveProperty('asset', 'XAU');
      expect(response.body).toHaveProperty('currency', 'USD');
      expect(response.body).toHaveProperty('fan');
      expect(response.body).toHaveProperty('var95');
      expect(response.body).toHaveProperty('cvar95');
      expect(response.body.fan).toBeInstanceOf(Array);
      expect(response.body.fan.length).toBe(5);
    });

    it('should run bootstrap simulation for XAG/EUR', async () => {
      const response = await request(app)
        .post('/simulate')
        .send({
          asset: 'XAG',
          currency: 'EUR',
          days: 10,
          method: 'bootstrap',
          n: 5000
        })
        .expect(200);

      expect(response.body).toHaveProperty('method', 'bootstrap');
      expect(response.body).toHaveProperty('asset', 'XAG');
      expect(response.body).toHaveProperty('currency', 'EUR');
      expect(response.body).toHaveProperty('days', 10);
      expect(response.body.fan.length).toBe(10);
    });

    it('should validate simulation method', async () => {
      const response = await request(app)
        .post('/simulate')
        .send({ method: 'invalid' })
        .expect(400);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail).toContain('Invalid method');
    });

    it('should validate asset parameter', async () => {
      const response = await request(app)
        .post('/simulate')
        .send({ asset: 'INVALID' })
        .expect(400);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail).toContain('Invalid asset');
    });

    it('should validate currency parameter', async () => {
      const response = await request(app)
        .post('/simulate')
        .send({ currency: 'INVALID' })
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
          days: 5
        })
        .expect(400);

      expect(response.body).toHaveProperty('detail');
    });
  });

  describe('GET /alerts', () => {
    it('should return alerts for current user', async () => {
      const response = await request(app)
        .get('/alerts')
        .expect(200);

      expect(response.body).toHaveProperty('alerts');
      expect(response.body).toHaveProperty('count');
      expect(response.body.alerts).toBeInstanceOf(Array);
    });

    it('should filter alerts by asset', async () => {
      const response = await request(app)
        .get('/alerts?asset=XAU')
        .expect(200);

      expect(response.body).toHaveProperty('alerts');
      expect(response.body.alerts).toBeInstanceOf(Array);
    });

    it('should filter alerts by currency', async () => {
      const response = await request(app)
        .get('/alerts?currency=USD')
        .expect(200);

      expect(response.body).toHaveProperty('alerts');
      expect(response.body.alerts).toBeInstanceOf(Array);
    });

    it('should filter alerts by both asset and currency', async () => {
      const response = await request(app)
        .get('/alerts?asset=XAG&currency=EUR')
        .expect(200);

      expect(response.body).toHaveProperty('alerts');
      expect(response.body.alerts).toBeInstanceOf(Array);
    });
  });

  describe('POST /alerts', () => {
    it('should create alert for XAU/USD by default', async () => {
      const alertData = {
        rule_type: 'price_above',
        threshold: 2000,
        direction: 'above'
      };

      const response = await request(app)
        .post('/alerts')
        .send(alertData)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('asset', 'XAU');
      expect(response.body).toHaveProperty('currency', 'USD');
      expect(response.body).toHaveProperty('rule_type', 'price_above');
      expect(response.body).toHaveProperty('threshold', 2000);
      expect(response.body).toHaveProperty('direction', 'above');
    });

    it('should create alert for XAG/EUR when specified', async () => {
      const alertData = {
        asset: 'XAG',
        currency: 'EUR',
        rule_type: 'price_below',
        threshold: 25,
        direction: 'below'
      };

      const response = await request(app)
        .post('/alerts')
        .send(alertData)
        .expect(200);

      expect(response.body).toHaveProperty('asset', 'XAG');
      expect(response.body).toHaveProperty('currency', 'EUR');
      expect(response.body).toHaveProperty('rule_type', 'price_below');
      expect(response.body).toHaveProperty('threshold', 25);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/alerts')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail).toContain('Missing required fields');
    });

    it('should validate asset parameter', async () => {
      const response = await request(app)
        .post('/alerts')
        .send({
          asset: 'INVALID',
          rule_type: 'price_above',
          threshold: 1000,
          direction: 'above'
        })
        .expect(400);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail).toContain('Invalid asset');
    });

    it('should validate currency parameter', async () => {
      const response = await request(app)
        .post('/alerts')
        .send({
          currency: 'INVALID',
          rule_type: 'price_above',
          threshold: 1000,
          direction: 'above'
        })
        .expect(400);

      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail).toContain('Invalid currency');
    });
  });
});

