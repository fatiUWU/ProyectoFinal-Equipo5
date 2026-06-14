document.addEventListener('DOMContentLoaded', () => {
    const btnAbrirModal = document.getElementById('btnAbrirModal');
    const btnCerrarModal = document.getElementById('btnCerrarModal');
    const modalProducto = document.getElementById('modalProducto');
    const productoForm = document.getElementById('productoForm');
    
    const modalMovimiento = document.getElementById('modalMovimiento');
    const btnCerrarModalMov = document.getElementById('btnCerrarModalMov');
    const movimientoForm = document.getElementById('movimientoForm');

    const inputBuscar = document.getElementById('inputBuscar');
    const selectFiltroCategoria = document.getElementById('selectFiltroCategoria');

    const btnVerHistorial = document.getElementById('btnVerHistorial');
    const modalHistorial = document.getElementById('modalHistorial');
    const btnCerrarHistorial = document.getElementById('btnCerrarHistorial');
    const tablaHistorialCuerpo = document.getElementById('tablaHistorialCuerpo');

    const filtroHistorialProducto = document.getElementById('filtroHistorialProducto');
    const filtroHistorialFecha = document.getElementById('filtroHistorialFecha');
    const btnLimpiarHistorial = document.getElementById('btnLimpiarHistorial');

    window.listaProductosGlobal = []; 
    window.historialGlobal = []; 

    cargarInventario();
    cargarAlertasStock();

    if (btnAbrirModal) btnAbrirModal.addEventListener('click', () => modalProducto.style.display = 'flex');
    if (btnCerrarModal) btnCerrarModal.addEventListener('click', () => modalProducto.style.display = 'none');
    if (btnCerrarModalMov) btnCerrarModalMov.addEventListener('click', () => modalMovimiento.style.display = 'none');
    
    if (btnVerHistorial) btnVerHistorial.addEventListener('click', cargarYAbrirHistorial);
    if (btnCerrarHistorial) btnCerrarHistorial.addEventListener('click', () => modalHistorial.style.display = 'none');

    if (filtroHistorialProducto) filtroHistorialProducto.addEventListener('input', aplicarFiltrosHistorial);
    if (filtroHistorialFecha) filtroHistorialFecha.addEventListener('change', aplicarFiltrosHistorial);
    
    if (btnLimpiarHistorial) {
        btnLimpiarHistorial.addEventListener('click', () => {
            filtroHistorialProducto.value = '';
            filtroHistorialFecha.value = '';
            renderizarHistorial(window.historialGlobal);
        });
    }

    // 1. REGISTRAR UN NUEVO PRODUCTO
    if (productoForm) {
        productoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('prod_nombre').value;
            const tipo_producto = document.getElementById('prod_tipo').value;
            const unidad_medida = document.getElementById('prod_unidad').value;
            const stock = document.getElementById('prod_stock').value;
            const stock_minimo = document.getElementById('prod_minimo').value || 0;
            const precio = document.getElementById('prod_precio').value;
            const descripcion = document.getElementById('prod_desc').value;
            
            // VARIABLES DE LOTE
            const numero_lote = document.getElementById('prod_lote').value;
            const fecha_produccion = document.getElementById('prod_f_prod').value;
            const fecha_caducidad = document.getElementById('prod_f_cad').value;

            try {
                const res = await fetch('../CONTROLADOR/InventarioC.php?accion=registrar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, tipo_producto, descripcion, unidad_medida, stock, stock_minimo, precio, numero_lote, fecha_produccion, fecha_caducidad })
                });
                
                if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
                const datos = await res.json();
                
                if (datos.ok) {
                    alert(`🎉 ¡Excelente! ${datos.msg}`);
                    productoForm.reset();
                    modalProducto.style.display = 'none';
                    cargarInventario();
                    cargarAlertasStock();
                } else {
                    alert(`⚠️ ${datos.msg}`);
                }
            } catch (err) { 
                console.error(err); 
                alert("❌ Ocurrió un error al intentar registrar el producto.");
            }
        });
    }

    // 2. EDITAR / REGISTRAR MOVIMIENTO
    if (movimientoForm) {
        movimientoForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const id_producto = document.getElementById('mov_id_producto').value;
            const nombre = document.getElementById('mov_nombre').value;
            const tipo_producto = document.getElementById('mov_tipo').value;
            const unidad_medida = document.getElementById('mov_unidad').value;
            const precio = document.getElementById('mov_precio').value;
            const stock_minimo = document.getElementById('mov_minimo').value || 0;
            const estado = document.getElementById('mov_estado').value;
            const descripcion = document.getElementById('mov_desc').value;
            
            // VARIABLES DE LOTE
            const numero_lote = document.getElementById('mov_lote').value;
            const fecha_produccion = document.getElementById('mov_f_prod').value;
            const fecha_caducidad = document.getElementById('mov_f_cad').value;
            
            const ajuste_tipo = document.getElementById('mov_ajuste_tipo').value;
            const ajuste_cantidad = document.getElementById('mov_ajuste_cantidad').value || 0;

            try {
                const res = await fetch('../CONTROLADOR/InventarioC.php?accion=editar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_producto, nombre, tipo_producto, unidad_medida, precio, stock_minimo, estado, descripcion, ajuste_tipo, ajuste_cantidad, numero_lote, fecha_produccion, fecha_caducidad })
                });
                
                if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
                const datos = await res.json();

                if (datos.ok) {
                    alert(`✅ ${datos.msg}`);
                    movimientoForm.reset();
                    modalMovimiento.style.display = 'none'; 
                    cargarInventario();    
                    cargarAlertasStock();   
                } else {
                    alert(`⚠️ ${datos.msg}`);
                }
            } catch (err) {
                console.error(err);
                alert("❌ Falla de comunicación al intentar actualizar.");
            }
        });
    }

    if (inputBuscar) inputBuscar.addEventListener('input', filtrarTabla);
    if (selectFiltroCategoria) selectFiltroCategoria.addEventListener('change', filtrarTabla);

    function filtrarTabla() {
        const textoBusqueda = inputBuscar.value.toLowerCase();
        const categoriaSeleccionada = selectFiltroCategoria.value;
        const filtrados = window.listaProductosGlobal.filter(prod => {
            return prod.nombre.toLowerCase().includes(textoBusqueda) && (categoriaSeleccionada === 'Todos' || prod.tipo_producto === categoriaSeleccionada);
        });
        renderizarFilas(filtrados);
    }

    async function cargarInventario() {
        try {
            const res = await fetch('../CONTROLADOR/InventarioC.php');
            if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
            const datos = await res.json();
            if (datos.ok) {
                window.listaProductosGlobal = datos.productos;
                renderizarFilas(window.listaProductosGlobal);
            }
        } catch (err) { console.error(err); }
    }

    function renderizarFilas(productos) {
        const tablaCuerpo = document.getElementById('tablaInventarioCuerpo');
        if (!tablaCuerpo) return;
        tablaCuerpo.innerHTML = '';

        productos.forEach(prod => {
            let colorEstado = '#10b981'; 
            if (prod.estado === 'No Disponible') {
                colorEstado = '#ef4444'; 
            } else if (prod.estado === 'Bajo') {
                colorEstado = '#eab308'; 
            }

            const icono = prod.tipo_producto === 'Hortaliza' ? '🥬' : '🍯';

            let tipoDisplay = prod.tipo_producto;
            if (tipoDisplay === 'Artesanal') tipoDisplay = 'Artesanales';
            else if (tipoDisplay === 'Hortaliza') tipoDisplay = 'Hortalizas';

            tablaCuerpo.innerHTML += `
                <div class="table-row-card labels-inventory">
                    <div class="product-cell">${icono} ${prod.nombre}</div>
                    <div>${tipoDisplay}</div>
                    <div>${prod.stock} ${prod.unidad_medida}</div>
                    <div>
                        <span class="status-text" style="color: ${colorEstado}; font-weight: bold;">
                            ${prod.estado}
                        </span>
                    </div>
                    <div class="action-icons-group text-center" style="justify-content: center;">
                        <i class="fa-solid fa-pencil" style="cursor:pointer; color:#165b1c;" onclick="mapearYAbrirModal(${prod.id_producto})"></i>
                    </div>
                </div>
            `;
        });
    }

    async function cargarAlertasStock() {
        try {
            const res = await fetch('../CONTROLADOR/InventarioC.php?accion=alertas');
            if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
            const datos = await res.json();
            const panelAlertas = document.getElementById('panelAlertasStock');
            
            if (panelAlertas && datos.ok && datos.alertas.length > 0) {
                let html = `<strong>⚠️ Alertas de Inventario Bajo:</strong><ul>`;
                datos.alertas.forEach(p => { html += `<li>${p.nombre} tiene solo ${p.stock} ${p.unidad_medida}</li>`; });
                panelAlertas.innerHTML = html + `</ul>`;
                panelAlertas.style.display = 'block';
            } else if (panelAlertas) { 
                panelAlertas.style.display = 'none'; 
            }
        } catch (err) { console.error(err); }
    }

    async function cargarYAbrirHistorial() {
        modalHistorial.style.display = 'flex';
        tablaHistorialCuerpo.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 30px; color: #64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando historial desde la bitácora...</td></tr>';
        
        try {
            const res = await fetch('../CONTROLADOR/InventarioC.php?accion=historial');
            if (!res.ok) throw new Error('Falla de red al conectar al controlador');
            const datos = await res.json();
            
            if (datos.ok) {
                window.historialGlobal = datos.historial;
                if (filtroHistorialProducto) filtroHistorialProducto.value = '';
                if (filtroHistorialFecha) filtroHistorialFecha.value = '';
                renderizarHistorial(window.historialGlobal);
            } else {
                tablaHistorialCuerpo.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color: red;">${datos.msg}</td></tr>`;
            }
        } catch (err) {
            console.error(err);
            tablaHistorialCuerpo.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: red;">Error crítico de comunicación con el backend.</td></tr>';
        }
    }

    // --- FUNCIÓN QUE PINTA LAS FILAS DEL HISTORIAL (MODIFICADA PARA RF-01) ---
    function renderizarHistorial(movimientos) {
        tablaHistorialCuerpo.innerHTML = '';
        
        if (movimientos.length === 0) {
            tablaHistorialCuerpo.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 30px; color: #64748b;">No se encontraron movimientos con esos filtros.</td></tr>';
            return;
        }
        
        movimientos.forEach(mov => {
            let colorTipo = '#64748b'; 
            let iconoTipo = 'fa-pen';  
            
            const normalizado = mov.tipo_movimiento.toLowerCase().trim();
            
            // LÓGICA VISUAL RF-01
            if (normalizado === 'entrada' || normalizado === 'ajuste_positivo') { 
                colorTipo = '#10b981'; 
                iconoTipo = 'fa-arrow-trend-up'; 
            } else if (normalizado === 'salida' || normalizado === 'venta') { 
                colorTipo = '#3b82f6'; 
                iconoTipo = 'fa-arrow-trend-down'; 
            } else if (['dañado', 'merma', 'robo', 'ajuste_negativo'].includes(normalizado)) {
                colorTipo = '#ef4444'; 
                if (normalizado === 'robo') iconoTipo = 'fa-user-ninja';
                else if (normalizado === 'dañado') iconoTipo = 'fa-heart-crack';
                else iconoTipo = 'fa-triangle-exclamation';
            }
            
            const nombreResponsable = mov.responsable ? mov.responsable : 'Sistema / Desconocido';
            const textoMovimiento = mov.tipo_movimiento.replace('_', ' ');

            tablaHistorialCuerpo.innerHTML += `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 12px; font-size: 13px; color: #475569;">${mov.fecha_movimiento}</td>
                    <td style="padding: 12px; font-weight: 600; color: #1e293b;">${mov.producto}</td>
                    <td style="padding: 12px;">
                        <span style="color: ${colorTipo}; font-weight: 600; font-size: 13px; text-transform: capitalize;">
                            <i class="fa-solid ${iconoTipo}"></i> ${textoMovimiento}
                        </span>
                    </td>
                    <td style="padding: 12px; font-size: 14px; font-weight: bold; text-align: center; color: #334155;">
                        ${mov.cantidad > 0 ? mov.cantidad : '-'}
                    </td>
                    <td style="padding: 12px; font-size: 13px; text-align: center; color: #475569;">
                        ${nombreResponsable}
                    </td>
                </tr>
            `;
        });
    }

    function aplicarFiltrosHistorial() {
        const textoProd = filtroHistorialProducto ? filtroHistorialProducto.value.toLowerCase().trim() : '';
        const textoFecha = filtroHistorialFecha ? filtroHistorialFecha.value : '';

        const filtrados = window.historialGlobal.filter(mov => {
            const coincideProducto = mov.producto.toLowerCase().includes(textoProd);
            const coincideFecha = textoFecha === '' || mov.fecha_movimiento.startsWith(textoFecha);
            return coincideProducto && coincideFecha;
        });

        renderizarHistorial(filtrados);
    }
}); 

// FUNCIÓN PARA ABRIR EL MODAL PRE-RELLENADO CON LOTES
window.mapearYAbrirModal = function(id_producto) {
    const prod = window.listaProductosGlobal.find(p => parseInt(p.id_producto) === parseInt(id_producto));
    if (!prod) return;

    document.getElementById('mov_id_producto').value = prod.id_producto;
    document.getElementById('mov_nombre').value = prod.nombre;
    document.getElementById('mov_tipo').value = prod.tipo_producto;
    document.getElementById('mov_unidad').value = prod.unidad_medida;
    document.getElementById('mov_precio').value = prod.precio;
    document.getElementById('mov_minimo').value = prod.stock_minimo;
    document.getElementById('mov_estado').value = prod.estado;
    document.getElementById('mov_desc').value = prod.descripcion ? prod.descripcion : '';
    
    // PRECARGAR DATOS DE LOTE
    document.getElementById('mov_lote').value = prod.numero_lote || '';
    document.getElementById('mov_f_prod').value = prod.fecha_produccion || '';
    document.getElementById('mov_f_cad').value = prod.fecha_caducidad || '';
    
    document.getElementById('mov_ajuste_tipo').value = 'ninguno';
    document.getElementById('mov_ajuste_cantidad').value = '';

    document.getElementById('modalMovimiento').style.display = 'flex';
};