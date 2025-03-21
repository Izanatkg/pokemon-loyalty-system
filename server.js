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
    origin: ['http://localhost:3000', 'http://192.168.100.2:3000'],
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
    console.log(new Date().toISOString(), '- POST /api/register');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const { fullName, email, phone, isQRRegistration } = req.body;

    try {
        // Validar campos requeridos
        if (!fullName || !email || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos requeridos'
            });
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Formato de email inválido'
            });
        }

        // Validar formato de teléfono (10 dígitos)
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'El teléfono debe tener 10 dígitos'
            });
        }

        // Registrar cliente en Loyverse
        const loyverseCustomerData = {
            name: fullName,
            email: email,
            phone_number: phone,
            note: isQRRegistration ? "Registro desde QR" : "Registro web",
            loyalty_program_enabled: true
        };

        console.log('Sending to Loyverse:', JSON.stringify(loyverseCustomerData, null, 2));
        const loyverseResponse = await loyverseApi.post('/customers', loyverseCustomerData);
        console.log('Loyverse response:', JSON.stringify(loyverseResponse.data, null, 2));

        if (!loyverseResponse.data || !loyverseResponse.data.id) {
            console.error('Invalid Loyverse response:', loyverseResponse.data);
            return res.status(400).json({
                success: false,
                message: 'Error al crear cliente en Loyverse'
            });
        }

        // Crear pase de Google Wallet
        const walletUrl = await googleWalletService.createPass(
            loyverseResponse.data.id,
            {
                name: fullName,
                email: email
            }
        );

        console.log('Registration process completed successfully');
        res.json({
            success: true,
            message: 'Usuario registrado exitosamente',
            welcomeBonus: "10% en tu primera compra",
            user: {
                fullName,
                email,
                phone,
                loyverseId: loyverseResponse.data.id,
                isQRRegistration
            },
            walletUrl
        });
    } catch (error) {
        console.error('Error in registration:', error.response?.data || error);
        res.status(500).json({
            success: false,
            message: error.response?.data?.message || error.message || 'Error en el registro'
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

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});
