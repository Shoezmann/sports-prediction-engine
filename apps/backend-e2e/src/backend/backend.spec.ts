import axios from 'axios';

const baseUrl = process.env.API_URL || 'http://localhost:3000/api';

describe('Sports Prediction Engine E2E', () => {
  describe('System Health', () => {
    it('should return system health status', async () => {
      const res = await axios.get(`${baseUrl}/health`);
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('up');
      expect(res.data.checks.database).toBe('connected');
    });
  });

  describe('Auth Flow', () => {
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'StrongPassword123!',
      name: 'E2E Tester'
    };

    it('should register a new user', async () => {
      const res = await axios.post(`${baseUrl}/auth/register`, testUser);
      expect(res.status).toBe(201);
      expect(res.data.email).toBe(testUser.email);
    });

    it('should login and return a JWT', async () => {
      const res = await axios.post(`${baseUrl}/auth/login`, {
        email: testUser.email,
        password: testUser.password
      });
      expect(res.status).toBe(200);
      expect(res.data.token).toBeDefined();
    });
  });

  describe('Predictions Pipeline', () => {
    it('should fetch pending predictions', async () => {
      const res = await axios.get(`${baseUrl}/predictions/pending`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
    });

    it('should fetch accuracy stats', async () => {
      const res = await axios.get(`${baseUrl}/accuracy`);
      expect(res.status).toBe(200);
      expect(res.data).toBeDefined();
    });
  });
});
