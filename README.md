# AltPic — Image Stylizer

AltPic ist ein browserbasiertes Tool zur künstlerischen Stilisierung von Bildern. Es nutzt die native Canvas API von JavaScript, um eine Vielzahl von Retro- und Grafik-Effekten in Echtzeit anzuwenden – von klassischem Dithering bis hin zu komplexer ASCII-Art.

![AltPic Preview Placeholder](https://via.placeholder.com/800x450?text=AltPic+Preview)

## 🚀 Features

### 🎨 Anpassungen & Farbe
- **Basics**: Helligkeit, Kontrast, Sättigung und Hue-Rotation.
- **Farb-Effekte**: Posterize, Sepia, Invertieren und konfigurierbarer Duotone-Modus.

### 🏁 Dithering (Retro-Look)
- **Algorithmen**: Floyd-Steinberg, Atkinson, Sierra, Jarvis-Judice-Ninke, Stucki sowie Ordered Dithering (Bayer 4x4, 8x8, 16x16).
- **Paletten**: Vordefinierte Paletten wie Game Boy, CGA, NES, Pico-8 und ZX Spectrum oder komplett eigene Farblisten.
- **Anpassbar**: Farbanzahl, Stärke und Blockgröße einstellbar.

### ⌨️ ASCII Art
- **Echtzeit-Konvertierung**: Wandelt Bilder direkt in Text-Art um.
- **Charsets**: Einfach, Detailliert, Blöcke (█▓▒░), Braille oder eigene Zeichenfolgen.
- **Modi**: Monochrom, Farbig (HTML/CSS) oder Custom-Farben.
- **Overlay**: Blende ASCII-Zeichen über das Originalbild ein (inkl. Edge-Detection).

### 🔘 Dot Matrix & Retro
- **Dot Matrix**: Simuliert Druck- oder Display-Raster mit verschiedenen Formen (Kreis, Quadrat, Raute, Ring, Kreuz).
- **Pixel / Retro**: Pixelate-Effekt, Scanlines, Halftone (Rasterdruck) und Glitch-Effekte.

### 💾 Export
- **PNG**: Speichert das bearbeitete Bild oder die gerenderte ASCII-Art als Bilddatei.
- **TXT**: Exportiert ASCII-Art als reine Textdatei.

## 🛠 Tech-Stack

- **Vanilla JavaScript**: Keine Frameworks oder Bibliotheken (außer nativer Canvas API).
- **CSS3**: Modernes Dark-Theme mit Flexbox/Grid-Layout.
- **HTML5**: Drag & Drop Integration für Bild-Uploads.

## 🏃 Schnellstart

1. Klone das Repository oder lade die Dateien herunter.
2. Öffne die `index.html` direkt in einem modernen Browser (Chrome, Firefox, Edge, Safari).
3. Ziehe ein Bild in das Fenster oder nutze den "Bild laden"-Button.
4. Experimentiere mit den Reglern in der Sidebar.

## 📂 Projektstruktur

```text
altpic/
├── index.html          # UI-Struktur & Sidebar
├── css/
│   └── style.css       # Styling & Dark Theme
├── js/
│   ├── effects.js      # Die "Engine" (Pixel-Manipulation & Algorithmen)
│   └── app.js          # App-Logik, Event-Handling & Canvas-Management
└── PROJECT_MAP.md      # Interne Dokumentation der Features
```
