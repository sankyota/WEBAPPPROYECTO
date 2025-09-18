require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const db = require('./db');
const app = express();
const PORT = process.env.PORT || 3000;
const activoRoutes = require('./routes/activoRoutes');
const incidenciaRoutes = require('./routes/incidenciaRoutes');
const empleadoRoutes = require('./routes/empleadoRoutes');
const areaRoutes = require('./routes/areaRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const mantenimientoRoutes = require('./routes/mantenimientoRoutes');
const asignacionesRoutes = require('./routes/asignacionesRoutes');
const loginRoutes = require('./routes/loginRoutes'); 
const cors = require('cors');
const jwt = require('jsonwebtoken');



const SECRET_KEY = process.env.JWT_SECRET || 'continental_2025';

app.use(express.static('public'));
app.use(express.json());
app.use(cors());
app.use(cookieParser());

// Middleware para verificar JWT
const authenticateToken = (req, res, next) => {
    let token = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
        token = authHeader.split(' ')[1]; // Bearer <token>
    } else if (req.cookies.authToken) {
        token = req.cookies.authToken; // Leer desde cookie
    }

    if (!token) {
        console.log("No se encontró token, respondiendo con 401");
        return res.status(401).json({ error: 'No autorizado' });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            console.log("Token inválido o expirado:", err);
            return res.status(403).json({ error: 'Token inválido o expirado' });
        }
        req.user = user;
        //res.clearCookie('authToken'); // Limpiar cookie tras validar
        next();
    });
};

const requireAdmin = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ error: 'Acceso denegado: Requiere permisos de administrador' });
    }
    next();
};

// Rutas API
app.use('/api', loginRoutes); // ✅ Login primero, sin autenticación

app.use('/api', authenticateToken, [
    activoRoutes,
    incidenciaRoutes,
    empleadoRoutes,
    areaRoutes,
    usuarioRoutes,
    mantenimientoRoutes,
    asignacionesRoutes
]);

// Ruta para obtener datos del usuario actual
app.get('/api/user', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// Rutas de páginas
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/login.html'); // Página de login por defecto
});

app.get('/index.html', authenticateToken, (req, res) => {
    res.sendFile(__dirname + '/public/index.html'); // Dashboard protegido
});

app.get('/ver-activos', authenticateToken, (req, res) => {
    res.sendFile(__dirname + '/public/ver-activos.html');
});

app.get('/consultar-empleados', authenticateToken, (req, res) => {
  res.sendFile(__dirname + '/public/consultar-empleados.html');
});

app.get('/registrar-activo', authenticateToken, (req, res) => {
    res.sendFile(__dirname + '/public/registrar-activo.html');
});

app.get('/registrar-incidencia', authenticateToken, (req, res) => {
    res.sendFile(__dirname + '/public/registrar-incidencia.html');
});

app.get('/incidencias.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'consultar-incidencias.html'));
});

app.get('/registrar-empleado', authenticateToken, requireAdmin, (req, res) => {
    res.sendFile(__dirname + '/public/registrar-empleado.html');
});

app.get('/registrar-usuario', authenticateToken, requireAdmin, (req, res) => {
    res.sendFile(__dirname + '/public/registrar-usuario.html');
});


// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});