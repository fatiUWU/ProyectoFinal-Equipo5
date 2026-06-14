document.addEventListener('DOMContentLoaded', () => {
    const contenedorPedidos = document.getElementById('contenedorPedidosLogistica');
    const selectChofer = document.getElementById('log_chofer');
    const selectVehiculo = document.getElementById('log_vehiculo');
    const formAsignarRuta = document.getElementById('formAsignarRuta');

    const btnTabAsignar = document.getElementById('btnTabAsignar');
    const btnTabTransito = document.getElementById('btnTabTransito');
    const seccionAsignarRutas = document.getElementById('seccionAsignarRutas');
    const seccionEnTransito = document.getElementById('seccionEnTransito');

    const tablaPedidosTransito = document.getElementById('tablaPedidosTransito');
    const btnRecargarTransito = document.getElementById('btnRecargarTransito');

    const buscarTransito = document.getElementById('buscarTransito');
    const fechaTransito = document.getElementById('fechaTransito');
    const estadoTransito = document.getElementById('estadoTransito');
    const btnLimpiarFiltrosTransito = document.getElementById('btnLimpiarFiltrosTransito');

    let pedidosSeleccionados = [];
    let pedidosEnTransito = [];

    cargarCatalogosLogistica();
    cargarPedidosEnTransito();

    const inputFecha = document.getElementById('log_fecha');
    if (inputFecha) {
        inputFecha.valueAsDate = new Date();
    }

    if (btnTabAsignar) {
        btnTabAsignar.addEventListener('click', () => {
            mostrarSeccion('asignar');
        });
    }

    if (btnTabTransito) {
        btnTabTransito.addEventListener('click', () => {
            mostrarSeccion('transito');
            cargarPedidosEnTransito();
        });
    }

    if (btnRecargarTransito) {
        btnRecargarTransito.addEventListener('click', () => {
            cargarPedidosEnTransito();
        });
    }

    if (buscarTransito) {
        buscarTransito.addEventListener('input', renderizarPedidosEnTransito);
    }

    if (fechaTransito) {
        fechaTransito.addEventListener('change', renderizarPedidosEnTransito);
    }

    if (estadoTransito) {
        estadoTransito.addEventListener('change', renderizarPedidosEnTransito);
    }

    if (btnLimpiarFiltrosTransito) {
        btnLimpiarFiltrosTransito.addEventListener('click', () => {
            buscarTransito.value = '';
            fechaTransito.value = '';
            estadoTransito.value = '';
            renderizarPedidosEnTransito();
        });
    }

    function mostrarSeccion(seccion) {
        const esTransito = seccion === 'transito';

        btnTabAsignar.classList.toggle('tab-activa', !esTransito);
        btnTabTransito.classList.toggle('tab-activa', esTransito);

        seccionAsignarRutas.style.display = esTransito ? 'none' : 'block';
        seccionEnTransito.style.display = esTransito ? 'block' : 'none';
    }

    function limpiarTexto(valor) {
        const div = document.createElement('div');
        div.textContent = valor ?? '';
        return div.innerHTML;
    }

    function normalizarTexto(valor) {
        return String(valor ?? '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    }

    function formatoPedido(id) {
        return `PED-${String(id).padStart(5, '0')}`;
    }

    function obtenerClaseEstado(estado) {
        const estadoNormalizado = normalizarTexto(estado);

        if (estadoNormalizado.includes('preparacion')) {
            return 'estado-preparacion';
        }

        if (estadoNormalizado.includes('enviado')) {
            return 'estado-enviado';
        }

        if (estadoNormalizado.includes('entregado')) {
            return 'estado-entregado';
        }

        return 'estado-default';
    }

    async function cargarCatalogosLogistica() {
        try {
            const res = await fetch('../CONTROLADOR/LogisticaC.php?accion=cargar_catalogos');
            const datos = await res.json();

            if (datos.ok) {
                contenedorPedidos.innerHTML = '';

                if (datos.pedidos.length === 0) {
                    contenedorPedidos.innerHTML = `
                        <p style="padding:15px; text-align:center; color:#475569; background:white; border-radius:6px; margin:0; width: 100%;">
                            No hay pedidos pendientes de asignar en almacén.
                        </p>
                    `;
                } else {
                    datos.pedidos.forEach(p => {
                        contenedorPedidos.innerHTML += `
                            <div class="pedido-card-log" data-id="${p.id_pedido}" onclick="conmutarSeleccionPedido(this)">
                                <div style="font-weight:bold; color:#165b1c;">
                                    ${formatoPedido(p.id_pedido)}
                                </div>
                                <div>${limpiarTexto(p.nombre_cliente)}</div>
                                <div style="font-size:13px; color:#475569;">
                                    ${limpiarTexto(p.calle_numero)}, Col. ${limpiarTexto(p.colonia)}
                                </div>
                                <div style="font-weight:600;">
                                    ${limpiarTexto(p.municipio_ciudad)}
                                </div>
                            </div>
                        `;
                    });
                }

                selectChofer.innerHTML = '<option value="">Seleccionar conductor</option>';
                datos.choferes.forEach(c => {
                    selectChofer.innerHTML += `
                        <option value="${c.id_usu}">
                            👨‍✈️ ${limpiarTexto(c.nombre)}
                        </option>
                    `;
                });

                selectVehiculo.innerHTML = '<option value="">Seleccionar vehículo</option>';
                datos.vehiculos.forEach(v => {
                    selectVehiculo.innerHTML += `
                        <option value="${v.id_vehiculo}">
                            🚚 ${limpiarTexto(v.modelo)} [${limpiarTexto(v.placas)}]
                        </option>
                    `;
                });
            } else {
                alert(datos.msg || 'No se pudieron cargar los catálogos.');
            }

        } catch (err) {
            console.error('Error al cargar catálogos:', err);
            alert('Hubo un problema al cargar los datos de logística.');
        }
    }

    async function cargarPedidosEnTransito() {
        if (!tablaPedidosTransito) return;

        tablaPedidosTransito.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; color:#64748b; padding:20px;">
                    Cargando pedidos en tránsito...
                </td>
            </tr>
        `;

        try {
            const res = await fetch('../CONTROLADOR/LogisticaC.php?accion=listar_en_transito');
            const datos = await res.json();

            if (!datos.ok) {
                tablaPedidosTransito.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align:center; color:#b91c1c; padding:20px;">
                            ${limpiarTexto(datos.msg || 'No se pudieron cargar los pedidos en tránsito.')}
                        </td>
                    </tr>
                `;
                return;
            }

            pedidosEnTransito = datos.pedidos || [];
            renderizarPedidosEnTransito();

        } catch (err) {
            console.error('Error al cargar pedidos en tránsito:', err);

            tablaPedidosTransito.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; color:#b91c1c; padding:20px;">
                        Hubo un problema de conexión al cargar los pedidos en tránsito.
                    </td>
                </tr>
            `;
        }
    }

    function renderizarPedidosEnTransito() {
        if (!tablaPedidosTransito) return;

        const textoBusqueda = normalizarTexto(buscarTransito ? buscarTransito.value : '');
        const fechaSeleccionada = fechaTransito ? fechaTransito.value : '';
        const estadoSeleccionado = normalizarTexto(estadoTransito ? estadoTransito.value : '');

        const pedidosFiltrados = pedidosEnTransito.filter(p => {
            const folio = p.folio_pedido || formatoPedido(p.id_pedido);
            const fecha = p.fecha_salida || '';
            const estado = p.estado_actual || '';

            const textoCompleto = normalizarTexto(`
                ${folio}
                ${p.id_pedido}
                ${p.nombre_cliente}
                ${p.nombre_chofer}
                ${p.modelo_vehiculo}
                ${p.placas}
                ${p.direccion_completa}
                ${fecha}
                ${estado}
            `);

            const coincideTexto = textoBusqueda === '' || textoCompleto.includes(textoBusqueda);
            const coincideFecha = fechaSeleccionada === '' || fecha === fechaSeleccionada;
            const coincideEstado = estadoSeleccionado === '' || normalizarTexto(estado).includes(estadoSeleccionado);

            return coincideTexto && coincideFecha && coincideEstado;
        });

        if (pedidosFiltrados.length === 0) {
            tablaPedidosTransito.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; color:#64748b; padding:20px;">
                        No se encontraron pedidos con esos filtros.
                    </td>
                </tr>
            `;
            return;
        }

        tablaPedidosTransito.innerHTML = '';

        pedidosFiltrados.forEach(p => {
            const folio = p.folio_pedido || formatoPedido(p.id_pedido);
            const fecha = p.fecha_salida || 'Sin fecha';
            const estado = p.estado_actual || 'Sin estado';
            const claseEstado = obtenerClaseEstado(estado);

            tablaPedidosTransito.innerHTML += `
                <tr>
                    <td class="folio-pedido">${limpiarTexto(folio)}</td>
                    <td>${limpiarTexto(p.nombre_cliente)}</td>
                    <td>${limpiarTexto(p.nombre_chofer)}</td>
                    <td>${limpiarTexto(p.modelo_vehiculo)}</td>
                    <td>${limpiarTexto(p.placas)}</td>
                    <td>${limpiarTexto(fecha)}</td>
                    <td>${limpiarTexto(p.direccion_completa)}</td>
                    <td>
                        <span class="badge-estado ${claseEstado}">
                            ${limpiarTexto(estado)}
                        </span>
                    </td>
                </tr>
            `;
        });
    }

    window.conmutarSeleccionPedido = function(elemento) {
        const idPedido = parseInt(elemento.getAttribute('data-id'));
        elemento.classList.toggle('selected');

        if (elemento.classList.contains('selected')) {
            if (!pedidosSeleccionados.includes(idPedido)) {
                pedidosSeleccionados.push(idPedido);
            }
        } else {
            pedidosSeleccionados = pedidosSeleccionados.filter(id => id !== idPedido);
        }
    };

    if (formAsignarRuta) {
        formAsignarRuta.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (pedidosSeleccionados.length === 0) {
                alert('⚠️ Operación inválida: Debes seleccionar al menos un pedido de la lista haciendo clic sobre él.');
                return;
            }

            const id_chofer = selectChofer.value;
            const id_vehiculo = selectVehiculo.value;
            const fecha_salida = document.getElementById('log_fecha').value;

            if (!id_chofer || !id_vehiculo || !fecha_salida) {
                alert('Selecciona conductor, vehículo y fecha de entrega.');
                return;
            }

            try {
                const res = await fetch('../CONTROLADOR/LogisticaC.php?accion=asignar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id_chofer: id_chofer,
                        id_vehiculo: id_vehiculo,
                        fecha_salida: fecha_salida,
                        pedidos: pedidosSeleccionados
                    })
                });

                const datos = await res.json();

                if (datos.ok) {
                    alert(`🎉 ${datos.msg}`);

                    pedidosSeleccionados = [];

                    cargarCatalogosLogistica();
                    cargarPedidosEnTransito();

                    mostrarSeccion('transito');
                } else {
                    alert(datos.msg);
                }

            } catch (err) {
                console.error('Error en la petición de asignación:', err);
                alert('Hubo un problema de conexión al procesar la ruta.');
            }
        });
    }
});