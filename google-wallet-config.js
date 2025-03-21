require('dotenv').config();
const path = require('path');
const { GoogleAuth } = require('google-auth-library');

// Configuración de Google Wallet
const ISSUER_ID = '3388000000022884108';
const CLASS_ID = `${ISSUER_ID}.pokemon_loyalty_card`;

// Lista de orígenes permitidos
const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://192.168.100.2:3000'
];

// Configurar autenticación usando credenciales de servicio
const auth = new GoogleAuth({
    keyFilename: path.resolve(__dirname, 'google-wallet-key.json'),
    scopes: [
        'https://www.googleapis.com/auth/wallet_object.issuer',
        'https://www.googleapis.com/auth/wallet.objects.readonly'
    ]
});

const loyaltyClass = {
    id: CLASS_ID,
    issuerName: 'Mamitas Tepic',
    programName: 'Programa de Lealtad Pokémon',
    programLogo: {
        sourceUri: {
            uri: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png'
        }
    },
    reviewStatus: 'UNDER_REVIEW',
    hexBackgroundColor: '#FF5733',
    heroImage: {
        sourceUri: {
            uri: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png'
        }
    },
    locations: [
        {
            address: {
                addressLines: ['Av. México 108'],
                locality: 'Tepic',
                administrativeArea: 'Nayarit',
                countryCode: 'MX',
                postalCode: '63000'
            },
            latitude: 21.5039,
            longitude: -104.8946
        }
    ],
    linksModuleData: {
        uris: [
            {
                uri: 'https://r.loyverse.com/dashboard/',
                description: 'Ver mis puntos',
                id: 'points'
            }
        ]
    }
};

module.exports = {
    auth,
    ISSUER_ID,
    CLASS_ID,
    loyaltyClass,
    ALLOWED_ORIGINS
};
