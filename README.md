# 🎨 Printdala — Symmetrical 3D Print Designer

**Printdala** is a fully client-side web application for designing beautiful symmetrical mandalas in 2D and instantly previewing them in 3D. 

It is tailored specifically for **3D printing enthusiast artists**, allowing you to export your designs directly as printable **STL meshes** or multi-color **3MF assemblies**.

🔗 **Try the Live App:** `https://BrandonEkins.github.io/printala/`

---

## ✨ Features

* **Symmetrical Radial Drawing**: Draw with adjustable rotational symmetry (default 8 sectors) and reflection/mirror symmetry.
* **Multi-Layer Support**: Add multiple design layers, each with its own color, symmetry, brush size, and extrusion height.
* **Instant 3D Print Preview**: Real-time WebGL rendering representing physical filament styles (Matte PLA, Silk Gold, Translucent Cyan, Glow-in-the-Dark, Carbon Fiber).
* **3D Base Plate Generation**:
  * Circular, hexagonal, or octagonal backings.
  * **Conforming outline or conforming solid backings** (follows your drawing exactly).
  * Built-in hanging holes (positioned dynamically at any angle and distance).
* **High-Quality Export**:
  * **STL**: 3D mesh ready to drop into PrusaSlicer, Cura, or Bambu Studio.
  * **3MF**: Multi-material assembly preserving your layered color configurations.
  * **SVG**: Clean vector graphic.
* **Instant Sharing & Persistence**:
  * Generate compressed share links (`?code=...`) to load your design in anyone's browser instantly.
  * Browser-based gallery saves using `localStorage` for complete offline capability.

---

## 🚀 How to Host on GitHub Pages

1. Push this project to your public GitHub repository (`https://github.com/BrandonEkins/printala`).
2. Go to **Settings** (gear icon) in your repository menu.
3. Click on **Pages** in the left sidebar.
4. Under **Build and deployment**:
   * Set Branch to **`main`** and folder to **`/ (root)`**.
   * Click **Save**.
5. Your app will be live at `https://BrandonEkins.github.io/printala/` within a minute!

---

## 🛠️ Local Development

Printdala is a zero-dependency frontend application. You can open `index.html` directly in any web browser, or run the local Node server to enable virtual disk directory scanning for saves.

To run the local server:
```bash
# Start the web server on http://localhost:3000
node server.js
```

---

## 🖨️ 3D Printing Recommendations

* **Extrusion Height**: Keep layers between `0.5 mm` and `2.0 mm` for quick, clean relief prints.
* **Base Plate Thickness**: A base thickness of `0.8 mm` to `1.2 mm` provides a solid backing while remaining flexible and saving material.
* **First Layer Calibration**: Symmetrical lines are fine details; ensure your print bed is well-leveled and clean for solid first-layer adhesion.
* **Multi-Color (3MF)**: Load the exported `.3mf` directly into Bambu Studio or PrusaSlicer to assign separate filaments to individual drawing layers.

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
