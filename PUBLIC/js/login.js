document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('#loginForm');
    const togglePassword = document.querySelector('#togglePassword');
    const passwordInput = document.querySelector('#log_contra'); 
    
    // Elementos para el "Recuérdame"
    const emailInput = document.getElementById('log_correo');
    const rememberCheckbox = document.getElementById('remember');

    // =========================================================================
    // 1. CARGA INICIAL DEL "RECUÉRDAME"
    // =========================================================================
    // Si hay un correo guardado en el navegador de visitas anteriores, lo ponemos
    const savedEmail = localStorage.getItem('ecologistica_remembered_email');
    if (savedEmail) {
        emailInput.value = savedEmail;
        rememberCheckbox.checked = true;
    }

    // =========================================================================
    // 2. MOSTRAR / OCULTAR CONTRASEÑA (EL OJITO)
    // =========================================================================
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Cambiamos las clases del icono para que se tache o se destache
            togglePassword.classList.toggle('fa-eye');
            togglePassword.classList.toggle('fa-eye-slash');
        });
    }

    // =========================================================================
    // 3. PROCESAR INICIO DE SESIÓN
    // =========================================================================
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const correo = emailInput.value.trim();
            const contra = passwordInput.value;

            // Cambiamos el texto del botón para que se vea que está cargando
            const btnSubmit = loginForm.querySelector('.btn-submit');
            const textoOriginal = btnSubmit.innerHTML;
            btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Entrando...';
            btnSubmit.disabled = true;

            try {
                const res = await fetch('../CONTROLADOR/LoginC.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ correo, contra })
                });

                const datos = await res.json();

                if (datos.ok) {
                    
                    // --- LÓGICA DE GUARDADO "RECUÉRDAME" ---
                    // Si inició sesión con éxito y la casilla está marcada, guardamos el correo.
                    if (rememberCheckbox.checked) {
                        localStorage.setItem('ecologistica_remembered_email', correo);
                    } else {
                        // Si la desmarcó, borramos el rastro por privacidad.
                        localStorage.removeItem('ecologistica_remembered_email');
                    }

                    alert(`👋 ¡Bienvenido(a)! ${datos.msg}`);
                    
                    // REDIRECCIÓN DINÁMICA AUTOMÁTICA
                    window.location.href = datos.url; 
                } else {
                    alert(`⚠️ Error: ${datos.msg}`);
                    btnSubmit.innerHTML = textoOriginal;
                    btnSubmit.disabled = false;
                }
            } catch (err) {
                console.error("Error en el inicio de sesión:", err);
                alert("Hubo un problema de conexión al intentar iniciar sesión.");
                btnSubmit.innerHTML = textoOriginal;
                btnSubmit.disabled = false;
            }
        });
    }
});