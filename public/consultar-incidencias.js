const API_URL_INCIDENCIAS = "http://localhost:3000/api/incidencias/historico";
const API_URL_MANTENIMIENTO = "http://localhost:3000/api/mantenimientos";
const API_URL_ACTIVOS = "http://localhost:3000/api/activos/numero-serie";

const tbody = document.querySelector(".data-table tbody");
const searchInput = document.getElementById("search");
const searchButton = document.getElementById("search-button");
const areaFilter = document.getElementById("filtro-area");
let areaFilterInicializado = false;

const getIncidencias = async () => {
  try {
    const response = await fetch(API_URL_INCIDENCIAS, {
      headers: setAuthHeader()
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) logout();
      throw new Error("❌ No se pudieron obtener las incidencias.");
    }

    const incidencias = await response.json();
    return incidencias.map(incidencia => ({
      id: incidencia.id,
      itemcode_popup: incidencia.itemcode_popup || null,
      nombre_activo: incidencia.nombre_activo || "Desconocido",
      nombre_area: incidencia.nombre_area || "Sin área",
      nombre_empleado: incidencia.nombre_empleado || "No asignado",
      descripcion: incidencia.descripcion || "Sin descripción",
      fecha_reporte: incidencia.fecha_reporte
        ? incidencia.fecha_reporte.split("T")[0]
        : "No disponible",
      estado_equipo: incidencia.estado_equipo || "verde",
      fin_mantenimiento: incidencia.fin_mantenimiento || null
    }));
  } catch (error) {
    console.error("❌ Error al obtener incidencias:", error);
    return [];
  }
};

const iniciarMantenimiento = async (incidenciaId) => {
  const fechaActual = new Date().toISOString().split("T")[0];
  try {
    const response = await fetch(`${API_URL_MANTENIMIENTO}/iniciar`, {
      method: "POST",
      headers: setAuthHeader({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        incidencia_id: incidenciaId,
        init_mantenimiento: fechaActual
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Error al iniciar mantenimiento");

    alert("✅ Mantenimiento iniciado");
    loadIncidencias();
  } catch (error) {
    console.error("❌ Error al iniciar mantenimiento:", error);
  }
};

const finalizarMantenimiento = async (incidenciaId) => {
  const fechaActual = new Date().toISOString().split("T")[0];
  try {
    const response = await fetch(`${API_URL_MANTENIMIENTO}/finalizar`, {
      method: "POST",
      headers: setAuthHeader({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        incidencia_id: incidenciaId,
        fin_mantenimiento: fechaActual
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Error al finalizar mantenimiento");

    alert("✅ Mantenimiento finalizado");
    loadIncidencias();
  } catch (error) {
    console.error("❌ Error al finalizar mantenimiento:", error);
  }
};

const mostrarPopupActivo = async (itemCode) => {
  try {
    const response = await fetch(`${API_URL_ACTIVOS}/${itemCode}`, {
      headers: setAuthHeader()
    });
    if (!response.ok) throw new Error("Activo no encontrado");

    const data = await response.json();

    const infoActivo = `
📌 Código del Producto: ${data.ItemCode || "No disponible"}
🏷️ Nombre: ${data.ItemName || "No disponible"}
🏢 Marca: ${data.marca || "No especificada"}
🏷️ Modelo: ${data.modelo || "No especificado"}
📅 Fecha de Compra: ${data.fecha_compra ? data.fecha_compra.split("T")[0] : "No disponible"}
💰 Precio: ${data.Price ? `$${data.Price.toFixed(2)}` : "No disponible"}
💲 Moneda: ${data.Currency || "USD"}
🆔 ID del Activo: ${data.id || "No disponible"}
    `.trim();

    Swal.fire({
      title: '📦 Detalle del Activo',
      icon: 'info',
      html: `<pre style="text-align:left; white-space: pre-wrap;">${infoActivo}</pre>`,
      confirmButtonText: 'Cerrar'
    });
  } catch (error) {
    console.error("❌ Error al mostrar info del activo:", error);
    Swal.fire("Error", error.message || "No se pudo obtener la información del activo", "error");
  }
};

const loadIncidencias = async (filter = "") => {
  tbody.innerHTML = "<tr><td colspan='8'>Cargando incidencias...</td></tr>";

  const incidencias = await getIncidencias();
  const filterTerm = filter.toLowerCase();
  const selectedArea = areaFilter ? areaFilter.value.toLowerCase() : "";
  const estadoFilter = document.getElementById("filtro-estado");

  if (estadoFilter) {
    estadoFilter.addEventListener("change", () => loadIncidencias(searchInput.value.trim()));
  }

  const selectedEstado = estadoFilter ? estadoFilter.value.toLowerCase() : "";

  const incidenciasFiltradas = incidencias.filter(i =>
    (
      i.nombre_activo.toLowerCase().includes(filterTerm) ||
      i.nombre_empleado.toLowerCase().includes(filterTerm) ||
      i.nombre_area.toLowerCase().includes(filterTerm)
    ) &&
    (!selectedArea || i.nombre_area.toLowerCase() === selectedArea) &&
    (!selectedEstado || i.estado_equipo.toLowerCase() === selectedEstado)
  );

  if (areaFilter && !areaFilterInicializado) {
    const areasUnicas = [...new Set(incidencias.map(i => i.nombre_area).filter(Boolean))];
    areaFilter.innerHTML = `<option value="">Todas las áreas</option>`;
    areasUnicas.forEach(area => {
      const option = document.createElement("option");
      option.value = area;
      option.textContent = area;
      areaFilter.appendChild(option);
    });
    areaFilterInicializado = true;
  }

  tbody.innerHTML = "";
  if (!incidenciasFiltradas.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center;">No hay incidencias registradas.</td></tr>`;
    return;
  }

  incidenciasFiltradas.forEach(incidencia => {
    const row = document.createElement("tr");
    row.innerHTML = `
  <td>
    <a href="#" class="activo-link" data-itemcode="${incidencia.itemcode_popup}" style="color:#007bff; font-weight:bold; text-decoration:underline;">
      ${incidencia.nombre_activo}
    </a>
  </td>
  <td>${incidencia.nombre_area}</td>
  <td>${incidencia.nombre_empleado}</td>
  <td>${incidencia.descripcion}</td>
  <td>${incidencia.fecha_reporte}</td>
  <td>${incidencia.fin_mantenimiento ? incidencia.fin_mantenimiento.split("T")[0] : "<em style='color:orange;'>Por solucionar</em>"}</td>
  <td><span class="estado-equipo ${incidencia.estado_equipo}">${incidencia.estado_equipo}</span></td>
`;

    const accionesCell = document.createElement("td");
    const iniciarBtn = document.createElement("button");
    iniciarBtn.textContent = "Iniciar";
    iniciarBtn.classList.add("btn-iniciar");

    const finalizarBtn = document.createElement("button");
    finalizarBtn.textContent = "⚙️";
    finalizarBtn.classList.add("btn-finalizar");
    finalizarBtn.style.display = "none";

    const finalizadoSpan = document.createElement("span");
    finalizadoSpan.textContent = "✅ Solucionado";
    finalizadoSpan.style.display = incidencia.fin_mantenimiento ? "inline-block" : "none";
    finalizadoSpan.style.fontWeight = "bold";
    finalizadoSpan.style.color = "green";

    switch (incidencia.estado_equipo) {
      case "verde":
        iniciarBtn.style.display = "none";
        finalizarBtn.style.display = "none";
        finalizadoSpan.style.display = "inline-block";
        break;
      case "amarillo":
        iniciarBtn.style.display = "none";
        finalizarBtn.style.display = "inline-block";
        break;
      default:
        iniciarBtn.style.display = "inline-block";
        break;
    }

    iniciarBtn.addEventListener("click", () => iniciarMantenimiento(incidencia.id));
    finalizarBtn.addEventListener("click", () => finalizarMantenimiento(incidencia.id));

    accionesCell.appendChild(iniciarBtn);
    accionesCell.appendChild(finalizarBtn);
    accionesCell.appendChild(finalizadoSpan);
    row.appendChild(accionesCell);

    tbody.appendChild(row);

    const link = row.querySelector(".activo-link");
    if (link) {
      link.addEventListener("click", async (e) => {
        e.preventDefault();
        const itemCode = link.dataset.itemcode;
        if (!itemCode || itemCode === "null" || itemCode === "undefined") {
          Swal.fire("Sin información", "Este activo no tiene detalles disponibles.", "info");
          return;
        }
        await mostrarPopupActivo(itemCode);
      });
    }
  });
};

async function exportarPDFIncidencias() {
  const incidencias = await getIncidencias();
  const filter = searchInput.value.trim().toLowerCase();
  const selectedArea = areaFilter.value.toLowerCase();
  const selectedEstado = document.getElementById("filtro-estado").value.toLowerCase();

  const filtradas = incidencias.filter(i =>
    (
      i.nombre_activo.toLowerCase().includes(filter) ||
      i.nombre_empleado.toLowerCase().includes(filter) ||
      i.nombre_area.toLowerCase().includes(filter)
    ) &&
    (!selectedArea || i.nombre_area.toLowerCase() === selectedArea) &&
    (!selectedEstado || i.estado_equipo.toLowerCase() === selectedEstado)
  );

  const fechaReporte = new Date().toLocaleString();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Reporte de Incidencias", 14, 20);
  doc.setFontSize(10);
  doc.text(`Fecha del reporte: ${fechaReporte}`, 14, 28);

  const rows = filtradas.map(i => [
    i.nombre_activo,
    i.nombre_area,
    i.nombre_empleado,
    i.descripcion,
    i.fecha_reporte,
    i.fin_mantenimiento || "Por solucionar",
    i.estado_equipo
  ]);

  doc.autoTable({
    head: [["Activo", "Área", "Empleado", "Descripción", "Fecha", "Finalización", "Estado"]],
    body: rows,
    startY: 35
  });

  doc.save("reporte_incidencias.pdf");
}

async function exportarExcelIncidencias() {
  const incidencias = await getIncidencias();
  const filter = searchInput.value.trim().toLowerCase();
  const selectedArea = areaFilter.value.toLowerCase();
  const selectedEstado = document.getElementById("filtro-estado").value.toLowerCase();

  const filtradas = incidencias.filter(i =>
    (
      i.nombre_activo.toLowerCase().includes(filter) ||
      i.nombre_empleado.toLowerCase().includes(filter) ||
      i.nombre_area.toLowerCase().includes(filter)
    ) &&
    (!selectedArea || i.nombre_area.toLowerCase() === selectedArea) &&
    (!selectedEstado || i.estado_equipo.toLowerCase() === selectedEstado)
  );

  const wsData = [
    ["Activo", "Área", "Empleado", "Descripción", "Fecha", "Finalización", "Estado"],
    ...filtradas.map(i => [
      i.nombre_activo,
      i.nombre_area,
      i.nombre_empleado,
      i.descripcion,
      i.fecha_reporte,
      i.fin_mantenimiento || "Por solucionar",
      i.estado_equipo
    ])
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, "Incidencias");
  XLSX.writeFile(wb, "reporte_incidencias.xlsx");
}

async function exportarTodo() {
  await exportarPDFIncidencias();
  await exportarExcelIncidencias();
}

window.exportarExcelIncidencias = exportarExcelIncidencias;

document.addEventListener("DOMContentLoaded", () => {
  loadIncidencias();

  searchButton.addEventListener("click", () => loadIncidencias(searchInput.value.trim()));
  searchInput.addEventListener("input", () => loadIncidencias(searchInput.value.trim()));

  if (areaFilter) {
    areaFilter.addEventListener("change", () => loadIncidencias(searchInput.value.trim()));
  }

  const btnExportar = document.getElementById("btn-exportar-todo");
  if (btnExportar) {
    btnExportar.addEventListener("click", exportarTodo);
  }
});
