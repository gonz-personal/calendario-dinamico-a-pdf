# Calendario Dinámico → PDF

App web para agendar eventos de un mes y exportar el calendario a PDF con un diseño profesional, tipo Google Calendar. Sin backend: todo se guarda en el navegador de cada persona que la usa (`localStorage`), así que cualquiera puede abrir el sitio y configurar su propia marca, tipos de evento y eventos sin afectar a los demás.

## Funcionalidad

- Vista de mes con navegación (anterior/siguiente, "Hoy", "Ir a mes…").
- Agregar/editar/eliminar eventos por día (fecha, tipo, hora opcional, descripción opcional).
- Tipos de evento totalmente personalizables (ícono emoji, nombre, color) — se puede crear cualquier cantidad.
- Marca configurable: nombre, subtítulo, logo (emoji o imagen) y color de acento.
- Tema claro / oscuro / según el sistema.
- Exportar el mes visible a PDF con un clic (respeta el tema activo).
- Exportar / importar un respaldo en JSON.

## Desarrollo local

Como la app usa módulos ES nativos (`<script type="module">`), necesita servirse por HTTP (no funciona abriendo `index.html` directamente con doble clic). Cualquier servidor estático sirve, por ejemplo:

```bash
cd calendario-dinamico-a-pdf
python3 -m http.server 5500
```

Luego abre `http://localhost:5500`.

## Despliegue

Es un sitio 100% estático (`index.html`, `css/`, `js/`) sin paso de build. Se puede subir tal cual a:

- **Vercel** / **Netlify**: arrastrar la carpeta o conectar el repositorio, sin configuración adicional.
- **GitHub Pages**: subir el contenido a una rama/branch y activar Pages.
- Cualquier hosting de archivos estáticos.

No requiere variables de entorno ni servidor backend.

## Notas técnicas

- El PDF se genera capturando la tarjeta del calendario con `html2canvas` y exportándola con `jsPDF` (cargados por CDN).
- Los datos (marca, tipos de evento, eventos) se guardan por navegador/dispositivo en `localStorage`, bajo la clave `calendarioDinamico:v1`. Si alguien borra el caché del navegador o cambia de dispositivo, debe usar "Exportar respaldo" desde Ajustes antes, e "Importar respaldo" después.
