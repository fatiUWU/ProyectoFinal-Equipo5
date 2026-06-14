document.addEventListener('DOMContentLoaded', () => {
    const contenedorSidebar = document.getElementById('sidebarDinamica');
    const gridProductos = document.getElementById('gridProductos');
    const btnConfirmarPedido = document.getElementById('btnConfirmarPedido');

    const buscadorProductos = document.getElementById('buscadorProductos');
    const contadorProductos = document.getElementById('contadorProductos');

    // Elementos del sistema bimodal de pasos
    const btnIrAPago = document.getElementById('btnIrAPago');
    const btnRegresarACatalogo = document.getElementById('btnRegresarACatalogo');
    const seccionPaso1 = document.getElementById('seccionPaso1');
    const seccionPaso2 = document.getElementById('seccionPaso2');
    const indPaso1 = document.getElementById('indPaso1');
    const indPaso2 = document.getElementById('indPaso2');

    let carrito = [];
    let productosDisponibles = [];

    // 1. ARRANQUE LOGICIAL AUTOMÁTICO
    renderizarSidebarPorRol();
    cargarCatalogoProductos();

    // --- BUSCADOR DE PRODUCTOS ---
    if (buscadorProductos) {
        buscadorProductos.addEventListener('input', () => {
            const texto = buscadorProductos.value.toLowerCase().trim();

            const productosFiltrados = productosDisponibles.filter(p => {
                const nombre = String(p.nombre || '').toLowerCase();
                const tipo = String(p.tipo_producto || '').toLowerCase();
                const unidad = String(p.unidad_medida || '').toLowerCase();

                return nombre.includes(texto) || tipo.includes(texto) || unidad.includes(texto);
            });

            renderizarProductos(productosFiltrados);
        });
    }

    // --- MANEJO INTERACTIVO DE PASOS ---
    if (btnIrAPago) {
        btnIrAPago.addEventListener('click', () => {
            if (carrito.length === 0) {
                alert("⚠️ Bolsa vacía: Agrega por lo menos un producto antes de avanzar al pago.");
                return;
            }

            seccionPaso1.classList.remove('activo');
            seccionPaso2.classList.add('activo');
            indPaso1.classList.remove('activo');
            indPaso2.classList.add('activo');
        });
    }

    if (btnRegresarACatalogo) {
        btnRegresarACatalogo.addEventListener('click', () => {
            seccionPaso2.classList.remove('activo');
            seccionPaso1.classList.add('activo');
            indPaso2.classList.remove('activo');
            indPaso1.classList.add('activo');
        });
    }

    // --- BARRA LATERAL DINÁMICA ---
    async function renderizarSidebarPorRol() {
        if (!contenedorSidebar) return;

        try {
            const res = await fetch('../CONTROLADOR/ObtenerSesionC.php');
            const sesion = await res.json();

            if (sesion.tipo === 1) {
                contenedorSidebar.style.backgroundColor = ""; 
                contenedorSidebar.style.width = "";

                contenedorSidebar.innerHTML = `
                    <div class="sidebar-logo">
                        <i class="fa-solid fa-truck-fast"></i>
                        <div class="brand-name">EcoLogística<span>Veracruz</span></div>
                    </div>

                    <nav class="nav-menu">
                        <li><a href="dashboard.html" class="nav-item"><i class="fa-solid fa-house"></i> Inicio</a></li>
                        <li><a href="inventario.html" class="nav-item"><i class="fa-solid fa-clipboard-list"></i> Inventario</a></li>
                        <li><a href="crearP.html" class="nav-item active"><i class="fa-solid fa-cart-shopping"></i> Crear pedido</a></li>
                        <li><a href="pedidos.html" class="nav-item"><i class="fa-solid fa-box"></i> Pedidos</a></li>
                        <li><a href="logistica.html" class="nav-item"><i class="fa-solid fa-truck"></i> Logística</a></li>
                        <li><a href="usuarios.html" class="nav-item"><i class="fa-solid fa-user-tie"></i> Conductores</a></li>
                        <li><a href="vehiculos.html" class="nav-item"><i class="fa-solid fa-truck-front"></i> Vehículos</a></li>
                        <li><a href="reportes.html" class="nav-item"><i class="fa-solid fa-chart-pie"></i> Reportes</a></li>
                         <li><a href="facturacion.html" class="nav-item"><i class="fa-solid fa-file-invoice-dollar"></i> Nota de venta</a></li>
                    </nav>

                    <a href="login.html" class="logout-btn">
                        <i class="fa-solid fa-right-from-bracket"></i> Cerrar Sesión
                    </a>
                `;
            } else {
                contenedorSidebar.style.backgroundColor = "#1e4620";
                contenedorSidebar.style.width = "260px";

                contenedorSidebar.innerHTML = `
                    <div class="sidebar-logo" style="padding: 0 25px; margin-bottom: 40px; display: flex; align-items: center;">
                        <i class="fa-solid fa-basket-shopping" style="color: #6ee7b7; font-size: 28px; margin-right: 12px;"></i>
                        <div class="brand-name" style="color: white;">
                            EcoMarket
                            <span style="color: #a7f3d0; font-size: 13px; display: block;">
                                Cliente Sostenible
                            </span>
                        </div>
                    </div>

                    <nav class="nav-menu">
                        <li>
                            <a href="inicioC.html" class="nav-item" style="color: rgba(255,255,255,0.7); text-decoration: none;">
                                <i class="fa-solid fa-house"></i> Inicio
                            </a>
                        </li>

                        <li>
                            <a href="crearP.html" class="nav-item active" style="color: #6ee7b7; font-weight: bold; background-color: rgba(89, 202, 100, 0.1); border-left: 4px solid #6ee7b7;">
                                <i class="fa-solid fa-cart-plus"></i> Crear pedido
                            </a>
                        </li>

                        <li>
                            <a href="misPedidosC.html" class="nav-item" style="color: rgba(255,255,255,0.7); text-decoration: none;">
                                <i class="fa-solid fa-box-open"></i> Mis pedidos
                            </a>
                        </li>

                        <li>
                            <a href="miCuentaC.html" class="nav-item" style="color: rgba(255,255,255,0.7); text-decoration: none;">
                                <i class="fa-solid fa-user-gear"></i> Mi cuenta
                            </a>
                        </li>
                    </nav>

                    <a href="login.html" class="logout-btn" style="color: #f87171; text-decoration: none;">
                        <i class="fa-solid fa-power-off"></i> Cerrar Sesión
                    </a>
                `;
            }

        } catch (err) { 
            console.error(err); 
        }
    }

    // --- CARGAR PRODUCTOS ---
    async function cargarCatalogoProductos() {
        if (!gridProductos) return;

        try {
            const res = await fetch('../CONTROLADOR/InventarioC.php');
            const datos = await res.json();

            if (datos.ok) {
                productosDisponibles = datos.productos.filter(p => p.estado === 'Disponible' && p.stock > 0);
                renderizarProductos(productosDisponibles);
            }

        } catch (err) { 
            console.error(err); 
        }
    }

    // --- RENDERIZAR PRODUCTOS EN EL CATÁLOGO (CON ETIQUETAS DE FRESCURA) ---
    function renderizarProductos(listaProductos) {
        gridProductos.innerHTML = '';

        if (listaProductos.length === 0) {
            gridProductos.innerHTML = `
                <p style="grid-column:1/-1; color:#64748b; text-align:center; padding: 20px;">
                    No se encontraron productos con esa búsqueda.
                </p>
            `;

            if (contadorProductos) {
                contadorProductos.innerText = '0 productos encontrados';
            }

            return;
        }

        if (contadorProductos) {
            contadorProductos.innerText = `Mostrando ${listaProductos.length} producto(s) disponible(s)`;
        }

        listaProductos.forEach(p => {
            const icono = p.tipo_producto === 'Hortaliza' ? '🥬' : '🍯';

            // --- LÓGICA DE ETIQUETAS DE FRESCURA ---
            let htmlFechas = '';
            
            // Verificamos si existe fecha de producción (cosecha)
            if (p.fecha_produccion && p.fecha_produccion !== '0000-00-00') {
                htmlFechas += `
                    <div style="background-color: #f0fdf4; color: #166534; padding: 4px 8px; border-radius: 4px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #bbf7d0;">
                        <i class="fa-solid fa-seedling"></i> Cosecha: ${p.fecha_produccion}
                    </div>
                `;
            }
            
            // Verificamos si existe fecha de caducidad
            if (p.fecha_caducidad && p.fecha_caducidad !== '0000-00-00') {
                htmlFechas += `
                    <div style="background-color: #fff7ed; color: #c2410c; padding: 4px 8px; border-radius: 4px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #ffedd5;">
                        <i class="fa-regular fa-clock"></i> Consumir antes: ${p.fecha_caducidad}
                    </div>
                `;
            }

            // Si existen fechas, envolvemos las etiquetas en un contenedor
            let bloqueLotes = '';
            if (htmlFechas !== '') {
                bloqueLotes = `
                    <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 2px; margin-bottom: 2px;">
                        ${htmlFechas}
                    </div>
                `;
            }
            // ----------------------------------------

            const tarjeta = document.createElement('div');

            tarjeta.style.cssText = `
                border: 1px solid #cbd5e1;
                padding: 18px;
                border-radius: 10px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                background: #ffffff;
            `;

            tarjeta.innerHTML = `
                <span style="font-size:26px; margin-bottom:5px;">${icono}</span>

                <strong style="color:#000000; font-size:15px;">
                    ${p.nombre}
                </strong>

                <span style="font-size:12px; color:#64748b;">
                    Tipo: ${p.tipo_producto}
                </span>

                ${bloqueLotes}

                <span style="font-size:13px; color:#334155;">
                    $${parseFloat(p.precio).toFixed(2)} / ${p.unidad_medida}
                </span>

                <span style="font-size:12px; color:#165b1c; font-weight: bold;">
                    Disponibles: ${p.stock} ${p.unidad_medida}
                </span>

                <button 
                    type="button" 
                    class="btn-confirm btn-agregar-producto"
                    style="padding:8px; font-size:12px; margin-top:5px; width: 100%;">
                    + Agregar al Carrito
                </button>
            `;

            const botonAgregar = tarjeta.querySelector('.btn-agregar-producto');

            botonAgregar.addEventListener('click', () => {
                window.agregarAlCarrito(
                    Number(p.id_producto),
                    p.nombre,
                    Number(p.precio),
                    Number(p.stock)
                );
            });

            gridProductos.appendChild(tarjeta);
        });
    }

    // --- ACCIONES INTERNAS DEL CARRITO ---
    window.agregarAlCarrito = function(id, nombre, precio, stockMax) {
        const item = carrito.find(x => x.id_producto === id);

        if (item) {
            if (item.cantidad >= stockMax) { 
                alert("Límite de existencias alcanzado."); 
                return; 
            }

            item.cantidad++;
        } else {
            carrito.push({ 
                id_producto: id, 
                nombre: nombre, 
                precio: precio, 
                cantidad: 1 
            });
        }

        actualizarInterfazCarrito();
    };

    function actualizarInterfazCarrito() {
        const cuerpo = document.getElementById('carritoCuerpo');

        if (!cuerpo) return;

        cuerpo.innerHTML = '';

        let subtotal = 0;

        carrito.forEach((item, index) => {
            subtotal += item.precio * item.cantidad;

            cuerpo.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:10px; border-radius:8px; font-size:13px; border:1px solid #cbd5e1;">
                    <div>
                        <strong>${item.nombre}</strong>
                        <br>
                        <span style="color:#334155;">
                            $${Number(item.precio).toFixed(2)} x ${item.cantidad}
                        </span>
                    </div>

                    <button type="button" onclick="removerDelCarrito(${index})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:14px;">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            `;
        });

        const envio = subtotal > 0 ? 40 : 0;
        const total = subtotal + envio;

        document.getElementById('lblSubtotalPaso1').innerText = `$${subtotal.toFixed(2)}`;
        document.getElementById('lblSubtotal').innerText = `$${subtotal.toFixed(2)}`;
        document.getElementById('lblEnvio').innerText = `$${envio.toFixed(2)}`;
        document.getElementById('lblTotal').innerText = `$${total.toFixed(2)}`;
    }

    window.removerDelCarrito = function(index) {
        carrito.splice(index, 1);
        actualizarInterfazCarrito();
    };

    // --- PROCESAR Y GUARDAR PEDIDO ---
    if (btnConfirmarPedido) {
        btnConfirmarPedido.addEventListener('click', async () => {
            const calle_numero = document.getElementById('dir_calle')?.value.trim() || '';
            const colonia = document.getElementById('dir_colonia')?.value.trim() || '';
            const cp = document.getElementById('dir_cp')?.value.trim() || '';
            const municipio_ciudad = document.getElementById('dir_municipio')?.value.trim() || '';
            const estado_provincia = document.getElementById('dir_estado')?.value || document.getElementById('dir_estado_provincia')?.value || 'Veracruz';
            const telefono_contacto = document.getElementById('dir_telefono')?.value.trim() || '';

            if (!calle_numero || !colonia || !cp || !municipio_ciudad || !telefono_contacto) {
                alert("❌ Campos incompletos: Por favor escribe tu dirección completa para coordinar la entrega.");
                return;
            }

            const subtotalFloat = parseFloat(document.getElementById('lblSubtotal')?.innerText.replace('$', '') || 0);
            const envioFloat = parseFloat(document.getElementById('lblEnvio')?.innerText.replace('$', '') || 0);
            const totalFloat = parseFloat(document.getElementById('lblTotal')?.innerText.replace('$', '') || 0);

            try {
                const res = await fetch('../CONTROLADOR/PedidoC.php?accion=crear', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        subtotal: subtotalFloat,
                        envio: envioFloat,
                        total: totalFloat,
                        productos: carrito,
                        direccion: { 
                            calle_numero, 
                            colonia, 
                            cp, 
                            municipio_ciudad, 
                            estado_provincia, 
                            telefono_contacto 
                        }
                    })
                });

                const datos = await res.json();

                if (datos.ok) {
                    alert(`🎉 ¡Excelente! Pedido registrado con éxito.\nFolio de Rastreo: PED-000${datos.id_pedido}`);

                    carrito = [];
                    actualizarInterfazCarrito();

                    if (document.getElementById('dir_calle')) document.getElementById('dir_calle').value = '';
                    if (document.getElementById('dir_colonia')) document.getElementById('dir_colonia').value = '';
                    if (document.getElementById('dir_cp')) document.getElementById('dir_cp').value = '';
                    if (document.getElementById('dir_telefono')) document.getElementById('dir_telefono').value = '';

                    seccionPaso2.classList.remove('activo');
                    seccionPaso1.classList.add('activo');
                    indPaso2.classList.remove('activo');
                    indPaso1.classList.add('activo');

                } else {
                    alert(`⚠️ Error devuelto por el servidor: ${datos.msg}`);
                }

            } catch (err) {
                console.error("Error al procesar el fetch del pedido:", err);
                alert("Ocurrió un problema de red al intentar procesar tu compra. Por favor, intenta de nuevo.");
            }
        });
    }
});