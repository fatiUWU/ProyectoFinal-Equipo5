// PUBLIC/js/conductores.js
document.addEventListener('DOMContentLoaded', () => {
    const formRegistrarChofer = document.getElementById('formRegistrarChofer');
    const tablaChoferesCuerpo = document.getElementById('tablaChoferesCuerpo');

    // Elementos del modal de edición
    const modalEditar = document.getElementById('modalEditarChofer');
    const btnCerrarEditar = document.getElementById('btnCerrarEditarChofer');
    const formEditar = document.getElementById('formEditarChofer');

    cargarChoferesSistema();

    // CERRAR MODAL DE EDICIÓN
    if (btnCerrarEditar) {
        btnCerrarEditar.addEventListener('click', () => modalEditar.style.display = 'none');
    }

    // REGISTRAR CHOFER (AHORA CON DOBLE VALIDACIÓN DE CONTRASEÑA)
    if (formRegistrarChofer) {
        formRegistrarChofer.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('chof_nombre').value.trim();
            const correo = document.getElementById('chof_correo').value.trim();
            const contra = document.getElementById('chof_contra').value;
            const contraConf = document.getElementById('chof_contra_conf').value;

            // NUEVA VALIDACIÓN DE CONTRASEÑA
            if (contra !== contraConf) {
                alert("⚠️ Las contraseñas no coinciden. Por favor, escríbelas de nuevo.");
                return; // Detiene el envío
            }

            try {
                const res = await fetch('../CONTROLADOR/UsuC.php?accion=crear_chofer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, correo, contra })
                });
                const datos = await res.json();
                if (datos.ok) {
                    alert(datos.msg);
                    formRegistrarChofer.reset();
                    cargarChoferesSistema(); 
                } else {
                    alert(`⚠️ Atención: ${datos.msg}`);
                }
            } catch (err) { console.error(err); }
        });
    }

    // --- PINTAR LAS FILAS Y BOTONES ---
    async function cargarChoferesSistema() {
        if (!tablaChoferesCuerpo) return;

        try {
            const res = await fetch('../CONTROLADOR/UsuC.php?accion=listar_choferes');
            const datos = await res.json();

            if (datos.ok) {
                tablaChoferesCuerpo.innerHTML = '';

                if (!datos.choferes || datos.choferes.length === 0) {
                    tablaChoferesCuerpo.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#64748b; font-weight:500;">No hay choferes dados de alta en planta.</td></tr>`;
                    return;
                }

                datos.choferes.forEach(c => {
                    const estatusInt = parseInt(c.estatus);
                    let estatusBadge = '';
                    let botonAccionHTML = '';

                    // NUEVO: Agregamos el ícono del lápiz (Editar) a ambas condiciones
                    if (estatusInt === 1) {
                        estatusBadge = '<span style="color: #10b981; font-weight: bold; background: #d1fae5; padding: 4px 10px; border-radius: 12px; font-size: 11px;">Activo</span>';
                        botonAccionHTML = `
                            <i class="fa-solid fa-pencil" style="cursor:pointer; color:#3b82f6; font-size: 15px; margin-right: 12px;" title="Editar Datos" onclick="abrirModalEditarChofer(${c.id_usu}, '${c.nombre}', '${c.correo}')"></i>
                            <i class="fa-regular fa-trash-can" style="cursor:pointer; color:#ef4444; font-size: 15px;" title="Dar de baja" onclick="conmutarEstatusChoferReal(${c.id_usu}, 0)"></i>
                        `;
                    } else {
                        estatusBadge = '<span style="color: #ef4444; font-weight: bold; background: #fee2e2; padding: 4px 10px; border-radius: 12px; font-size: 11px;">Inactivo / Baja</span>';
                        botonAccionHTML = `
                            <i class="fa-solid fa-pencil" style="cursor:pointer; color:#3b82f6; font-size: 15px; margin-right: 12px;" title="Editar Datos" onclick="abrirModalEditarChofer(${c.id_usu}, '${c.nombre}', '${c.correo}')"></i>
                            <i class="fa-solid fa-arrow-rotate-left" style="cursor:pointer; color:#10b981; font-size: 15px;" title="Reactivar" onclick="conmutarEstatusChoferReal(${c.id_usu}, 1)"></i>
                        `;
                    }

                    tablaChoferesCuerpo.innerHTML += `
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 12px; font-weight: bold; color: #165b1c;">CHF-00${c.id_usu}</td>
                            <td style="padding: 12px; font-weight: 500;">${c.nombre}</td>
                            <td style="padding: 12px; font-family: monospace; color: #475569;">${c.correo}</td>
                            <td style="padding: 12px; text-align: center;">${estatusBadge}</td>
                            <td style="padding: 12px; text-align: center;">${botonAccionHTML}</td>
                        </tr>
                    `;
                });
            }
        } catch (err) { console.error("Error al listar conductores:", err); }
    }

    // --- NUEVO: ABRIR MODAL Y ENVIAR EDICIÓN ---
    window.abrirModalEditarChofer = function(id, nombre, correo) {
        document.getElementById('edit_id_usu').value = id;
        document.getElementById('edit_nombre').value = nombre;
        document.getElementById('edit_correo').value = correo;
        modalEditar.style.display = 'flex';
    };

    if (formEditar) {
        formEditar.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id_usu = document.getElementById('edit_id_usu').value;
            const nombre = document.getElementById('edit_nombre').value.trim();
            const correo = document.getElementById('edit_correo').value.trim();

            try {
                const res = await fetch('../CONTROLADOR/UsuC.php?accion=editar_chofer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_usu, nombre, correo })
                });
                const datos = await res.json();
                
                if (datos.ok) {
                    alert(`✅ ${datos.msg}`);
                    modalEditar.style.display = 'none';
                    cargarChoferesSistema();
                } else {
                    alert(`⚠️ Error: ${datos.msg}`);
                }
            } catch (err) {
                console.error("Error al editar:", err);
            }
        });
    }

    // --- DESACTIVAR / REACTIVAR CHOFER (INTACTO) ---
    window.conmutarEstatusChoferReal = async function(id_usu, destinoEstatus) {
        if (!confirm(destinoEstatus === 0 ? "¿Deseas dar de baja a este conductor?" : "¿Deseas reactivar a este conductor?")) return;
        try {
            const res = await fetch('../CONTROLADOR/UsuC.php?accion=cambiar_estatus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_usu: id_usu, estatus: destinoEstatus })
            });
            const datos = await res.json();
            if (datos.ok) {
                alert(datos.msg);
                cargarChoferesSistema(); 
            }
        } catch (err) { console.error(err); }
    };
});