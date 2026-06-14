document.addEventListener('DOMContentLoaded', () => {
    
    const formSolicitar = document.getElementById('formSolicitarRecuperacion');
    const formRestablecer = document.getElementById('formRestablecerContra');
    const msgAlerta = document.getElementById('msgAlerta');

    function mostrarMensaje(texto, esError) {
        if (!msgAlerta) return;
        msgAlerta.style.display = 'block';
        msgAlerta.style.color = esError ? '#ef4444' : '#10b981';
        msgAlerta.innerHTML = texto;
    }

    // --- PANTALLA 1: SOLICITAR RECUPERACIÓN ---
    if (formSolicitar) {
        formSolicitar.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnRecuperar');
            const correo = document.getElementById('txtCorreoRecuperar').value.trim();

            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Validando cuenta...';

            try {
                const res = await fetch('../CONTROLADOR/RecuperarC.php?accion=solicitar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ correo })
                });

                const datos = await res.json();
                
                // NUEVA LÓGICA: Si el servidor activa la redirección automática (Modo Demo)
                if (datos.redirect && datos.token) {
                    mostrarMensaje(datos.msg, false);
                    // Esperamos 2 segundos para que el usuario lea el mensaje y lo redirigimos
                    setTimeout(() => {
                        window.location.href = `restablecer.html?token=${datos.token}`;
                    }, 2000);
                } else {
                    // Lógica normal
                    mostrarMensaje(datos.msg, !datos.ok);
                    if (datos.ok) formSolicitar.reset();
                    
                    btn.disabled = false;
                    btn.innerHTML = 'Enviar Enlace de Recuperación';
                }

            } catch (err) {
                mostrarMensaje("Error de conexión con el servidor.", true);
                btn.disabled = false;
                btn.innerHTML = 'Enviar Enlace de Recuperación';
            }
        });
    }

    // --- PANTALLA 2: RESTABLECER CONTRASEÑA ---
    if (formRestablecer) {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        if (!token) {
            mostrarMensaje("Enlace inválido o incompleto. Vuelve a solicitar la recuperación.", true);
            formRestablecer.querySelector('button').disabled = true;
        } else {
            document.getElementById('txtTokenUrl').value = token;
        }

        formRestablecer.addEventListener('submit', async (e) => {
            e.preventDefault();
            const tokenOculto = document.getElementById('txtTokenUrl').value;
            const nueva = document.getElementById('txtNuevaPass').value;
            const confirmar = document.getElementById('txtConfirmarPass').value;

            if (nueva !== confirmar) {
                mostrarMensaje("Las contraseñas no coinciden.", true);
                return;
            }
            if (nueva.length < 6) {
                mostrarMensaje("La contraseña es muy corta (mínimo 6 caracteres).", true);
                return;
            }

            try {
                const res = await fetch('../CONTROLADOR/RecuperarC.php?accion=restablecer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: tokenOculto, nueva_contra: nueva })
                });

                const datos = await res.json();
                if (datos.ok) {
                    mostrarMensaje("¡Contraseña actualizada! Redirigiendo al inicio de sesión...", false);
                    setTimeout(() => window.location.href = 'login.html', 2000);
                } else {
                    mostrarMensaje(datos.msg, true);
                }
            } catch (err) {
                mostrarMensaje("Error de conexión.", true);
            }
        });
    }
});