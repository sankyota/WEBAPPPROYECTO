const express = require('express');
const router = express.Router();
const db = require('../db'); // Conexión a la base de datos

// Crear una nueva incidencia (POST)
router.post('/incidencias', (req, res) => {
  const { empleado_id, descripcion, usuario_id, activo_id } = req.body;

  if (!descripcion || !empleado_id || !activo_id) {
    return res.status(400).json({ error: 'Faltan datos obligatorios (empleado, descripción o activo)' });
  }

  const query = `CALL CrearIncidencia(?, ?, ?, ?)`;
  db.query(query, [empleado_id, descripcion, usuario_id, activo_id], (err, result) => {
    if (err) {
      console.error("❌ Error al insertar incidencia:", err);
      return res.status(500).json({ error: "Error al crear la incidencia" });
    }

    const incidencia_id = result[0][0].incidencia_id;
    res.status(201).json({ message: "✅ Incidencia creada exitosamente", id: incidencia_id });
  });
});



// Obtener incidencias con activo, empleado, descripción, fecha y estado
router.get('/incidencias', (req, res) => {
  const query = `CALL ObtenerIncidencias()`;

  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ Error al obtener incidencias:', err.sqlMessage || err);
      return res.status(500).json({ error: 'Error al obtener incidencias' });
    }

    // Como CALL devuelve un array de arrays, el resultado útil está en results[0]
    res.status(200).json(results[0]);
  });
});


router.get('/incidencias/historico', (req, res) => {
  const query = `
    SELECT 
      i.id AS id,
      i.descripcion,
      DATE(i.fecha_reporte) AS fecha_reporte,
      i.estado_equipo,
      m.itemcode AS itemcode_popup,
      m.itemname AS nombre_activo,
      m.nombre_empleado,
      m.nombre_area,
      m.fin_mantenimiento
    FROM mantenimiento m
    JOIN incidencia i ON i.id = m.incidencia_id
    ORDER BY i.fecha_reporte DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ Error al obtener incidencias históricas:', err);
      return res.status(500).json({ error: 'Error al obtener los datos' });
    }
    res.status(200).json(results);
  });
});



module.exports = router;