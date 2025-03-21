const jwt = require('jsonwebtoken');
const axios = require('axios');

class GoogleWalletService {
    constructor() {
        this.ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID || '3388000000022884108';
        this.CLASS_ID = `${this.ISSUER_ID}.pokemon_loyalty_card`;
        this.privateKey = process.env.GOOGLE_WALLET_PRIVATE_KEY.replace(/\\n/g, '\n');
        this.clientEmail = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;
    }

    async getAccessToken() {
        const now = Math.floor(Date.now() / 1000);
        const jwtClaims = {
            iss: this.clientEmail,
            scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600,
            iat: now
        };

        const token = jwt.sign(jwtClaims, this.privateKey, { algorithm: 'RS256' });
        const response = await axios.post('https://oauth2.googleapis.com/token', {
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: token
        });

        return response.data.access_token;
    }

    async createLoyaltyClass() {
        try {
            const accessToken = await this.getAccessToken();
            const loyaltyClass = {
                id: this.CLASS_ID,
                issuerName: 'Mamitas Tepic',
                programName: 'Club Pokémon',
                programLogo: {
                    sourceUri: {
                        uri: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png'
                    }
                },
                reviewStatus: 'UNDER_REVIEW',
                hexBackgroundColor: '#FF5733'
            };

            await axios.post(
                'https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass',
                loyaltyClass,
                {
                    headers: { Authorization: `Bearer ${accessToken}` }
                }
            );

            return true;
        } catch (error) {
            if (error.response?.status === 409) {
                console.log('Loyalty class already exists');
                return true;
            }
            console.error('Error creating loyalty class:', error.response?.data || error);
            throw error;
        }
    }

    async createLoyaltyObject(userId, customerInfo) {
        try {
            const accessToken = await this.getAccessToken();
            const objectId = `${this.ISSUER_ID}.user_${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
            
            const loyaltyObject = {
                id: objectId,
                classId: this.CLASS_ID,
                state: 'ACTIVE',
                accountId: customerInfo.email,
                accountName: customerInfo.name,
                barcode: {
                    type: 'QR_CODE',
                    value: userId
                },
                loyaltyPoints: {
                    balance: {
                        int: 0
                    },
                    label: 'Puntos disponibles'
                }
            };

            await axios.post(
                'https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject',
                loyaltyObject,
                {
                    headers: { Authorization: `Bearer ${accessToken}` }
                }
            );

            return objectId;
        } catch (error) {
            console.error('Error creating loyalty object:', error.response?.data || error);
            throw error;
        }
    }

    async createPass(userId, customerInfo) {
        try {
            // Asegurarse de que la clase existe
            await this.createLoyaltyClass();
            
            // Crear el objeto de lealtad
            const objectId = await this.createLoyaltyObject(userId, customerInfo);

            // Crear el JWT para el botón de "Add to Google Wallet"
            const claims = {
                iss: this.clientEmail,
                aud: 'google',
                origins: ['http://localhost:3000', 'http://192.168.100.2:3000'],
                typ: 'savetowallet',
                payload: {
                    loyaltyObjects: [{
                        id: objectId,
                        classId: this.CLASS_ID
                    }]
                }
            };

            const token = jwt.sign(claims, this.privateKey, { algorithm: 'RS256' });
            const saveUrl = `https://pay.google.com/gp/v/save/${token}`;
            
            return saveUrl;
        } catch (error) {
            console.error('Error in createPass:', error);
            throw error;
        }
    }
}

module.exports = new GoogleWalletService();
