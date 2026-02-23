/**
 * Unit Tests for Forecast Controller
 */

const ForecastController = require('../../../backend/controllers/forecast.controller');
const ForecastService = require('../../../backend/services/forecast.service');

describe('ForecastController', () => {
  let controller;
  let mockService;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Mock service
    mockService = {
      generateForecast: jest.fn(),
      forecastCache: {
        flushAll: jest.fn(),
      },
    };

    controller = new ForecastController(mockService);

    // Mock request
    mockReq = {
      body: {
        horizon_days: 14,
        use_enhanced: true,
      },
      path: '/forecast',
    };

    // Mock response
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  describe('generateForecast', () => {
    it('should generate forecast successfully', async () => {
      const mockForecast = {
        generated_at: new Date().toISOString(),
        horizon_days: 14,
        forecast: [{ ds: '2025-11-23', yhat: 2150 }],
      };

      mockService.generateForecast.mockResolvedValue(mockForecast);

      await controller.generateForecast(mockReq, mockRes);

      expect(mockService.generateForecast).toHaveBeenCalledWith(mockReq.body);
      expect(mockRes.json).toHaveBeenCalledWith(mockForecast);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Service error');
      mockService.generateForecast.mockRejectedValue(error);

      await controller.generateForecast(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.any(String),
          title: 'Internal Server Error',
          status: 500,
          detail: 'Service error',
        })
      );
    });
  });

  describe('generateEnhancedForecast', () => {
    it('should generate enhanced forecast', async () => {
      const mockForecast = {
        generated_at: new Date().toISOString(),
        horizon_days: 14,
        forecast: [],
        enhanced: true,
      };

      mockService.generateForecast.mockResolvedValue(mockForecast);

      await controller.generateEnhancedForecast(mockReq, mockRes);

      expect(mockService.generateForecast).toHaveBeenCalledWith(
        expect.objectContaining({
          use_enhanced: true,
          use_ensemble: true,
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockForecast);
    });
  });

  describe('clearCache', () => {
    it('should clear forecast cache', async () => {
      await controller.clearCache(mockReq, mockRes);

      expect(mockService.forecastCache.flushAll).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Forecast cache cleared',
      });
    });

    it('should handle cache clear errors', async () => {
      const error = new Error('Cache error');
      mockService.forecastCache.flushAll.mockImplementation(() => {
        throw error;
      });

      await controller.clearCache(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAccuracyStats', () => {
    it('should return accuracy statistics', async () => {
      mockReq.query = { asset: 'XAU', currency: 'USD', days: 30 };

      await controller.getAccuracyStats(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          stats: expect.any(Object),
        })
      );
    });
  });
});

