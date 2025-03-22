const axios = require('axios');

class LoyverseService {
    constructor() {
        this.api = axios.create({
            baseURL: 'https://api.loyverse.com/v1.0',
            headers: {
                'Authorization': 'Bearer 68c66646696548af983a2a0b8e64c2ec',
                'Content-Type': 'application/json'
            }
        });
        this.storeId = 'b7e82499-21b0-4e9d-aae5-16d90693c77a';
    }

    generateCustomerCode() {
        // Generar un código de 8 dígitos
        return Math.floor(10000000 + Math.random() * 90000000).toString();
    }

    async createCustomer(customerData) {
        try {
            const customerCode = this.generateCustomerCode();
            const response = await this.api.post('/customers', {
                ...customerData,
                customer_code: customerCode,
                loyalty_program_enabled: true,
                loyalty_balance: 0
            });
            
            // Devolvemos tanto los datos del cliente como el código
            return {
                ...response.data,
                customer_code: customerCode
            };
        } catch (error) {
            console.error('Error creating customer in Loyverse:', error.response?.data || error.message);
            throw error;
        }
    }

    async getCustomerPoints(customerId) {
        try {
            const response = await this.api.get(`/customers/${customerId}`);
            return {
                points: response.data.loyalty_balance || 0,
                pointsValue: (response.data.loyalty_balance || 0) * 1.00, // 1 punto = $1.00 MXN
                welcomeBonus: "10% en tu primera compra",
                customer_code: response.data.customer_code
            };
        } catch (error) {
            console.error('Error getting customer points:', error.response?.data || error.message);
            throw error;
        }
    }
}

module.exports = new LoyverseService();
