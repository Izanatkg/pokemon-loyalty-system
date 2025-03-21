const axios = require('axios');

class LoyverseService {
    constructor() {
        this.api = axios.create({
            baseURL: 'https://api.loyverse.com/v1.0',
            headers: {
                'Authorization': `Bearer ${process.env.LOYVERSE_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
    }

    async createCustomer(customerData) {
        try {
            console.log('Creating customer in Loyverse:', JSON.stringify(customerData, null, 2));
            const response = await this.api.post('/customers', {
                ...customerData,
                loyalty_program_enabled: true
            });
            
            console.log('Loyverse response:', JSON.stringify(response.data, null, 2));
            return response.data;
        } catch (error) {
            console.error('Error creating customer in Loyverse:', error.response?.data || error);
            throw error;
        }
    }

    async getCustomer(customerId) {
        try {
            const response = await this.api.get(`/customers/${customerId}`);
            return response.data;
        } catch (error) {
            console.error('Error getting customer from Loyverse:', error.response?.data || error);
            throw error;
        }
    }
}

module.exports = new LoyverseService();
