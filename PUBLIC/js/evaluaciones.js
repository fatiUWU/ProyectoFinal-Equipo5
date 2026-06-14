document.addEventListener('DOMContentLoaded', () => {
    const gridEvaluaciones = document.getElementById('gridEvaluaciones');

    cargarEvaluaciones();

    async function cargarEvaluaciones() {
        try {
            const res = await fetch('../CONTROLADOR/PedidoC.php?accion=listar_evaluaciones');
            const datos = await res.json();

            if (datos.ok) {
                renderizarTarjetas(datos.evaluaciones);
            } else {
                gridEvaluaciones.innerHTML = `<div style="color:red; grid-column:1/-1;">Error: ${datos.msg}</div>`;
            }
        } catch (error) {
            console.error(error);
            gridEvaluaciones.innerHTML = `<div style="color:red; grid-column:1/-1;">Error de conexión con el servidor.</div>`;
        }
    }

    function renderizarTarjetas(evaluaciones) {
        gridEvaluaciones.innerHTML = '';

        if (evaluaciones.length === 0) {
            gridEvaluaciones.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#64748b; padding:40px;">Aún no hay evaluaciones registradas.</div>`;
            return;
        }

        evaluaciones.forEach(ev => {
            const comentario = ev.comentario ? `"${ev.comentario}"` : '<span style="color:#cbd5e1; font-style:italic;">Sin comentarios adicionales</span>';
            
            gridEvaluaciones.innerHTML += `
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px;">
                        <div>
                            <strong style="color: #1e293b; display: block; font-size: 15px;">${ev.nombre_cliente}</strong>
                            <span style="color: #64748b; font-size: 12px;">Folio: PED-000${ev.id_pedido}</span>
                        </div>
                        <div style="background: #f0fdf4; color: #16a34a; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; border: 1px solid #bbf7d0;">
                            <i class="fa-regular fa-calendar-check"></i> ${ev.fecha_registro.split(' ')[0]}
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; font-size: 13px;">
                            <span style="color: #475569; font-weight: 600;">⏱️ Tiempo</span>
                            <div>${dibujarEstrellas(ev.calificacion_tiempo)}</div>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 13px;">
                            <span style="color: #475569; font-weight: 600;">🤝 Servicio</span>
                            <div>${dibujarEstrellas(ev.calificacion_servicio)}</div>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 13px;">
                            <span style="color: #475569; font-weight: 600;">📦 Calidad</span>
                            <div>${dibujarEstrellas(ev.calificacion_calidad)}</div>
                        </div>
                    </div>

                    <div style="background: #f8fafc; padding: 12px; border-radius: 8px; font-size: 13px; color: #334155; line-height: 1.5;">
                        ${comentario}
                    </div>
                </div>
            `;
        });
    }

    // Función que transforma un número (1 al 5) en iconos de estrellas
    function dibujarEstrellas(calificacion) {
        let estrellas = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= calificacion) {
                estrellas += `<i class="fa-solid fa-star" style="color: #fbbf24; margin-left: 2px;"></i>`;
            } else {
                estrellas += `<i class="fa-regular fa-star" style="color: #cbd5e1; margin-left: 2px;"></i>`;
            }
        }
        return estrellas;
    }
});