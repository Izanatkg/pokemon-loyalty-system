const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

class GoogleWalletService {
    constructor() {
        this.ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID || '3388000000022884108';
        this.CLASS_ID = `${this.ISSUER_ID}.pokemon_loyalty_card`;
    }

    async createPass(userId, customerInfo) {
        try {
            // Definir el objeto de lealtad
            const objectId = `${this.ISSUER_ID}.user_${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

            // Crear el JWT payload
            const claims = {
                iss: process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL,
                aud: 'google',
                origins: ['http://localhost:3000', 'http://192.168.100.2:3000'],
                typ: 'savetowallet',
                payload: {
                    genericObjects: [{
                        id: objectId,
                        classId: this.CLASS_ID,
                        genericType: "LOYALTY_CLASS",
                        logo: {
                            sourceUri: {
                                uri: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
                            }
                        },
                        cardTitle: {
                            defaultValue: {
                                language: "es",
                                value: "Club Pokémon"
                            }
                        },
                        subheader: {
                            defaultValue: {
                                language: "es",
                                value: customerInfo.name
                            }
                        },
                        header: {
                            defaultValue: {
                                language: "es",
                                value: "Mamitas Tepic"
                            }
                        },
                        barcode: {
                            type: "QR_CODE",
                            value: userId
                        },
                        hexBackgroundColor: "#FF5733",
                        heroImage: {
                            sourceUri: {
                                uri: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png"
                            }
                        }
                    }]
                }
            };

            // Firmar el JWT con la clave privada
            const privateKey = process.env.GOOGLE_WALLET_PRIVATE_KEY.replace(/\\n/g, '\n');
            const token = jwt.sign(claims, privateKey, { algorithm: 'RS256' });
            
            // Generar la URL de "Add to Google Wallet"
            const saveUrl = `https://pay.google.com/gp/v/save/${token}`;
            console.log('Generated save URL:', saveUrl);
            
            return saveUrl;

        } catch (error) {
            console.error('Error in createPass:', error);
            throw error;
        }
    }
}

module.exports = new GoogleWalletService();
