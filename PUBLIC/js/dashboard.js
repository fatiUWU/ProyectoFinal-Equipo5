document.addEventListener('DOMContentLoaded', () => {
    
    // Ejecutar la carga automática de estadísticas del Dashboard
    renderizarDashboard();

    async function renderizarDashboard() {
        try {
            // Consulta asincrónica a nuestro controlador
            const res = await fetch('../CONTROLADOR/DashboardC.php');
            const datos = await res.json();

            if (datos.ok) {
                // 1. Inyectar valores numéricos reales en las tarjetas KPI
                document.getElementById('kpiPendientes').innerText = datos.kpis.pedidos_pendientes;
                document.getElementById('kpiEntregas').innerText   = datos.kpis.entregas_hoy;
                document.getElementById('kpiTotalStock').innerText = datos.kpis.productos_stock;
                document.getElementById('kpiAlertas').innerText    = datos.kpis.alertas_stock;

                // 2. Renderizar las filas de la tabla de Pedidos Recientes
                const tablaCuerpo = document.getElementById('tablaDashboardCuerpo');
                if (!tablaCuerpo) return;

                tablaCuerpo.innerHTML = '';

                if (datos.pedidos_recientes.length === 0) {
                    tablaCuerpo.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 25px; color: #64748b;">No se registran transacciones recientes.</td></tr>`;
                    return;
                }

                datos.pedidos_recientes.forEach(p => {
                    // Mapeo dinámico de colores de estado idéntico a pedidos.js
                    let colorEstado = '#f97316'; // Naranja (Pendiente / En Preparación)
                    if (p.estado === 'Enviado') colorEstado = '#3b82f6'; // Azul
                    if (p.estado === 'Entregado') colorEstado = '#10b981'; // Verde
                    if (p.estado === 'Cancelado') colorEstado = '#ef4444'; // Rojo

                    // Formatear la fecha corta en estilo DD/MM/YYYY
                    const fechaCorta = p.fecha_creacion.split(' ')[0].split('-').reverse().join('/');

                    tablaCuerpo.innerHTML += `
                        <tr style="border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155;">
                            <td style="padding: 15px; font-weight: bold;">PED-000${p.id_pedido}</td>
                            <td style="padding: 15px;">${p.nombre_cliente}</td>
                            <td style="padding: 15px;">${fechaCorta}</td>
                            <td style="padding: 15px;"><span style="color: ${colorEstado}; font-weight: bold;">${p.estado}</span></td>
                            <td style="padding: 15px; font-weight: 600;">$${parseFloat(p.total).toFixed(2)}</td>
                        </tr>
                    `;
                });
            } else {
                console.error("Error del servidor:", datos.msg);
            }
        } catch (err) {
            console.error("Error de conexión con el controlador Dashboard:", err);
        }
    }
});