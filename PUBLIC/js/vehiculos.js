document.addEventListener('DOMContentLoaded', () => {
    const formVehiculo = document.getElementById('formVehiculo');
    const tablaVehiculosCuerpo = document.getElementById('tablaVehiculosCuerpo');
    
    // Elementos del modal de edición
    const modalEditar = document.getElementById('modalEditarVehiculo');
    const btnCerrarEditar = document.getElementById('btnCerrarEditar');
    const formEditarVehiculo = document.getElementById('formEditarVehiculo');

    cargarFlota();

    if (btnCerrarEditar) {
        btnCerrarEditar.addEventListener('click', () => modalEditar.style.display = 'none');
    }

    // --- LEER VEHÍCULOS DE LA BASE DE DATOS ---
    async function cargarFlota() {
        try {
            const res = await fetch('../CONTROLADOR/VehiculoC.php?accion=listar');
            const datos = await res.json();

            if (datos.ok) {
                tablaVehiculosCuerpo.innerHTML = '';
                
                if (datos.vehiculos.length === 0) {
                    tablaVehiculosCuerpo.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:25px; color:#64748b;">Aún no tienes vehículos registrados en tu flota.</td></tr>`;
                    return;
                }

                datos.vehiculos.forEach(v => {
                    // Validaciones visuales para el estado del vehículo
                    const estaInactivo = (v.estado === 'inactivo');
                    const opacidad = estaInactivo ? '0.5' : '1';
                    const badgeReparacion = estaInactivo ? '<span style="font-size:10px; background:#fee2e2; color:#b91c1c; padding:2px 6px; border-radius:10px; margin-left: 8px; font-weight:bold;">(En Reparación)</span>' : '';
                    const colorIconoEstado = estaInactivo ? '#94a3b8' : '#16a34a';

                    tablaVehiculosCuerpo.innerHTML += `
                        <tr style="border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155; opacity: ${opacidad}; transition: opacity 0.3s;">
                            <td style="padding: 15px; font-weight: bold; color:#165b1c;">VEH-${v.id_vehiculo}</td>
                            <td style="padding: 15px; font-weight: 500;">${v.modelo} ${badgeReparacion}</td>
                            <td style="padding: 15px;">
                                <span style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-weight: bold; font-size: 13px; color: #0f172a;">${v.placas}</span>
                            </td>
                            <td style="padding: 15px; text-align: center; gap: 15px; display: flex; justify-content: center; align-items: center;">
                                <i class="fa-solid fa-power-off" title="Activar/Desactivar" style="cursor:pointer; color:${colorIconoEstado}; font-size: 16px;" onclick="cambiarEstadoVehiculo(${v.id_vehiculo}, '${v.estado}')"></i>
                                <i class="fa-solid fa-pencil" title="Editar" style="cursor:pointer; color:#3b82f6; font-size: 16px;" onclick="abrirModalEditar(${v.id_vehiculo}, '${v.modelo}', '${v.placas}')"></i>
                                <i class="fa-regular fa-trash-can" title="Eliminar" style="cursor:pointer; color:#ef4444; font-size: 16px;" onclick="eliminarVehiculo(${v.id_vehiculo})"></i>
                            </td>
                        </tr>
                    `;
                });
            }
        } catch (err) {
            console.error("Error de conexión:", err);
        }
    }

    // --- AGREGAR NUEVO VEHÍCULO ---
    if (formVehiculo) {
        formVehiculo.addEventListener('submit', async (e) => {
            e.preventDefault();
            const modelo = document.getElementById('txtModelo').value.trim();
            const placas = document.getElementById('txtPlacas').value.trim().toUpperCase();

            try {
                const res = await fetch('../CONTROLADOR/VehiculoC.php?accion=agregar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ modelo, placas })
                });
                
                const datos = await res.json();
                if (datos.ok) {
                    alert(`✅ ${datos.msg}`);
                    formVehiculo.reset();
                    cargarFlota(); 
                } else {
                    alert(`⚠️ Error: ${datos.msg}`);
                }
            } catch (err) {
                console.error("Error al registrar:", err);
            }
        });
    }

    // --- ELIMINAR VEHÍCULO ---
    window.eliminarVehiculo = async function(id_vehiculo) {
        if (!confirm(`¿Estás segura de que deseas eliminar permanentemente el vehículo VEH-${id_vehiculo}?`)) {
            return;
        }

        try {
            const res = await fetch('../CONTROLADOR/VehiculoC.php?accion=eliminar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_vehiculo })
            });
            const datos = await res.json();
            if (datos.ok) {
                cargarFlota(); 
            } else {
                alert(`⚠️ Error: ${datos.msg}`);
            }
        } catch (err) {
            console.error("Error al borrar:", err);
        }
    };

    // --- ABRIR Y PROCESAR EDICIÓN ---
    window.abrirModalEditar = (id, modelo, placas) => {
        document.getElementById('edit_id').value = id;
        document.getElementById('edit_modelo').value = modelo;
        document.getElementById('edit_placas').value = placas;
        modalEditar.style.display = 'flex';
    };

    if (formEditarVehiculo) {
        formEditarVehiculo.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id_vehiculo = document.getElementById('edit_id').value;
            const modelo = document.getElementById('edit_modelo').value;
            const placas = document.getElementById('edit_placas').value;

            try {
                const res = await fetch('../CONTROLADOR/VehiculoC.php?accion=editar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_vehiculo, modelo, placas })
                });
                const datos = await res.json();
                if (datos.ok) {
                    alert(`✅ ${datos.msg}`);
                    modalEditar.style.display = 'none';
                    cargarFlota();
                } else {
                    alert(`⚠️ Error: ${datos.msg}`);
                }
            } catch (err) {
                console.error("Error al actualizar:", err);
            }
        });
    }

    // --- NUEVO: CAMBIAR ESTADO DEL VEHÍCULO (ACTIVO/INACTIVO) ---
    window.cambiarEstadoVehiculo = async function(id_vehiculo, estadoActual) {
        try {
            const res = await fetch('../CONTROLADOR/VehiculoC.php?accion=cambiar_estado', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_vehiculo, estado: estadoActual })
            });
            
            const datos = await res.json();
            if (datos.ok) {
                cargarFlota(); 
            } else {
                alert(`⚠️ Error: ${datos.msg}`);
            }
        } catch (err) {
            console.error("Error al cambiar estado:", err);
        }
    };
});