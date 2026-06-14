document.addEventListener('DOMContentLoaded', () => {
    const tablaPedidosCuerpo = document.getElementById('tablaPedidosCuerpo');
    const inputBuscarPedido = document.getElementById('inputBuscarPedido');
    const selectFiltroEstadoRapido = document.getElementById('selectFiltroEstadoRapido');
    const tabsEstados = document.querySelectorAll('.tab-link');

    const modalGestionPedido = document.getElementById('modalGestionPedido');
    const formCambiarEstado = document.getElementById('formCambiarEstado');
    const btnCerrarModalPed = document.getElementById('btnCerrarModalPed');
    
    const modalNuevoEstado = document.getElementById('modalNuevoEstado');
    const seccionDevolucion = document.getElementById('seccionDevolucion');

    // Elementos del Modal de Rastreo
    const modalRastreo = document.getElementById('modalRastreo');
    const btnCerrarRastreo = document.getElementById('btnCerrarRastreo');
    const contenedorTimeline = document.getElementById('contenedorTimeline');

    let listaPedidosGlobal = [];
    let estadoActualFiltro = 'Todos';

    cargarPedidosAdmin();

    // Cerrar Modal Rastreo
    if (btnCerrarRastreo) {
        btnCerrarRastreo.addEventListener('click', () => modalRastreo.style.display = 'none');
    }

    // Mostrar/Ocultar sección de reembolso si es Cancelado o Devuelto
    if (modalNuevoEstado) {
        modalNuevoEstado.addEventListener('change', (e) => {
            if (e.target.value === 'Cancelado' || e.target.value === 'Devuelto') {
                seccionDevolucion.style.display = 'flex';
            } else {
                seccionDevolucion.style.display = 'none';
            }
        });
    }

    if (btnCerrarModalPed) {
        btnCerrarModalPed.addEventListener('click', () => {
            modalGestionPedido.style.display = 'none';
            seccionDevolucion.style.display = 'none';
        });
    }

    async function cargarPedidosAdmin() {
        try {
            const res = await fetch('../CONTROLADOR/PedidoC.php');
            const datos = await res.json();
            if (datos.ok) {
                listaPedidosGlobal = datos.pedidos;
                filtrarYRenderizarAdmin();
            }
        } catch (err) { console.error(err); }
    }

    // Buscador y Filtros
    if (inputBuscarPedido) inputBuscarPedido.addEventListener('input', filtrarYRenderizarAdmin);
    if (selectFiltroEstadoRapido) {
        selectFiltroEstadoRapido.addEventListener('change', (e) => {
            estadoActualFiltro = e.target.value;
            actualizarTabsVisuales();
            filtrarYRenderizarAdmin();
        });
    }

    tabsEstados.forEach(tab => {
        tab.addEventListener('click', (e) => {
            estadoActualFiltro = e.target.getAttribute('data-filter');
            if (selectFiltroEstadoRapido) selectFiltroEstadoRapido.value = estadoActualFiltro;
            actualizarTabsVisuales();
            filtrarYRenderizarAdmin();
        });
    });

    function actualizarTabsVisuales() {
        tabsEstados.forEach(t => t.classList.remove('active'));
        const tabActiva = document.querySelector(`.tab-link[data-filter="${estadoActualFiltro}"]`);
        if (tabActiva) tabActiva.classList.add('active');
    }

    function filtrarYRenderizarAdmin() {
        const texto = inputBuscarPedido ? inputBuscarPedido.value.toLowerCase().trim() : '';
        
        const filtrados = listaPedidosGlobal.filter(p => {
            const folio = `ped-000${p.id_pedido}`.toLowerCase();
            const cliente = (p.nombre_cliente || '').toLowerCase();
            const coincideTexto = folio.includes(texto) || cliente.includes(texto);
            const coincideEstado = (estadoActualFiltro === 'Todos') || (p.estado === estadoActualFiltro);
            
            return coincideTexto && coincideEstado;
        });

        renderizarTablaAdmin(filtrados);
    }

    function renderizarTablaAdmin(pedidos) {
        if (!tablaPedidosCuerpo) return;
        tablaPedidosCuerpo.innerHTML = '';

        if (pedidos.length === 0) {
            tablaPedidosCuerpo.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">No se encontraron pedidos.</td></tr>`;
            return;
        }

        pedidos.forEach(p => {
            let colorEstado = '#f97316'; 
            if (p.estado === 'Enviado') colorEstado = '#3b82f6';
            if (p.estado === 'Entregado') colorEstado = '#10b981';
            if (p.estado === 'Cancelado') colorEstado = '#ef4444';
            if (p.estado === 'Devuelto') colorEstado = '#d97706';

            // Etiqueta de Reembolso
            let badgeReembolso = `<span style="color:#94a3b8; font-size:12px;">N/A</span>`;
            if (p.estado_reembolso === 'Pendiente') badgeReembolso = `<span style="background:#fef3c7; color:#d97706; padding:3px 6px; border-radius:4px; font-size:11px; font-weight:bold;">⏳ Pendiente</span>`;
            if (p.estado_reembolso === 'Procesado') badgeReembolso = `<span style="background:#dcfce3; color:#16a34a; padding:3px 6px; border-radius:4px; font-size:11px; font-weight:bold;">✅ Procesado</span>`;

            let fechaCorta = p.fecha_creacion.split(' ')[0].split('-').reverse().join('/');

            // Construimos la fila INCLUYENDO los botones originales
            tablaPedidosCuerpo.innerHTML += `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 12px; font-weight:bold;">PED-000${p.id_pedido}</td>
                    <td style="padding: 12px;">${p.nombre_cliente}</td>
                    <td style="padding: 12px; color:#64748b;">${fechaCorta}</td>
                    <td style="padding: 12px;"><span style="color:${colorEstado}; font-weight:bold;">${p.estado}</span></td>
                    <td style="padding: 12px;">${badgeReembolso}</td>
                    <td style="padding: 12px; font-weight:bold; color:#1e4620;">$${parseFloat(p.total).toFixed(2)}</td>
                    <td style="padding: 12px; text-align:center; display: flex; justify-content: center; gap: 8px;">
                        <button onclick="abrirGestionPedido(${p.id_pedido}, '${p.estado}')" style="background:#f1f5f9; border:1px solid #cbd5e1; padding:6px 10px; border-radius:6px; cursor:pointer; color:#334155; font-weight:bold;" title="Gestionar Orden">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button onclick="abrirRastreoAdmin(${p.id_pedido})" style="background:#f0fdf4; border:1px solid #bbf7d0; padding:6px 10px; border-radius:6px; cursor:pointer; color:#165b1c; font-weight:bold;" title="Ver Historial de Estatus">
                            <i class="fa-solid fa-clock-rotate-left"></i>
                        </button>
                        <button onclick="window.open('../CONTROLADOR/FacturaPdfC.php?id_pedido=${p.id_pedido}', '_blank')" style="background:#fff1f2; border:1px solid #fecaca; padding:6px 10px; border-radius:6px; cursor:pointer; color:#ef4444;" title="Descargar Factura">
                            <i class="fa-solid fa-file-pdf"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    // ==============================================================
    // LÓGICA DE RASTREO (TIMELINE)
    // ==============================================================
    window.abrirRastreoAdmin = async function(id_pedido) {
        document.getElementById('lblRastreoFolio').innerText = `Pedido Folio: PED-000${id_pedido}`;
        contenedorTimeline.innerHTML = '<div style="color:#64748b; text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando historial logístico...</div>';
        modalRastreo.style.display = 'flex';

        try {
            const res = await fetch(`../CONTROLADOR/PedidoC.php?accion=ver_historial&id_pedido=${id_pedido}`);
            const datos = await res.json();

            if (datos.ok) {
                contenedorTimeline.innerHTML = '';

                if (datos.historial.length === 0) {
                    contenedorTimeline.innerHTML = '<div style="color:#94a3b8; font-size:13px; font-style:italic; padding:10px;">Aún no hay movimientos registrados.</div>';
                    return;
                }

                datos.historial.forEach((mov, index) => {
                    const esPrimero = index === 0;
                    const puntoColor = esPrimero ? '#3b82f6' : '#cbd5e1';
                    const brilloPunto = esPrimero ? '0 0 0 4px #dbeafe' : 'none';
                    const textoEstilo = esPrimero ? '800' : '600';
                    const colorLetra = esPrimero ? '#1e293b' : '#64748b';

                    contenedorTimeline.innerHTML += `
                        <div style="position: relative; margin-bottom: 25px;">
                            <div style="position: absolute; left: -26px; top: 4px; width: 10px; height: 10px; background: ${puntoColor}; border-radius: 50%; box-shadow: ${brilloPunto}; transition: all 0.3s;"></div>
                            <div style="font-weight: ${textoEstilo}; color: ${colorLetra}; font-size: 15px;">
                                ${mov.estado_nuevo}
                            </div>
                            <div style="font-size: 12px; color: #475569; margin-top: 2px;">
                                <i class="fa-regular fa-calendar-check"></i> ${mov.fecha_formato}
                            </div>
                            ${mov.estado_anterior ? `<div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Vino desde: ${mov.estado_anterior}</div>` : ''}
                        </div>
                    `;
                });
            } else {
                contenedorTimeline.innerHTML = `<div style="color:red; font-size:13px;">${datos.msg}</div>`;
            }
        } catch (err) {
            console.error(err);
            contenedorTimeline.innerHTML = '<div style="color:red; font-size:13px;">Error de conexión.</div>';
        }
    };

    // ==============================================================
    // LÓGICA DE GESTIÓN DE ORDEN
    // ==============================================================
    window.abrirGestionPedido = function(id_pedido, estadoActual) {
        document.getElementById('modalIdPedido').value = id_pedido;
        document.getElementById('lblModalPedidoFolio').innerText = `PED-000${id_pedido}`;
        document.getElementById('modalNuevoEstado').value = estadoActual;
        
        if (estadoActual === 'Cancelado' || estadoActual === 'Devuelto') {
            seccionDevolucion.style.display = 'flex';
        } else {
            seccionDevolucion.style.display = 'none';
        }

        modalGestionPedido.style.display = 'flex';
    };

    if (formCambiarEstado) {
        formCambiarEstado.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const id_pedido = document.getElementById('modalIdPedido').value;
            const nuevo_estado = document.getElementById('modalNuevoEstado').value;
            const motivo = document.getElementById('modalMotivo').value;
            const reembolso = document.getElementById('modalReembolso').value;

            try {
                const res = await fetch('../CONTROLADOR/PedidoC.php?accion=cambiar_estado', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        id_pedido: id_pedido, 
                        nuevo_estado: nuevo_estado,
                        motivo: (nuevo_estado === 'Cancelado' || nuevo_estado === 'Devuelto') ? motivo : null,
                        reembolso: (nuevo_estado === 'Cancelado' || nuevo_estado === 'Devuelto') ? reembolso : 'No Aplica'
                    })
                });

                const datos = await res.json();
                if (datos.ok) {
                    alert(datos.msg);
                    modalGestionPedido.style.display = 'none';
                    cargarPedidosAdmin(); 
                } else {
                    alert(datos.msg);
                }
            } catch (err) {
                console.error(err);
                alert("Error de red al actualizar estado.");
            }
        });
    }
});