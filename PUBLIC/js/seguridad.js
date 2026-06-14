// ==============================================================
// 0. APAGÓN INMEDIATO (Evita el parpadeo de información)
// ==============================================================
// Ocultamos todo el documento HTML antes de que el navegador lo dibuje
document.documentElement.style.display = 'none';

// ==============================================================
// 1. BARRERA DE SEGURIDAD: VERIFICAR SESIÓN ACTIVA (URL DIRECTA)
// ==============================================================
async function verificarAccesoAutorizado() {
    try {
        const res = await fetch('../CONTROLADOR/VerificarSesionC.php');
        const datos = await res.json();

        if (!datos.ok) {
            // Si el servidor dice que NO hay sesión, lo expulsamos inmediatamente al login.
            window.location.replace('login.html'); 
        } else {
            // Si la sesión ES VÁLIDA, volvemos a hacer visible la página
            document.documentElement.style.display = '';
        }
    } catch (err) {
        // Si hay error de red o de archivo, por seguridad también lo expulsamos
        console.error("Error de seguridad:", err);
        window.location.replace('login.html');
    }
}

// Ejecutamos la barrera tan pronto como se lea este archivo
verificarAccesoAutorizado();

// ==============================================================
// 2. CIERRE DE SESIÓN POR INACTIVIDAD (15 MINUTOS) - INTACTO
// ==============================================================
let tiempoInactividad;
const LIMITE_INACTIVIDAD = 900000; // 15 minutos en milisegundos

function reiniciarTiempo() {
    clearTimeout(tiempoInactividad);
    tiempoInactividad = setTimeout(cerrarSesionPorInactividad, LIMITE_INACTIVIDAD);
}

function cerrarSesionPorInactividad() {
    alert("⏳ Tu sesión ha expirado por inactividad (15 minutos). Por seguridad, serás redirigido al inicio de sesión.");
    window.location.replace('login.html'); 
}

// Escuchamos los movimientos del usuario una vez que la página cargó
window.onload = reiniciarTiempo;
document.onmousemove = reiniciarTiempo;
document.onkeydown = reiniciarTiempo;
document.ontouchstart = reiniciarTiempo; // Para celulares
document.onclick = reiniciarTiempo;
document.onscroll = reiniciarTiempo;