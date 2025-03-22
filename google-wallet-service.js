const jwt = require('jsonwebtoken');
const axios = require('axios');

class GoogleWalletService {
    constructor() {
        this.ISSUER_ID = '3388000000022884108';
        this.CLASS_ID = `${this.ISSUER_ID}.pokemon_loyalty_card`;
        this.OBJECT_ID_PREFIX = `${this.ISSUER_ID}.user_`;
        this.clientEmail = 'spacecards@puntos-loyvers.iam.gserviceaccount.com';
        this.privateKey = '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC4D+0//5JeRXue\n3DZk8ZXlRI0LmiSkSmgwhcJLV2nClDwK7HtzXFT8RR/xii0SJ2BoETO/vI9SGlOK\nAfZ9naYxJAKAL0htsbJT6cNhMY4nKim/h9rPEY3qZOXGkIKWocxLjvDhsr0zQ98s\nIJea3jRU5amg21eJsVnZlK62V7eeuxzxuXzWFvKY5qoz0DPPU6vz2/6AAMIukwhT\nb48ggDSzY1yoL4GPSbmjljFWAUTkDZoXMVrowmVK+7QOcEyEBEju37joAExa1hYI\nL60CS6bMxcMRDmuDunvqYAk3CJoNirTlFubxyqMaI0AjkVeKYlfze8I/A1qIyR14\npdkKqcVfAgMBAAECggEAAIxw7+s6a8mCkCX74Np6JeV0aNUcHYPol5cZIycENljs\nF47o4fPOf7SntGKYYSDOQBZ9Canti23EqKP6MMRS2yajqJomJHLjzdg5MDBOSijt\nWELMENND5wTx97Y1OBm3WtT25tVPjGLmvAzvfBNZeJSj/XS/PWEn8Wa+C+ZrB7AU\ncys+MvZCx6CmpDoumFWTRgFUX1AoxkcqgEEE39mqx+ZAS77zg0ILromcQIrOMJPk\nUYFOgXyoWKP9yxAbjRjaYUkeLF2DGk4biIOeUbFWQ1/rtZ6TEy5Z4eTRBZ4H02Gm\nu9IfR4pADW/PsQ9Edtz38p/kJatT70s6p9sh6D16QQKBgQDvTqE96ZD9oR0S2QvW\nwC3jIs5LoJaeqZBlKDXpIpVXZuAwW79NyowbqP3Xyp1YFSwIEnH9Oe8DOnRVYpT2\nPcp4icHgkQP5k03AQyE2BQ2dZSJA/G/L1CLYPds7y9HCYpEbktYwNn3WtV2wpab+\nOGsFDjxk+MTNfKU+ITiqt/EdkQKBgQDE5sYSGHrv3zIVxEgXW8/M3H7Jnu+z++oG\nqMvUCJDq+Qe4+KyWOYY2/UUvZ+3jIccO4Irtriy4m+GrDPg9GuJA7FPZ5BEduNcu\nguRO08EnDWeMS0q12WjP6aMOYRj+AiihAL+1bUgXEfJjicOnyKlfqSwBPHKelKme\nI0fr3nL77w';
    }

    generateJwt() {
        const claims = {
            iss: this.clientEmail,
            aud: 'google',
            typ: 'savetoandroidpay',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600
        };

        return jwt.sign(claims, this.privateKey, { algorithm: 'RS256' });
    }

    async createPass(userId, customerInfo) {
        try {
            console.log('Iniciando creación del pase para:', customerInfo);
            const objectId = `${this.OBJECT_ID_PREFIX}${userId}`;

            const loyaltyObject = {
                id: objectId,
                classId: this.CLASS_ID,
                state: 'active',
                heroImage: {
                    sourceUri: {
                        uri: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png"
                    },
                    contentDescription: {
                        defaultValue: {
                            language: "es-MX",
                            value: "Pikachu"
                        }
                    }
                },
                textModulesData: [
                    {
                        header: "Puntos Pokémon",
                        body: "0",
                        id: "points"
                    },
                    {
                        header: "Nivel",
                        body: "Entrenador Novato",
                        id: "level"
                    }
                ],
                linksModuleData: {
                    uris: [
                        {
                            uri: "https://www.pokemon.com/es/",
                            description: "Sitio web oficial de Pokémon",
                            id: "pokemon_website"
                        }
                    ]
                },
                imageModulesData: [
                    {
                        mainImage: {
                            sourceUri: {
                                uri: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png"
                            },
                            contentDescription: {
                                defaultValue: {
                                    language: "es-MX",
                                    value: "Tu Pokémon inicial"
                                }
                            }
                        },
                        id: "pokemon_image"
                    }
                ],
                accountId: customerInfo.email,
                accountName: customerInfo.name
            };

            const token = this.generateJwt();
            const response = await axios.post(
                'https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject',
                loyaltyObject,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            console.log('Pase creado exitosamente:', response.data);

            const claims = {
                iss: this.clientEmail,
                aud: 'google',
                typ: 'savetowallet',
                iat: Math.floor(Date.now() / 1000),
                payload: {
                    loyaltyObjects: [{ id: objectId }]
                }
            };

            const jwt_token = jwt.sign(claims, this.privateKey, { algorithm: 'RS256' });
            return `https://pay.google.com/gp/v/save/${jwt_token}`;
        } catch (error) {
            console.error('Error creating pass:', error.response?.data || error);
            throw error;
        }
    }

    async updateLoyaltyPoints(userId, points) {
        try {
            console.log(`Actualizando puntos para usuario ${userId} a ${points} puntos`);
            const objectId = `${this.OBJECT_ID_PREFIX}${userId}`;
            const token = this.generateJwt();

            // Calcular nivel basado en puntos
            let level = "Entrenador Novato";
            if (points >= 1000) level = "Maestro Pokémon";
            else if (points >= 500) level = "Entrenador Elite";
            else if (points >= 100) level = "Entrenador Avanzado";

            // Actualizar objeto de lealtad
            const patchBody = {
                textModulesData: [
                    {
                        header: "Puntos Pokémon",
                        body: points.toString(),
                        id: "points"
                    },
                    {
                        header: "Nivel",
                        body: level,
                        id: "level"
                    }
                ]
            };

            const response = await axios.patch(
                `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${objectId}`,
                patchBody,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            console.log('Puntos actualizados exitosamente:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error updating loyalty points:', error.response?.data || error);
            throw error;
        }
    }
}

module.exports = new GoogleWalletService();
