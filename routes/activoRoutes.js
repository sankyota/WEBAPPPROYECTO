// actualizado para trabajar con la nueva estructura del SQL
const express = require('express');
const router = express.Router();
const db = require('../db');

// Crear un activo (POST)
router.post('/activos', (req, res) => {
    let activos = req.body;

    if (!Array.isArray(activos)) {
        activos = [activos];
    }

    if (activos.length === 0) {
        return res.status(400).json({ error: 'Se requiere al menos un activo' });
    }

    const query = `CALL InsertarActivo(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    let errores = 0;
    let insertados = 0;

    activos.forEach((activo, index) => {
        const values = [
            activo.ItemCode,
            activo.ItemName ? activo.ItemName.toUpperCase() : "NO ESPECIFICADO",
            activo.marca && activo.marca.trim() ? activo.marca.toUpperCase() : "NO ESPECIFICADA",
            activo.modelo && activo.modelo.trim() ? activo.modelo.toUpperCase() : "NO ESPECIFICADO",
            activo.fecha_compra || new Date().toISOString().split('T')[0],
            activo.Price || 0.00,
            activo.Currency || "USD",
            activo.BarCode || null,
            activo.QuantityOnStock || 0,
            activo.ItemsGroupCode || null,
            activo.FechaBaja || null,
            activo.MotivoBaja || null
        ];

        db.query(query, values, (err, result) => {
            if (err) {
                console.error(`❌ Error al registrar activo ${index + 1}:`, err);
                errores++;
            } else {
                insertados++;
            }

            // Cuando termina de procesar todos
            if (index === activos.length - 1) {
                if (errores > 0) {
                    return res.status(500).json({ 
                        message: `Activos procesados: ${activos.length}. Insertados: ${insertados}. Errores: ${errores}` 
                    });
                } else {
                    return res.status(201).json({ 
                        message: `✅ Todos los activos (${insertados}) registrados exitosamente.` 
                    });
                }
            }
        });
    });
});


// Ruta para buscar un activo por ItemCode (Número de serie)
router.get('/activos/numero-serie/:ItemCode', (req, res) => {
  const { ItemCode } = req.params;
  const query = 'CALL BuscarActivoPorItemCode(?)';

  db.query(query, [ItemCode], (err, results) => {
    if (err) {
      console.error('❌ Error al buscar el activo:', err);
      return res.status(500).json({ error: 'Error al buscar el activo' });
    }
    const activo = results[0];
    if (activo.length === 0) {
      return res.status(404).json({ error: 'Activo no encontrado' });
    }
    res.status(200).json(activo[0]);
  });
});


// Obtener todos los activos (GET) con empleado asignado actual
router.get('/activos', (req, res) => {
    const query = 'CALL ObtenerActivosConEmpleado()';
    db.query(query, (err, results) => {
        if (err) {
            console.error('❌ Error al obtener activos:', err);
            return res.status(500).json({ error: 'Error al obtener activos' });
        }
        res.status(200).json(results[0]);
    });
});


// Obtener un activo por ID (GET)
router.get('/activos/:id', (req, res) => {
  const { id } = req.params;
  const query = 'CALL BuscarActivoPorID(?)';

  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('❌ Error al obtener el activo:', err);
      return res.status(500).json({ error: 'Error al obtener el activo' });
    }
    const activo = results[0];
    if (activo.length === 0) {
      return res.status(404).json({ error: 'Activo no encontrado' });
    }
    res.status(200).json(activo[0]);
  });
});


// Nueva ruta para obtener el empleado asignado a un activo
router.get('/activos/:activo_id/empleado', (req, res) => {
    const { activo_id } = req.params;
    const query = 'CALL ObtenerEmpleadoDeActivo(?)';

    db.query(query, [activo_id], (err, results) => {
        if (err) {
            console.error('❌ Error al obtener el empleado asignado:', err);
            return res.status(500).json({ error: 'Error al obtener el empleado asignado' });
        }

        if (results[0].length === 0) {
            return res.status(404).json({ error: 'No hay empleado asignado a este activo' });
        }

        res.status(200).json(results[0][0]);
    });
});


// Actualizar un activo (PUT)
router.put('/activos/:id', (req, res) => {
  const { id } = req.params;
  const { ItemCode, ItemName, marca, modelo, fecha_compra, Price, Currency, BarCode, QuantityOnStock, ItemsGroupCode, FechaBaja, MotivoBaja } = req.body;

  const query = 'CALL ActualizarActivo(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

  db.query(query, [
    id,
    ItemCode,
    ItemName ? ItemName.toUpperCase() : "NO ESPECIFICADO",
    marca && marca.trim() ? marca.toUpperCase() : "NO ESPECIFICADA",
    modelo && modelo.trim() ? modelo.toUpperCase() : "NO ESPECIFICADO",
    fecha_compra,
    Price,
    Currency,
    BarCode,
    QuantityOnStock,
    ItemsGroupCode,
    FechaBaja,
    MotivoBaja
  ], (err, result) => {
    if (err) {
      console.error('❌ Error al actualizar el activo:', err);
      return res.status(500).json({ error: 'Error al actualizar el activo' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Activo no encontrado' });
    }
    res.status(200).json({ message: '✅ Activo actualizado exitosamente' });
  });
});


// Actualizar el estado de un activo (PUT)
router.put('/activos/:id/estado', (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['Disponible', 'Pérdida'].includes(estado)) {
        return res.status(400).json({ error: 'Estado inválido. Debe ser "Disponible" o "Pérdida".' });
    }

    const query = 'CALL ActualizarEstadoActivo(?, ?)';

    db.query(query, [id, estado], (err, result) => {
        if (err) {
            console.error('❌ Error al actualizar el estado del activo:', err);
            return res.status(500).json({ error: 'Error al actualizar el estado del activo' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Activo no encontrado' });
        }

        res.status(200).json({ message: '✅ Estado del activo actualizado exitosamente' });
    });
});


// Nuevo: Asignar activo a empleado y área
router.post('/activos/:id/asignar', (req, res) => {
    const { id } = req.params;
    const { empleado_id, fecha_asignacion } = req.body;

    if (!empleado_id || !fecha_asignacion) {
        return res.status(400).json({ error: 'empleado_id y fecha_asignacion son requeridos' });
    }

    const query = `CALL AsignarActivo(?, ?, ?)`;
    db.query(query, [id, empleado_id, fecha_asignacion], (err) => {
        if (err) {
            console.error('❌ Error al asignar activo:', err);
            return res.status(500).json({ error: 'Error al asignar activo' });
        }
        res.status(201).json({ message: '✅ Activo asignado exitosamente' });
    });
});



// Eliminar un activo (DELETE)
// router.delete('/activos/:id', (req, res) => {
//     const { id } = req.params;

//     const query = 'DELETE FROM activo WHERE id = ?';

//     db.query(query, [id], (err, result) => {
//         if (err) {
//             console.error('❌ Error al eliminar el activo:', err);
//             return res.status(500).json({ error: 'Error al eliminar el activo' });
//         }
//         if (result.affectedRows === 0) {
//             return res.status(404).json({ error: 'Activo no encontrado' });
//         }
//         res.status(200).json({ message: '✅ Activo eliminado exitosamente' });
//     });
// });

router.get('/activos/por-empleado/:empleado_id', (req, res) => {
  const { empleado_id } = req.params;

  const query = 'CALL ObtenerActivoPorEmpleado(?)';

  db.query(query, [empleado_id], (err, results) => {
    if (err) {
      console.error('❌ Error al buscar activo:', err);
      return res.status(500).json({ error: 'Error al buscar activo' });
    }

    const activoResults = results[0];

    if (activoResults.length === 0) {
      return res.json({ nombre_activo: "Desconocido" });
    }

    res.json(activoResults[0]);
  });
});


module.exports = router;
