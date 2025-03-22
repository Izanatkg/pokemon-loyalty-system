require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const googleWalletService = require('./google-wallet-service');
const loyverseService = require('./loyverse-service');

const app = express();
const port = process.env.PORT || 5000;

// Configurar CORS
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
}));

app.use(express.json());

// Configurar Loyverse API
const loyverseApi = axios.create({
    baseURL: 'https://api.loyverse.com/v1.0',
    headers: {
        'Authorization': `Bearer ${process.env.LOYVERSE_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

// Verificar conexión con Loyverse
async function checkLoyverseConnection() {
    try {
        const response = await loyverseApi.get('/stores');
        console.log('Successfully connected to Loyverse API');
        console.log('Store information:', JSON.stringify(response.data, null, 2));
        return true;
    } catch (error) {
        console.error('Error connecting to Loyverse:', error.response?.data || error.message);
        return false;
    }
}

// Verificar conexión al inicio
checkLoyverseConnection();

// Middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    if (req.method === 'POST') {
        console.log('Request body:', JSON.stringify(req.body, null, 2));
    }
    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error middleware:', err);
    res.status(500).json({
        success: false,
        message: err.message || 'Error interno del servidor'
    });
});

// Ruta de registro
app.post('/api/register', async (req, res) => {
    console.log('=== Iniciando registro de usuario ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const { fullName, email, phone, isQRRegistration } = req.body;

    try {
        // Validar campos requeridos
        if (!fullName || !email || !phone) {
            console.log('Error: Faltan campos requeridos');
            return res.status(400).json({
                success: false,
                message: 'Faltan campos requeridos'
            });
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log('Error: Formato de email inválido');
            return res.status(400).json({
                success: false,
                message: 'Formato de email inválido'
            });
        }

        // Validar formato de teléfono (10 dígitos)
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(phone)) {
            console.log('Error: El teléfono debe tener 10 dígitos');
            return res.status(400).json({
                success: false,
                message: 'El teléfono debe tener 10 dígitos'
            });
        }

        console.log('Validaciones completadas, registrando en Loyverse...');

        // Registrar cliente en Loyverse usando el servicio
        const loyverseCustomer = await loyverseService.createCustomer({
            name: fullName,
            email: email,
            phone_number: phone,
            note: isQRRegistration ? "Registro desde QR" : "Registro web"
        });

        console.log('Cliente creado en Loyverse:', JSON.stringify(loyverseCustomer, null, 2));

        // Crear pase de Google Wallet
        let walletUrl = null;
        try {
            console.log('Iniciando creación del pase de Google Wallet...');
            console.log('Datos del usuario para wallet:', {
                id: loyverseCustomer.id,
                name: fullName,
                email: email,
                phone: phone
            });
            
            walletUrl = await googleWalletService.createPass(
                loyverseCustomer.id,
                {
                    name: fullName,
                    email: email
                }
            );
            
            if (walletUrl) {
                console.log('✅ URL del wallet generada exitosamente:', walletUrl);
            } else {
                console.error('❌ No se pudo generar la URL del wallet');
            }
        } catch (walletError) {
            console.error('Error al crear el pase de Google Wallet:', {
                message: walletError.message,
                stack: walletError.stack,
                response: walletError.response?.data
            });
        }

        // Obtener puntos iniciales
        const pointsInfo = await loyverseService.getCustomerPoints(loyverseCustomer.id);
        
        console.log('Respuesta final al cliente:', {
            success: true,
            welcomeBonus: pointsInfo.welcomeBonus,
            walletUrl: walletUrl ? '✅ Presente' : '❌ No generada'
        });

        res.json({
            success: true,
            message: 'Usuario registrado exitosamente',
            welcomeBonus: pointsInfo.welcomeBonus,
            user: {
                fullName,
                email,
                phone,
                loyverseId: loyverseCustomer.id,
                customer_code: loyverseCustomer.customer_code,
                points: pointsInfo.points
            },
            walletUrl
        });
    } catch (error) {
        console.error('Error en el proceso de registro:', error);
        console.error('Detalles del error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Error en el registro',
            error: error.response?.data?.message || error.message
        });
    }
});

// Generate QR Code endpoint
app.get('/api/generate-qr', async (req, res) => {
    try {
        const registrationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?qr=true`;
        const qrCode = await QRCode.toDataURL(registrationUrl);
        res.json({ success: true, qrCode });
    } catch (error) {
        console.error('QR generation error:', error);
        res.status(500).json({
            success: false,
            message: "Error al generar código QR"
        });
    }
});

// Actualizar puntos en Google Wallet
app.post('/api/update-points', async (req, res) => {
    try {
        const { userId, points } = req.body;
        if (!userId || points === undefined) {
            return res.status(400).json({
                success: false,
                message: "Se requiere userId y points"
            });
        }

        await googleWalletService.updateLoyaltyPoints(userId, points);
        res.json({ 
            success: true, 
            message: 'Puntos actualizados correctamente' 
        });
    } catch (error) {
        console.error('Error updating points:', error);
        res.status(500).json({
            success: false,
            message: "Error al actualizar puntos"
        });
    }
});

// Endpoint para obtener puntos actuales
app.get('/api/points/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const response = await loyverseApi.get(`/customers/${customerId}`);
        
        res.json({
            success: true,
            points: response.data.loyalty_points || 0
        });
    } catch (error) {
        console.error('Error getting points:', error.response?.data || error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.listen(port, '0.0.0.0', async () => {
    try {
        console.log('Server running on port', port);
        const response = await loyverseApi.get('/stores');
        console.log('Successfully connected to Loyverse API');
        console.log('Store information:', response.data);
    } catch (error) {
        console.error('Error connecting to Loyverse:', error);
    }
});
