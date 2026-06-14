document.addEventListener('DOMContentLoaded', () => {
    const contenedorPedidosChofer = document.getElementById('contenedorPedidosChofer');
    const lblChoferFecha = document.getElementById('lblChoferFecha');
    const lblChoferVehiculo = document.getElementById('lblChoferVehiculo');

    cargarRutaAsignadaChofer();

    async function cargarRutaAsignadaChofer() {
        if (!contenedorPedidosChofer) return;

        try {
            const res = await fetch('../CONTROLADOR/ChoferC.php?accion=cargar_ruta');
            const datos = await res.json();

            if (datos.ok) {
                // Renderizamos las fechas futuras primero
                renderizarFuturasEntregas(datos.futuras);

                if (!datos.tiene_ruta || !datos.pedidos || datos.pedidos.length === 0) {
                    lblChoferFecha.innerText = "Ninguna";
                    lblChoferVehiculo.innerText = "Sin transporte asignado";
                    contenedorPedidosChofer.innerHTML = `
                        <div style="text-align:center; padding:40px 20px; background:white; border-radius:12px; color:#64748b; border: 1px dashed #cbd5e1;">
                            <i class="fa-solid fa-face-smile" style="font-size:32px; color:#165b1c; margin-bottom:10px;"></i>
                            <p style="font-size:14px; margin:0; font-weight:600;">¡Estás al día!</p>
                            <p style="font-size:12px; margin:5px 0 0 0;">No cuentas con pedidos pendientes de entrega por el momento.</p>
                        </div>
                    `;
                    return;
                }

                lblChoferFecha.innerText = datos.fecha.split('-').reverse().join('/');
                lblChoferVehiculo.innerText = datos.vehiculo;

                contenedorPedidosChofer.innerHTML = '';
                datos.pedidos.forEach(p => {
                    let botonAccionHTML = '';
                    let badgeEstadoColor = '#f97316'; 

                    if (p.estado === 'En Preparacion') {
                        botonAccionHTML = `
                            <button type="button" class="btn-status-chof btn-en-ruta" onclick="cambiarEstadoDespacho(${p.id_pedido}, 'Enviado')">
                                <i class="fa-solid fa-truck-ramp-box"></i> Iniciar Ruta (Enviar)
                            </button>
                        `;
                    } else if (p.estado === 'Enviado') {
                        badgeEstadoColor = '#3b82f6'; 
                        botonAccionHTML = `
                            <button type="button" class="btn-status-chof btn-entregado" onclick="cambiarEstadoDespacho(${p.id_pedido}, 'Entregado')">
                                <i class="fa-solid fa-square-check"></i> Marcar Entregado
                            </button>
                        `;
                    }

                    contenedorPedidosChofer.innerHTML += `
                        <div class="pedido-chofer-card">
                            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed #e2e8f0; padding-bottom:8px;">
                                <strong style="color:#165b1c; font-size:15px;">Folio: PED-000${p.id_pedido}</strong>
                                <span style="font-size:11px; font-weight:bold; background:#f1f5f9; color:${badgeEstadoColor}; padding:3px 8px; border-radius:10px; border:1px solid ${badgeEstadoColor};">${p.estado}</span>
                            </div>
                            
                            <div style="font-size:13px; color:#334155; display:flex; flex-direction:column; gap:4px;">
                                <span><strong>👤 Cliente:</strong> ${p.nombre_cliente}</span>
                                <span><strong>📍 Dirección:</strong> ${p.calle_numero}, Col. ${p.colonia}, ${p.municipio_ciudad}</span>
                                <span><strong>📞 Contacto:</strong> <a href="tel:${p.telefono_contacto}" style="color:#165b1c; font-weight:600; text-decoration:none;"><i class="fa-solid fa-phone"></i> ${p.telefono_contacto}</a></span>
                                <span style="font-size:14px; margin-top:4px;"><strong>Monto Cobro:</strong> <strong style="color:#1e293b;">$${parseFloat(p.total).toFixed(2)}</strong></span>
                            </div>

                            <div style="display:flex; margin-top:5px;">
                                ${botonAccionHTML}
                            </div>
                        </div>
                    `;
                });
            } else {
                contenedorPedidosChofer.innerHTML = `<div style="color:red; text-align:center; padding: 20px;">${datos.msg}</div>`;
                document.getElementById('contenedorFuturasEntregas').innerHTML = `<div style="color:red; text-align:center; padding: 20px;">No se pudo cargar la información.</div>`;
            }
        } catch (err) {
            console.error("Error:", err);
            contenedorPedidosChofer.innerHTML = `<div style="color:red; text-align:center; padding: 20px;">Error crítico de comunicación.</div>`;
        }
    }

    function renderizarFuturasEntregas(entregas) {
        const contenedor = document.getElementById('contenedorFuturasEntregas');
        if (!contenedor) return;

        if (!entregas || entregas.length === 0) {
            contenedor.innerHTML = `
                <div style="background: #f8fafc; border: 1px dashed #cbd5e1; padding: 25px; border-radius: 8px; text-align: center; color: #64748b;">
                    <i class="fa-regular fa-calendar-check" style="font-size: 24px; margin-bottom: 10px;"></i><br>
                    No tienes rutas programadas para próximos días.
                </div>
            `;
            return;
        }

        contenedor.innerHTML = ''; 
        
        entregas.forEach(entrega => {
            contenedor.innerHTML += `
                <div style="background: white; border: 1px solid #e2e8f0; border-left: 5px solid #165b1c; padding: 15px 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02); margin-bottom: 10px;">
                    <div>
                        <div style="font-weight: 800; color: #1e293b; font-size: 15px;">
                            <i class="fa-regular fa-calendar"></i> Fecha: ${entrega.fecha_entrega}
                        </div>
                        <div style="color: #475569; font-size: 13px; margin-top: 5px;">
                            <i class="fa-solid fa-box"></i> Tienes <strong>${entrega.total_pedidos}</strong> pedido(s) programado(s) para esta jornada.
                        </div>
                    </div>
                    <div>
                        <span style="background: #e0f2fe; color: #0369a1; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
                            Programado
                        </span>
                    </div>
                </div>
            `;
        });
    }

    window.cambiarEstadoDespacho = async function(id_pedido, nuevo_estado) {
        const confirmacionTexto = nuevo_estado === 'Enviado' 
            ? "¿Confirmas que vas a arrancar el viaje para este pedido?" 
            : "¿Confirmas que el producto ya fue entregado en mano al cliente?";

        if (!confirm(confirmacionTexto)) return;

        try {
            const res = await fetch('../CONTROLADOR/ChoferC.php?accion=actualizar_estado_pedido', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_pedido, nuevo_estado })
            });

            const datos = await res.json();

            if (datos.ok) {
                alert(datos.msg);
                cargarRutaAsignadaChofer(); 
            } else {
                alert(`⚠️ Error: ${datos.msg}`);
            }
        } catch (err) {
            console.error("Error:", err);
        }
    };
});