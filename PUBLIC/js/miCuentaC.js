// ==========================================================================
// CONTROLADOR FRONTEND: MI CUENTA (CLIENTE) - BLINDADO
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    const lblMiNombre = document.getElementById('lblMiNombre');
    const lblMiCorreo = document.getElementById('lblMiCorreo');
    const formCambiarContra = document.getElementById('formCambiarContra');

    // Cargar automáticamente los datos del cliente conectado
    cargarDatosPerfilCliente();

    // --- LÓGICA PARA LOS "OJITOS" DE LAS CONTRASEÑAS ---
    const toggleEyes = document.querySelectorAll('.toggle-eye');
    toggleEyes.forEach(icon => {
        icon.addEventListener('click', function() {
            // El input siempre es el elemento hermano anterior al ícono (i)
            const input = this.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.replace('fa-eye-slash', 'fa-eye');
            } else {
                input.type = 'password';
                this.classList.replace('fa-eye', 'fa-eye-slash');
            }
        });
    });

    // --- LEER PERFIL DEL CONTROLADOR PHP ---
    async function cargarDatosPerfilCliente() {
        try {
            const res = await fetch('../CONTROLADOR/MiCuentaC.php?accion=ver_perfil');
            
            if (!res.ok) {
                throw new Error(`El servidor devolvió un error HTTP: ${res.status}. Verifica que el archivo exista.`);
            }

            const respuestaTexto = await res.text();
            let datos;

            try {
                datos = JSON.parse(respuestaTexto);
            } catch (err) {
                console.error("Respuesta cruda del servidor:", respuestaTexto);
                throw new Error("El archivo PHP no devolvió un JSON válido. Probablemente hay un error 404 o un fallo en PHP.");
            }

            if (datos.ok) {
                // Inyectar datos en la vista (Si los elementos existen)
                if (lblMiNombre) lblMiNombre.innerText = datos.nombre || 'Sin nombre';
                if (lblMiCorreo) lblMiCorreo.innerText = datos.correo || 'Sin correo';
            } else {
                console.warn("Aviso del servidor:", datos.msg);
                if (lblMiNombre) lblMiNombre.innerText = 'Error al cargar';
                if (lblMiCorreo) lblMiCorreo.innerText = 'Error al cargar';
            }

        } catch (err) {
            console.error("❌ Falla crítica al obtener perfil:", err);
            if (lblMiNombre) lblMiNombre.innerText = 'Error de conexión';
            if (lblMiCorreo) lblMiCorreo.innerText = 'Error de conexión';
        }
    }

    // --- ENVIAR CAMBIO DE CONTRASEÑA CON VALIDACIÓN ---
    if (formCambiarContra) {
        formCambiarContra.addEventListener('submit', async (e) => {
            e.preventDefault();

            const contraActual = document.getElementById('txtContraActual').value;
            const contraNueva = document.getElementById('txtNuevaContra').value;
            const confirmar = document.getElementById('txtConfirmarContra').value;

            // Validación de coincidencia en el frontend
            if (contraNueva !== confirmar) {
                alert("❌ Las contraseñas nuevas no coinciden. Por favor, verifica.");
                return;
            }

            if (contraNueva.length < 6) {
                alert("⚠️ La nueva contraseña debe tener al menos 6 caracteres por seguridad.");
                return;
            }

            try {
                const res = await fetch('../CONTROLADOR/MiCuentaC.php?accion=actualizar_contra', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ 
                        contra_actual: contraActual, 
                        contra: contraNueva 
                    })
                });

                if (!res.ok) {
                    throw new Error(`Error HTTP: ${res.status}`);
                }

                const respuestaTexto = await res.text();
                let datos;

                try {
                    datos = JSON.parse(respuestaTexto);
                } catch (err) {
                    throw new Error("El servidor devolvió un código HTML o vacío en lugar de JSON.");
                }

                if (datos.ok) {
                    alert(`🎉 ¡Excelente! ${datos.msg}`);
                    formCambiarContra.reset(); 
                } else {
                    alert(`⚠️ Validación: ${datos.msg}`);
                }
            } catch (err) {
                console.error("❌ Error en la actualización:", err);
                alert(`Hubo un problema de conexión: ${err.message}`);
            }
        });
    }
});