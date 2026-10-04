# Simulador de Pruebas Psicofísicas y Sensoriales (Estilo INTRANT)

Herramienta web interactiva que simula las pruebas psicofísicas estandarizadas realizadas para la evaluación de conductores. Diseñada con enfoque 100% de privacidad: **completamente volátil en memoria del navegador, sin base de datos ni registro alguno.**

---

## 📋 Pruebas Implementadas (5 Intentos Cada Una)

### 1. 👁️ Agudeza Visual (Anillo Landolt)
- **Instrucción:** El usuario se tapa un ojo y observa la pantalla a ~50 cm de distancia.
- **Mecánica:** Aparece el optotipo oficial *C de Landolt* con apertura en 4 posibles orientaciones:
  - `↑ Flecha Arriba`
  - `↓ Flecha Abajo`
  - `← Flecha Izquierda`
  - `→ Flecha Derecha`
- **Dificultad progresiva:** En cada intento el anillo se reduce significativamente de tamaño (140px → 95px → 64px → 40px → 22px), simulando la escala de agudeza visual Snellen (20/100, 20/70, 20/50, 20/30 y 20/20 estándar).

### 2. 🎧 Audiometría y Localización Estéreo
- **Instrucción:** El usuario utiliza auriculares para discernir la procedencia espacial del sonido.
- **Mecánica:** A través de la **Web Audio API** con paneo estéreo real (`StereoPannerNode`):
  - `← Flecha Izquierda`: Sonido emitido por el auricular izquierdo.
  - `→ Flecha Derecha`: Sonido emitido por el auricular derecho.
  - `Espacio`: **Detección de Silencio**. El sistema emite rondas de control con volumen nulo donde el usuario debe pulsar la barra espaciadora si no escucha nada.

### 3. 🚦 Reflejo y Reacción Cromática (Semáforo)
- **Instrucción:** Evalúa el tiempo de reacción psicomotriz y la discriminación de color.
- **Mecánica:** Se proyectan círculos de colores variados en intervalos aleatorios:
  - **Color Verde (Objetivo):** Pulsar de inmediato la `Barra Espaciadora`. Mide el tiempo de reacción en milisegundos con `performance.now()`.
  - **Colores Distractores (Rojo, Amarillo, Azul):** **NO** presionar. Pulsar genera una penalización por *falsa alarma/anticipación*.
  - Finaliza al lograr **5 aciertos** al estímulo verde.

---

## 📄 Dictamen Médico Final
Al culminar las 3 pruebas, el sistema genera automáticamente:
- **Calificación global:** *Apto (Sobresaliente)*, *Apto para Conducción*, *Apto con Restricción (Requiere Lentes)* o *No Apto Temporal*.
- **Desglose clínico por prueba:** % de aciertos, escala Snellen alcanzada, lateralidad auditiva y promedio en milisegundos.
- **Tabla detallada de intentos:** Cada ronda con su estímulo presentado, respuesta del usuario y resultado.
- **Imprimir / Guardar en PDF:** Estilos `@media print` especialmente diseñados con apariencia de certificado médico oficial.
- **Nueva Evaluación:** Botón para reiniciar todo al instante sin dejar ningún rastro guardado.

---

## 🚀 Cómo Ejecutar Localmente

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build
```
Acceder a: `http://localhost:5173/`
