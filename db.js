require('dotenv').config();  // Cargar variables de entorno
const mysql = require('mysql');

const db = mysql.createConnection({
    host: 'localhost',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || '74066713Jp!',
    database: process.env.DB_NAME || 'gestionactivosti',
    port: process.env.DB_PORT || 3306
});

db.connect((err) => {
    if (err) {
        console.error('❌ Error al conectar a la base de datos:', err);
        process.exit(1);
    }
    console.log('✅ Conectado a la base de datos');
});

module.exports = db;
