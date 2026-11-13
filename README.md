# Suite Corporativa RedesCorp: Landing Page & App de Asistencia QR

Este espacio de trabajo contiene dos aplicaciones web completas, interactivas y funcionales:
1. **Landing Page Corporativa (`index.html`)**: Presentación institucional de soluciones en fibra óptica, redes LAN/WAN y telefonía IP con HTML5 semántico y CSS3 puro.
2. **Aplicación Web de Control de Asistencia QR (`asistencia-qr.html`)**: Sistema web interactivo para escanear, generar credenciales y gestionar asistencias mediante códigos QR en tiempo real.

---

## 🚀 Cómo Ejecutar y Probar

Puedes abrir cualquiera de los dos archivos directamente haciendo doble clic:
- **Abrir Aplicación de Asistencia QR:** Haz doble clic en [**`asistencia-qr.html`**](file:///c:/Users/HP/Downloads/PRACTICA%20DE%20MIRO/asistencia-qr.html).
- **Abrir Landing Page:** Haz doble clic en [**`index.html`**](file:///c:/Users/HP/Downloads/PRACTICA%20DE%20MIRO/index.html).

---

## 📲 Características de la Aplicación de Asistencia QR (`asistencia-qr.html`)

La aplicación permite una interacción completa tanto para el **administrador/supervisor** como para los **colaboradores/usuarios**:

### 1. 📷 Módulo de Escaneo en Vivo (Lector QR)
- **Cámara Web en Tiempo Real:** Detección automática con recuadro de enfoque y animación láser futurista.
- **Selector de Modo:** Permite alternar entre **Marcación de ENTRADA** (Check-In) y **Marcación de SALIDA** (Check-Out).
- **Simulador Interactivo Rápido (Prueba sin cámara):** Menú desplegable con colaboradores para simular el escaneo con un solo clic. Ideal para pruebas rápidas en equipos sin cámara web.
- **Subida de Archivos:** Permite cargar fotos o capturas de pantalla de códigos QR para decodificarlos.
- **Panel de Última Asistencia:** Muestra la foto, nombre, cargo, DNI, hora exacta y estado (`PUNTUAL` o `TARDANZA`).
- **Retroalimentación Sonora (Web Audio API):** Bip sintetizado de confirmación inmediata al detectar el QR (sin archivos de audio externos).

### 2. 🪪 Generador de Credenciales y Gafetes Digitales
- **Formulario Interactivo:** Permite emitir credenciales con Nombre, DNI, Departamento, Cargo y Foto/Avatar.
- **Generación Dinámica de Código QR:** Algoritmo puro en JavaScript (`js/qrcode.js`) que renderiza el QR en un elemento `<canvas>` sin depender de conexiones a internet.
- **Gafete Corporativo Estilizado:** Diseño holográfico con chip simulado, datos del empleado y código QR.
- **Acciones:**
  - ⚡ **Probar Asistencia con Este QR:** Envía el código directamente al escáner y registra la asistencia inmediatamente.
  - 📥 **Descargar QR (PNG):** Exporta el código QR generado en formato de imagen de alta resolución.
  - 🖨️ **Imprimir Credencial:** Formato listo para impresión física o PDF.

### 3. 📊 Historial, Estadísticas & Reportes
- **KPIs en Tiempo Real:** Total registrados, asistencias del día, conteo de llegadas puntuales vs tardanzas y salidas.
- **Búsqueda y Filtros en Vivo:** Filtrado por nombre, DNI o área, tipo de registro (Entrada/Salida) y estado (Puntual/Tardanza).
- **Exportación:** Botón para **Exportar a Excel / CSV** con codificación UTF-8 compatible con tildes y caracteres especiales.
- **Persistencia con `localStorage`:** Los registros y colaboradores se conservan al cerrar o recargar el navegador.

### 4. 👥 Directorio de Colaboradores de Telecomunicaciones
- Listado precargado con 6 colaboradores de la empresa (Gerente de TI, Jefa de Operaciones, Ingeniero NOC, Especialistas de Fibra y Telefonía).
- Acciones rápidas para ver el gafete de cualquier usuario o marcar su asistencia directamente.
- Botón para restablecer datos de demostración en cualquier momento.

---

## 📁 Estructura del Proyecto

```text
PRACTICA DE MIRO/
├── asistencia-qr.html    # Aplicación web completa de control de asistencia con QR
├── index.html            # Landing page institucional con enlace a la app QR
├── styles.css            # Estilos CSS3 de la landing page
├── README.md             # Documentación técnica
├── js/
│   └── qrcode.js         # Generador de códigos QR en JavaScript puro (100% offline)
└── images/
    ├── hero-datacenter.jpg
    ├── fibra-cables.jpg
    ├── fibra-optica.jpg
    ├── redes-lan-wan.jpg
    ├── telefonia-ip.jpg
    ├── avatar-gerente.jpg
    └── avatar-jefa.jpg
```
