document.addEventListener('DOMContentLoaded', () => {
    const tablaFacturasCuerpo = document.getElementById('tablaFacturasCuerpo');
    const txtBuscarFactura = document.getElementById('txtBuscarFactura');
    const txtFechaFactura = document.getElementById('txtFechaFactura');
    const btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros');

    let listaFacturasGlobal = [];

    // Cargar facturas al iniciar
    cargarFacturas();

    // Eventos para filtrado en tiempo real
    if (txtBuscarFactura) txtBuscarFactura.addEventListener('input', filtrarFacturas);
    if (txtFechaFactura) txtFechaFactura.addEventListener('change', filtrarFacturas);
    
    // Botón para limpiar filtros
    if (btnLimpiarFiltros) {
        btnLimpiarFiltros.addEventListener('click', () => {
            txtBuscarFactura.value = '';
            txtFechaFactura.value = '';
            filtrarFacturas();
        });
    }

    async function cargarFacturas() {
        tablaFacturasCuerpo.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando datos de facturación...</td></tr>`;
        
        try {
            const res = await fetch('../CONTROLADOR/FacturacionC.php');
            const datos = await res.json();

            if (datos.ok) {
                listaFacturasGlobal = datos.facturas;
                filtrarFacturas(); // Renderizar tabla completa inicialmente
            } else {
                tablaFacturasCuerpo.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#ef4444; font-weight:bold;">${datos.msg}</td></tr>`;
            }
        } catch (err) {
            console.error("Error al cargar facturas:", err);
            tablaFacturasCuerpo.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#ef4444; font-weight:bold;">Error de conexión con el servidor.</td></tr>`;
        }
    }

    function filtrarFacturas() {
        const textoBusqueda = txtBuscarFactura.value.toLowerCase().trim();
        const fechaSeleccionada = txtFechaFactura.value; // Formato YYYY-MM-DD

        const facturasFiltradas = listaFacturasGlobal.filter(f => {
            // Preparar variables para búsqueda de texto
            const folioFactura = `eco-fac-000${f.id_pedido}`.toLowerCase();
            const cliente = f.nombre_cliente ? f.nombre_cliente.toLowerCase() : '';
            
            // Condición de Texto (Coincide folio o cliente)
            const cumpleTexto = textoBusqueda === '' || folioFactura.includes(textoBusqueda) || cliente.includes(textoBusqueda);

            // Condición de Fecha (Extraemos solo la parte YYYY-MM-DD de la BD ignorando la hora)
            const fechaFacturaBD = f.fecha_creacion.split(' ')[0];
            const cumpleFecha = fechaSeleccionada === '' || fechaFacturaBD === fechaSeleccionada;

            // Retorna verdadero solo si cumple AMBAS condiciones (si están aplicadas)
            return cumpleTexto && cumpleFecha;
        });

        renderizarTabla(facturasFiltradas);
    }

    function renderizarTabla(facturas) {
        if (!tablaFacturasCuerpo) return;
        tablaFacturasCuerpo.innerHTML = '';

        if (facturas.length === 0) {
            tablaFacturasCuerpo.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#64748b; font-weight:500;">No se encontraron facturas con los filtros actuales.</td></tr>`;
            return;
        }

        facturas.forEach(f => {
            // Formato de Fecha Invertida (DD/MM/YYYY) para mostrar en pantalla
            const fechaParts = f.fecha_creacion.split(' ')[0].split('-');
            const fechaBonita = `${fechaParts[2]}/${fechaParts[1]}/${fechaParts[0]}`;

            // Colores de estado (Meramente informativo)
            let colorEstado = '#3b82f6'; 
            if(f.estado === 'En Preparacion') colorEstado = '#f97316';
            if(f.estado === 'Entregado') colorEstado = '#10b981';

            tablaFacturasCuerpo.innerHTML += `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 15px; font-weight: bold; color: #1e293b; font-family: monospace; font-size: 14px;">ECO-FAC-000${f.id_pedido}</td>
                    <td style="padding: 15px; font-weight: 500; color: #334155;">${f.nombre_cliente}</td>
                    <td style="padding: 15px; color: #475569;"><i class="fa-regular fa-calendar" style="margin-right: 5px;"></i> ${fechaBonita}</td>
                    <td style="padding: 15px;"><span style="color: ${colorEstado}; font-weight: bold; font-size: 13px;">${f.estado}</span></td>
                    <td style="padding: 15px; text-align: right; font-weight: bold; color: #165b1c; font-size: 15px;">$${parseFloat(f.total).toFixed(2)}</td>
                    <td style="padding: 15px; text-align: center;">
                        <button onclick="window.open('../CONTROLADOR/FacturaPdfC.php?id_pedido=${f.id_pedido}', '_blank')" style="background: #ef4444; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: background 0.2s;" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">
                            <i class="fa-solid fa-download"></i> PDF
                        </button>
                    </td>
                </tr>
            `;
        });
    }
});