const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function testClientCreation() {
  try {
    let token;
    // 1. Try to Login
    console.log('Attempting login...');
    try {
      const loginRes = await axios.post(`${API_URL}/auth/login`, {
        email: 'dev@example.com',
        password: 'password123'
      });
      token = loginRes.data.token;
      console.log('Logged in successfully.');
    } catch (e) {
      console.log('Login failed, attempting registration...');
      const registerRes = await axios.post(`${API_URL}/auth/register`, {
        email: 'dev@example.com',
        password: 'password123',
        name: 'Dev User'
      });
      token = registerRes.data.token;
      console.log('Registered successfully.');
    }


    // 2. Create a client
    console.log('Creating a client...');
    const clientRes = await axios.post(`${API_URL}/clients`, {
      name: 'Test Client ' + Date.now(),
      industry: 'Technology',
      platforms: ['Meta']
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Client created:', clientRes.data);
    
    // 3. Verify client exists
    console.log('Fetching all clients...');
    const allClientsRes = await axios.get(`${API_URL}/clients`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const found = allClientsRes.data.find(c => c.id === clientRes.data.id);
    if (found) {
      console.log('SUCCESS: Client found in list.');
    } else {
      console.log('FAILURE: Client not found in list.');
    }

  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testClientCreation();
