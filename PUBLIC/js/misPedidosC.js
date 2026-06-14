document.addEventListener('DOMContentLoaded', () => {
    const tablaMisPedidosCuerpo = document.getElementById('tablaMisPedidosCuerpo');
    const inputBuscarMiPedido = document.getElementById('inputBuscarMiPedido');
    const selectFiltroMiEstado = document.getElementById('selectFiltroMiEstado');

    // Elementos del Modal de Rastreo
    const modalRastreoCliente = document.getElementById('modalRastreoCliente');
    const btnCerrarRastreoCliente = document.getElementById('btnCerrarRastreoCliente');
    const contenedorTimelineCliente = document.getElementById('contenedorTimelineCliente');

    // Elementos del Modal de Calificación
    const modalCalificacion = document.getElementById('modalCalificacion');
    const btnCancelarCalificacion = document.getElementById('btnCancelarCalificacion');
    const formCalificacion = document.getElementById('formCalificacion');

    let listaMisPedidosGlobal = [];

    cargarMisPedidos();

    if (btnCerrarRastreoCliente) {
        btnCerrarRastreoCliente.addEventListener('click', () => modalRastreoCliente.style.display = 'none');
    }
    if (btnCancelarCalificacion) {
        btnCancelarCalificacion.addEventListener('click', () => {
            modalCalificacion.style.display = 'none';
            formCalificacion.reset();
        });
    }

    // --- FETCH: TRAER PEDIDOS DEL CLIENTE DESDE EL CONTROLADOR ---
    async function cargarMisPedidos() {
        if (!tablaMisPedidosCuerpo) return;
        
        try {
            const res = await fetch('../CONTROLADOR/PedidoC.php?accion=listar_mis_pedidos');
            const datos = await res.json();
            
            if (datos.ok) {
                listaMisPedidosGlobal = datos.pedidos;
                filtrarYRenderizarCliente();
            }
        } catch (err) {
            console.error("Error al cargar el historial del cliente:", err);
            tablaMisPedidosCuerpo.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:red;">Error al comunicar con el servidor.</td></tr>`;
        }
    }

    if (inputBuscarMiPedido) inputBuscarMiPedido.addEventListener('input', filtrarYRenderizarCliente);
    if (selectFiltroMiEstado) selectFiltroMiEstado.addEventListener('change', filtrarYRenderizarCliente);

    function filtrarYRenderizarCliente() {
        const texto = inputBuscarMiPedido.value.toLowerCase().trim();
        const estadoSeleccionado = selectFiltroMiEstado.value;

        const filtrados = listaMisPedidosGlobal.filter(p => {
            const folio = `ped-000${p.id_pedido}`.toLowerCase();
            const coincideTexto = folio.includes(texto);
            const coincideEstado = (estadoSeleccionado === 'Todos') || (p.estado.trim() === estadoSeleccionado);
            
            return coincideTexto && coincideEstado;
        });

        renderizarTablaCliente(filtrados);
    }

    function renderizarTablaCliente(pedidos) {
        tablaMisPedidosCuerpo.innerHTML = '';

        if (pedidos.length === 0) {
            tablaMisPedidosCuerpo.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#64748b;">No cuentas con pedidos registrados bajo este filtro.</td></tr>`;
            return;
        }

        pedidos.forEach(p => {
            let colorEstado = '#f97316'; 
            if (p.estado === 'Enviado') colorEstado = '#3b82f6';
            if (p.estado === 'Entregado') colorEstado = '#10b981';
            if (p.estado === 'Cancelado') colorEstado = '#ef4444';

            let fechaCorta = p.fecha_creacion;
            if (p.fecha_creacion.includes(' ')) {
                fechaCorta = p.fecha_creacion.split(' ')[0].split('-').reverse().join('/');
            }

            // LÓGICA DEL BOTÓN CALIFICAR: Solo aparece si está entregado
            let btnCalificarHTML = '';
            if (p.estado === 'Entregado') {
                // Si la consulta trae el id de calificación, significa que ya calificó
                if (p.id_calificacion) {
                    btnCalificarHTML = `
                        <span style="display:inline-block; font-size:11px; color:#fbbf24; font-weight:bold; background:#fffbeb; border:1px solid #fef3c7; padding:4px 8px; border-radius:6px;">
                            <i class="fa-solid fa-star"></i> Calificado
                        </span>
                    `;
                } else {
                    btnCalificarHTML = `
                        <button onclick="abrirCalificacion(${p.id_pedido})" style="background:#fffbeb; border:1px solid #fde68a; color:#d97706; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:bold; cursor:pointer; display:inline-flex; align-items:center; gap:4px; margin-left:5px;">
                            <i class="fa-regular fa-star"></i> Calificar
                        </button>
                    `;
                }
            }

            tablaMisPedidosCuerpo.innerHTML += `
                <tr style="border-bottom: 1px solid #e2e8f0; transition: background 0.2s;">
                    <td style="padding:15px; font-weight:bold; color:#1e293b;">PED-000${p.id_pedido}</td>
                    <td style="padding:15px; color:#475569;">${fechaCorta}</td>
                    <td style="padding:15px; max-width:220px; font-size:13px; color:#334155;">
                        ${p.calle_numero}, Col. ${p.colonia}, ${p.municipio_ciudad}
                    </td>
                    <td style="padding:15px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="color: ${colorEstado}; font-weight: bold;">${p.estado}</span>
                            <button onclick="abrirRastreoCliente(${p.id_pedido})" style="background:#f0fdf4; border:1px solid #bbf7d0; color:#165b1c; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:bold; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
                                <i class="fa-solid fa-clock-rotate-left"></i> Rastrear
                            </button>
                        </div>
                    </td>
                    <td style="padding:15px; font-weight:700; color:#1e4620;">$${parseFloat(p.total).toFixed(2)}</td>
                    <td style="padding:15px; text-align:center; display: flex; justify-content: center; gap: 8px;">
                        <button onclick="window.open('../CONTROLADOR/FacturaPdfC.php?id_pedido=${p.id_pedido}', '_blank')" style="background:none; border:none; color:#64748b; cursor:pointer;" title="Descargar Factura Digital">
                            <i class="fa-solid fa-file-pdf" style="font-size:18px; color:#ef4444;"></i>
                        </button>
                        ${btnCalificarHTML}
                    </td>
                </tr>
            `;
        });
    }

    // ==============================================================
    // LÓGICA DE RASTREO TIMELINE
    // ==============================================================
    window.abrirRastreoCliente = async function(id_pedido) {
        document.getElementById('lblRastreoFolioCliente').innerText = `Pedido Folio: PED-000${id_pedido}`;
        contenedorTimelineCliente.innerHTML = '<div style="color:#64748b; text-align:center; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Consultando estatus logístico...</div>';
        modalRastreoCliente.style.display = 'flex';

        try {
            const res = await fetch(`../CONTROLADOR/PedidoC.php?accion=ver_historial&id_pedido=${id_pedido}`);
            const datos = await res.json();

            if (datos.ok) {
                contenedorTimelineCliente.innerHTML = '';

                if (datos.historial.length === 0) {
                    contenedorTimelineCliente.innerHTML = '<div style="color:#94a3b8; font-size:13px; font-style:italic; padding:10px;">Tu pedido está siendo validado en el área administrativa.</div>';
                    return;
                }

                datos.historial.forEach((mov, index) => {
                    const esPrimero = index === 0;
                    const puntoColor = esPrimero ? '#10b981' : '#cbd5e1';
                    const brilloPunto = esPrimero ? '0 0 0 4px #d1fae5' : 'none';
                    const textoEstilo = esPrimero ? '800' : '600';
                    const colorLetra = esPrimero ? '#0f172a' : '#64748b';

                    contenedorTimelineCliente.innerHTML += `
                        <div style="position: relative; margin-bottom: 25px;">
                            <div style="position: absolute; left: -31px; top: 3px; width: 10px; height: 10px; background: ${puntoColor}; border-radius: 50%; box-shadow: ${brilloPunto}; transition: all 0.3s;"></div>
                            
                            <div style="font-weight: ${textoEstilo}; color: ${colorLetra}; font-size: 15px; display: flex; align-items: center; gap: 8px;">
                                ${mov.estado_nuevo}
                                ${esPrimero ? '<span style="background:#e0f2fe; color:#0369a1; font-size:9px; padding:2px 6px; border-radius:8px; font-weight:bold; text-transform:uppercase;">Estatus Actual</span>' : ''}
                            </div>
                            
                            <div style="font-size: 12px; color: #475569; margin-top: 3px;"><i class="fa-regular fa-calendar-check"></i> ${mov.fecha_formato}</div>
                        </div>
                    `;
                });
            } else {
                contenedorTimelineCliente.innerHTML = `<div style="color:red; font-size:13px;">${datos.msg}</div>`;
            }
        } catch (err) {
            console.error(err);
            contenedorTimelineCliente.innerHTML = '<div style="color:red; font-size:13px;">Error de conexión de red.</div>';
        }
    };

    // ==============================================================
    // LÓGICA DE CALIFICACIÓN
    // ==============================================================
    window.abrirCalificacion = function(id_pedido) {
        document.getElementById('calif_id_pedido').value = id_pedido;
        document.getElementById('lblCalificarFolio').innerText = `PED-000${id_pedido}`;
        modalCalificacion.style.display = 'flex';
    };

    if (formCalificacion) {
        formCalificacion.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const id_pedido = document.getElementById('calif_id_pedido').value;
            // Obtener valor de los radio buttons
            const valTiempo = document.querySelector('input[name="calif_tiempo"]:checked')?.value;
            const valServicio = document.querySelector('input[name="calif_servicio"]:checked')?.value;
            const valCalidad = document.querySelector('input[name="calif_calidad"]:checked')?.value;
            const comentario = document.getElementById('calif_comentario').value;

            if (!valTiempo || !valServicio || !valCalidad) {
                alert("Por favor califica las 3 categorías.");
                return;
            }

            try {
                const res = await fetch('../CONTROLADOR/PedidoC.php?accion=guardar_calificacion', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id_pedido: id_pedido,
                        tiempo: valTiempo,
                        servicio: valServicio,
                        calidad: valCalidad,
                        comentario: comentario
                    })
                });

                const datos = await res.json();

                if (datos.ok) {
                    alert("¡Gracias por tus comentarios! Nos ayudan a mejorar.");
                    modalCalificacion.style.display = 'none';
                    formCalificacion.reset();
                    cargarMisPedidos(); // Recargar para que desaparezca el botón
                } else {
                    alert(datos.msg);
                }
            } catch (err) {
                console.error(err);
                alert("Error de comunicación. Intenta nuevamente.");
            }
        });
    }
});