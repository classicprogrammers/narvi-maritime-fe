const axios = require('axios');

class OdooService {
  constructor() {
    this.baseURL = process.env.ODOO_URL;
    this.database = process.env.ODOO_DATABASE;
    this.username = process.env.ODOO_USERNAME;
    this.password = process.env.ODOO_PASSWORD;
    this.sessionId = null;
  }

  // Initialize session with Odoo
  async initializeSession() {
    try {
      const response = await axios.get(`${this.baseURL}/web/session/authenticate`, {
        params: {
          db: this.database,
          login: this.username,
          password: this.password
        }
      });

      if (response.data && response.data.result && response.data.result.uid) {
        this.sessionId = response.headers['set-cookie']?.[0]?.split(';')[0];
        console.log('✅ Odoo session initialized successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to initialize Odoo session:', error.message);
      return false;
    }
  }

  // Authenticate user with Odoo
  async authenticateUser(email, password) {
    try {
      const response = await axios.post(`${this.baseURL}/web/session/authenticate`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          db: this.database,
          login: email,
          password: password
        }
      });

      if (response.data && response.data.result && response.data.result.uid) {
        return {
          success: true,
          user: {
            id: response.data.result.uid,
            name: response.data.result.user_context?.name || email,
            email: email,
            session_id: response.headers['set-cookie']?.[0]?.split(';')[0]
          }
        };
      }
      return { success: false, message: 'Invalid credentials' };
    } catch (error) {
      console.error('❌ Odoo authentication error:', error.message);
      return { success: false, message: 'Authentication failed' };
    }
  }

  // Create user in Odoo
  async createUser(userData) {
    try {
      const response = await axios.post(`${this.baseURL}/web/dataset/call_kw`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'res.users',
          method: 'create',
          args: [[{
            name: userData.name,
            login: userData.email,
            email: userData.email,
            password: userData.password,
            active: true
          }]],
          kwargs: {}
        }
      }, {
        headers: {
          'Cookie': this.sessionId
        }
      });

      if (response.data && response.data.result) {
        return {
          success: true,
          user_id: response.data.result
        };
      }
      return { success: false, message: 'Failed to create user in Odoo' };
    } catch (error) {
      console.error('❌ Odoo user creation error:', error.message);
      return { success: false, message: 'User creation failed' };
    }
  }

  // Check if user exists in Odoo
  async checkUserExists(email) {
    try {
      const response = await axios.post(`${this.baseURL}/web/dataset/call_kw`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'res.users',
          method: 'search_count',
          args: [[['login', '=', email]]],
          kwargs: {}
        }
      }, {
        headers: {
          'Cookie': this.sessionId
        }
      });

      return response.data && response.data.result > 0;
    } catch (error) {
      console.error('❌ Odoo user check error:', error.message);
      return false;
    }
  }

  // Get user details from Odoo
  async getUserDetails(userId) {
    try {
      const response = await axios.post(`${this.baseURL}/web/dataset/call_kw`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'res.users',
          method: 'read',
          args: [[userId], ['id', 'name', 'login', 'email', 'active']],
          kwargs: {}
        }
      }, {
        headers: {
          'Cookie': this.sessionId
        }
      });

      if (response.data && response.data.result && response.data.result[0]) {
        return {
          success: true,
          user: response.data.result[0]
        };
      }
      return { success: false, message: 'User not found' };
    } catch (error) {
      console.error('❌ Odoo user details error:', error.message);
      return { success: false, message: 'Failed to get user details' };
    }
  }

  // Update user password in Odoo
  async updateUserPassword(userId, newPassword) {
    try {
      const response = await axios.post(`${this.baseURL}/web/dataset/call_kw`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'res.users',
          method: 'write',
          args: [[userId], { password: newPassword }],
          kwargs: {}
        }
      }, {
        headers: {
          'Cookie': this.sessionId
        }
      });

      return response.data && response.data.result;
    } catch (error) {
      console.error('❌ Odoo password update error:', error.message);
      return false;
    }
  }

  // Get mail server details (your specific endpoint)
  async getMailServer(id = 1) {
    try {
      const response = await axios.get(`${this.baseURL}/web`, {
        params: {
          debug: 1,
          reload: '',
          cids: 1,
          menu_id: 30,
          action: 17,
          model: 'ir.mail_server',
          view_type: 'form',
          id: id
        },
        headers: {
          'Cookie': this.sessionId
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Odoo mail server fetch error:', error.message);
      return { success: false, message: 'Failed to fetch mail server' };
    }
  }
}

module.exports = new OdooService();
