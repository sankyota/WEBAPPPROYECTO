const API_URL = "http://localhost:3000/api/empleados";
let empleados = [];


// Elimina empleados duplicados basados en su ID
function eliminarDuplicados(lista) {
  const mapa = new Map();
  lista.forEach(emp => {
    if (!mapa.has(emp.id)) {
      mapa.set(emp.id, emp);
    }
  });
  return Array.from(mapa.values());
}

// Cargar empleados desde el backend
async function cargarEmpleados() {
  try {
    const res = await fetch(API_URL);
    empleados = await res.json();
    mostrarEmpleados(empleados);
    

  } catch (err) {
    alert("❌ Error al cargar empleados.");
    console.error(err);
  }
}

// Mostrar empleados en la tabla (evita duplicados)
function mostrarEmpleados(lista) {
  const tbody = document.getElementById("tabla-empleados");
  tbody.innerHTML = "";

  const idsVistos = new Set();

  lista.forEach(emp => {
    if (idsVistos.has(emp.id)) return;
    idsVistos.add(emp.id);

    const tr = document.createElement("tr");
    const fecha = emp.fecha_ingreso ? emp.fecha_ingreso.split("T")[0] : "";

    tr.innerHTML = `
      <td>${emp.id}</td>
  <td>${emp.codigo || "N/A"}</td>
  <td>${emp.nombre}</td>
  <td>${emp.correo || ""}</td>
  <td>${fecha || ""}</td>
  <td>
    <button onclick="editar(this)">Modificar</button>
    <button onclick="guardar(this, event)">Guardar</button>
  </td>
`;

    tbody.appendChild(tr);
  });
}

// Editar campos de una fila
function editar(btn) {
  const fila = btn.closest("tr");
  const celdas = fila.children;

  // No tocar ID (0) ni Código (1)
  celdas[2].innerHTML = `<input type="text" value="${celdas[2].textContent}" />`; // Nombre
  celdas[3].innerHTML = `<input type="email" value="${celdas[3].textContent}" />`; // Correo
  celdas[4].innerHTML = `<input type="date" value="${celdas[4].textContent}" />`; // Fecha
}



// Guardar cambios realizados
async function guardar(btn, event) {
  if (event) event.preventDefault();

  const fila = btn.closest("tr");
  const celdas = fila.children;
  const id = celdas[0].textContent;

  // Intenta obtener los valores
  const inputNombre = celdas[2].querySelector("input");
  const inputCorreo = celdas[3].querySelector("input");
  const inputFecha = celdas[4].querySelector("input");

  if (!inputNombre || !inputCorreo || !inputFecha) {
    Swal.fire({
      icon: "error",
      text: "Error interno: no se encontraron los campos.",
    });
    return;
  }

  const nombre = inputNombre.value?.trim()?.toUpperCase();
  const correo = inputCorreo.value?.trim()?.toLowerCase();
  const fecha_ingreso = inputFecha.value;

  // Validación estricta
  if (!nombre || !correo || !fecha_ingreso) {
    Swal.fire({
      icon: "warning",
      text: "Todos los campos (nombre, correo, fecha) son obligatorios.",
    });
    return;
  }

  const datos = { nombre, correo, fecha_ingreso };

  console.log("🟡 Enviando al backend:", datos);

  try {
    const result = await Swal.fire({
      title: "¿Guardar cambios?",
      showDenyButton: true,
      confirmButtonText: "Guardar",
      denyButtonText: "Cancelar"
    });

    if (result.isDenied) return;

    const res = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...setAuthHeader()
      },
      body: JSON.stringify(datos),
    });

    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error || "Error desconocido del backend.");
    }

    await Swal.fire({
      icon: "success",
      text: "✅ Empleado actualizado correctamente.",
      showConfirmButton: false,
      timer: 1500
    });

    cargarEmpleados();
  } catch (err) {
    console.error("❌ Error final:", err.message);
    Swal.fire({
      icon: "error",
      text: `Error al guardar: ${err.message}`,
    });
  }
}



// Buscar empleados
document.getElementById("buscador").addEventListener("input", aplicarFiltros);
function aplicarFiltros() {
  const texto = document.getElementById("buscador").value.toLowerCase();


  const filtrados = empleados.filter(e => {
    const coincideTexto = Object.values(e).some(val =>
      val && val.toString().toLowerCase().includes(texto)
    );
  });

  mostrarEmpleados(filtrados);
}


// Exportar empleados en PDF sin duplicados
async function exportarEmpleadosPDF() {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Reporte de Empleados", 14, 20);

    const fechaReporte = new Date().toLocaleString();
    doc.setFontSize(10);
    doc.text(`Fecha del reporte: ${fechaReporte}`, 14, 28);

    const empleadosUnicos = eliminarDuplicados(empleados);

    const rows = empleadosUnicos.map(emp => [
  emp.codigo || "N/A",
  emp.nombre || "No especificado",
  emp.correo || "No disponible",
  emp.fecha_ingreso ? new Date(emp.fecha_ingreso).toLocaleDateString() : "No disponible"
]);

doc.autoTable({
  head: [["Código", "Nombre", "Correo","Fecha de Ingreso"]],
  body: rows,
  startY: 35
});


    doc.save("reporte_empleados.pdf");
  } catch (error) {
    console.error("❌ Error al generar el PDF:", error);
    alert("No se pudo generar el reporte.");
  }
}
// Exportar empleados en Excel sin duplicados
function exportarEmpleadosExcel() {
  try {
    const empleadosUnicos = eliminarDuplicados(empleados);
    const wb = XLSX.utils.book_new();

    const wsData = [
  ["Código", "Nombre", "Correo", "Área", "Fecha de Ingreso"],
  ...empleadosUnicos.map(emp => [
    emp.codigo || "N/A",
    emp.nombre || "No especificado",
    emp.correo || "No disponible",
    emp.fecha_ingreso ? new Date(emp.fecha_ingreso).toLocaleDateString() : "No disponible"
  ])
];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Empleados");
    XLSX.writeFile(wb, "reporte_empleados.xlsx");
  } catch (error) {
    console.error("❌ Error al generar Excel:", error);
    alert("No se pudo generar el archivo Excel.");
  }
}
function exportarEmpleadosExcel() {
  try {
    const empleadosUnicos = eliminarDuplicados(empleados);
    const texto = document.getElementById("buscador").value.toLowerCase();

    const filtrados = empleadosUnicos.filter(e => {
      return Object.values(e).some(val =>
        val && val.toString().toLowerCase().includes(texto)
      );
    });

    const wsData = [
      ["Código", "Nombre", "Correo", "Fecha de Ingreso"],
      ...filtrados.map(emp => [
        emp.codigo || "N/A",
        emp.nombre || "No especificado",
        emp.correo || "No disponible",
        emp.fecha_ingreso ? new Date(emp.fecha_ingreso).toLocaleDateString() : "No disponible"
      ])
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Empleados");
    XLSX.writeFile(wb, "reporte_empleados.xlsx");
  } catch (error) {
    console.error("❌ Error al generar Excel:", error);
    alert("No se pudo generar el archivo Excel.");
  }
}

window.exportarEmpleadosExcel = exportarEmpleadosExcel;

// Exponer función para botón
window.exportarEmpleadosPDF = exportarEmpleadosPDF;
window.exportarEmpleadosExcel = exportarEmpleadosExcel;
window.exportarTodo = exportarTodo;

async function exportarTodo() {
  await exportarEmpleadosPDF();
  await exportarEmpleadosExcel();
}

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  cargarEmpleados();

  const btn = document.getElementById("btn-exportar-todo");
  if (btn) {
    btn.addEventListener("click", exportarTodo);
  }
});

