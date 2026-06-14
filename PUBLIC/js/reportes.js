document.addEventListener('DOMContentLoaded', () => {
    const btnExportarPdf = document.getElementById('btnExportarPdf');
    const tablaTopCuerpo = document.getElementById('tablaTopProductosCuerpo');
    
    // NUEVO: Variables del formulario de rangos
    const formReporte = document.getElementById('formReporte');

    // Inicializar la carga interactiva de datos de la BD
    renderizarPantallaReportes();

    // --- ACCIÓN 1: CARGAR MÉTRICAS Y TABLA DINÁMICA ---
    async function renderizarPantallaReportes() {
        try {
            const res = await fetch('../CONTROLADOR/ReportesC.php');
            const datos = await res.json();

            if (datos.ok) {
                // 1. Inyectar datos numéricos en las tarjetas de estadísticas superiores
                document.getElementById('lblVentasTotales').innerText     = parseFloat(datos.metricas.ventas_totales).toLocaleString('es-MX', { minimumFractionDigits: 2 });
                document.getElementById('lblPedidosRealizados').innerText = datos.metricas.pedidos_realizados;
                document.getElementById('lblClientesTotales').innerText   = datos.metricas.clientes_totales;

                // 2. Renderizar filas en la tabla del Top de Productos
                if (!tablaTopCuerpo) return;
                tablaTopCuerpo.innerHTML = '';

                if (datos.top_productos.length === 0) {
                    tablaTopCuerpo.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 25px; color: #64748b;">Aún no se registran transacciones de venta ni detalles de pedidos.</td></tr>`;
                    return;
                }

                datos.top_productos.forEach(p => {
                    tablaTopCuerpo.innerHTML += `
                        <tr style="border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155;">
                            <td style="padding: 15px; font-weight: bold; color: #165b1c;">PROD-${p.id_producto}</td>
                            <td style="padding: 15px; font-weight: 500;">${p.nombre}</td>
                            <td style="padding: 15px;">${p.tipo_producto}</td>
                            <td style="padding: 15px; text-align: center; font-weight: 600;">$${parseFloat(p.precio).toFixed(2)}</td>
                            <td style="padding: 15px; text-align: center;"><span style="background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 13px;">${p.total_vendido} ${p.unidad_medida}</span></td>
                        </tr>
                    `;
                });
            } else {
                console.error("Error devuelto por el servidor:", datos.msg);
            }
        } catch (err) {
            console.error("Error al conectar con CONTROLADOR/ReportesC.php:", err);
        }
    }

    // --- ACCIÓN 2: DISPARAR GENERACIÓN Y DESCARGA DEL PDF GENERAL ---
    if (btnExportarPdf) {
        btnExportarPdf.addEventListener('click', () => {
            // Abre de manera directa la pestaña que procesa el PDF vía FPDF
            window.open('../CONTROLADOR/ReportePdfC.php', '_blank');
        });
    }

    // --- ACCIÓN 3: GENERAR REPORTE PDF POR RANGO DE FECHAS Y MESES ---
    if (formReporte) {
        formReporte.addEventListener('submit', (e) => {
            e.preventDefault(); // Evitamos que la página se recargue

            const fechaInicio = document.getElementById('rep_inicio').value;
            const fechaFin = document.getElementById('rep_fin').value;

            // Validación lógica
            if (fechaInicio > fechaFin) {
                alert('⚠️ La fecha de inicio no puede ser mayor a la fecha de fin. Verifica el orden.');
                return;
            }

            // Abrimos el generador de PDF enviándole las fechas por URL a nuestro nuevo archivo PHP
            const urlPdf = `../CONTROLADOR/ReporteMensualPdfC.php?inicio=${fechaInicio}&fin=${fechaFin}`;
            window.open(urlPdf, '_blank');
        });
    }
});