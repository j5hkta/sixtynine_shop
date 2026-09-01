/**
 * Rutas internas que hay en más de un sitio.
 *
 * La ruta de acceso al panel aparecía escrita a mano en seis archivos: el
 * proxy, el layout del panel, el cierre de sesión y varios comentarios. Con una
 * constante, cambiarla es tocar este valor y renombrar la carpeta
 * `src/app/acceso-x69-privado`, en vez de buscar y reemplazar por todo `src/`
 * confiando en no dejarse ninguna.
 *
 * OJO: el nombre de la carpeta NO puede leerse de aquí — el enrutador de Next
 * lo saca del sistema de archivos. Los dos tienen que coincidir a mano.
 */
export const RUTA_ACCESO = "/acceso-x69-privado";
