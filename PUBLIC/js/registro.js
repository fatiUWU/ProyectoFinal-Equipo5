// PUBLIC/js/registro.js

document.addEventListener('DOMContentLoaded', () => {
    const formRegistro = document.getElementById('formRegistro');

    if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nombreInput = document.getElementById('reg_nombre');
            const correoInput = document.getElementById('reg_correo');
            const contraInput = document.getElementById('reg_contra');

            if (!nombreInput || !correoInput || !contraInput) {
                alert("❌ Error interno: No se encontraron los elementos del formulario en la interfaz.");
                return;
            }

            const nombre = nombreInput.value.trim();
            const correo = correoInput.value.trim();
            const contra = contraInput.value;

            if (nombre === "" || correo === "" || contra === "") {
                alert("⚠️ Por favor, rellena todos los campos obligatorios.");
                return;
            }

            if (contra.length < 6) {
                alert("⚠️ La contraseña debe contener al menos 6 caracteres.");
                return;
            }

            try {
                // ENLACE DIRIGIDO: Apuntamos directamente a la acción configurada en PHP
                const res = await fetch('../CONTROLADOR/UsuC.php?accion=registrar_cliente', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ nombre, correo, contra })
                });

                if (!res.ok) {
                    throw new Error(`Error en el servidor (Estatus: ${res.status}).`);
                }

                const respuestaTexto = await res.text();
                
                let datos;
                try {
                    datos = JSON.parse(respuestaTexto);
                } catch (jsonError) {
                    console.error("Respuesta inesperada del servidor:", respuestaTexto);
                    throw new Error("El servidor devolvió un vacío o un error de código.");
                }

                if (datos.ok) {
                    // Alerta nativa de éxito
                    alert(`🎉 ¡Excelente! ${datos.msg}`);
                    formRegistro.reset();
                    // Redirección directa a la pantalla de login en la misma carpeta
                    window.location.href = "login.html"; 
                } else {
                    alert(`⚠️ Validación del sistema: ${datos.msg}`);
                }

            } catch (err) {
                console.error("Detalle del error:", err);
                alert(`❌ Falla en el registro: ${err.message}`);
            }
        });
    }
});