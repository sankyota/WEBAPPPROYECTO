const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const dbConfig = {
    host: '127.0.0.1',
    user: 'root',       // Cambia esto por tu usuario de MySQL
    password: '', // Cambia esto por tu contraseña de MySQL
    database: 'gestionactivosti'
};

async function updatePasswords() {
    const connection = await mysql.createConnection(dbConfig);
    const [users] = await connection.execute('SELECT id, contrasena FROM usuario');
    
    for (const user of users) {
        const hashedPassword = await bcrypt.hash(user.contrasena, 10);
        await connection.execute('UPDATE usuario SET contrasena = ? WHERE id = ?', [hashedPassword, user.id]);
        console.log(`Contraseña actualizada para usuario ${user.id}`);
    }
    
    await connection.end();
    console.log('Proceso completado');
}

updatePasswords().catch(console.error);