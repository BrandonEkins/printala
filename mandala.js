// Mandala State & 2D Drawing Manager

// Moving average line smoothing helper
export function smoothPoints(pts, windowSize) {
  if (!pts || pts.length < 3 || windowSize <= 0) {
    return pts ? pts.map(p => ({ x: p.x, y: p.y })) : [];
  }
  
  const smoothed = [];
  const len = pts.length;
  
  // Keep start point
  smoothed.push({ x: pts[0].x, y: pts[0].y });
  
  for (let i = 1; i < len - 1; i++) {
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    
    for (let w = -windowSize; w <= windowSize; w++) {
      const idx = i + w;
      if (idx >= 0 && idx < len) {
        sumX += pts[idx].x;
        sumY += pts[idx].y;
        count++;
      }
    }
    smoothed.push({ x: sumX / count, y: sumY / count });
  }
  
  // Keep end point
  smoothed.push({ x: pts[len - 1].x, y: pts[len - 1].y });
  
  return smoothed;
}

export class MandalaLayer {
  constructor(id, name, symmetry = 12, brushColor = '#ec4899', brushSize = 0.5, height = 1.0) {
    this.id = id;
    this.name = name;
    this.symmetry = symmetry;
    this.mirror = true;
    this.brushColor = brushColor;
    this.brushSize = brushSize; // In mm (physical width)
    this.height = height; // In mm (physical thickness)
    this.visible = true;
    this.smoothing = 0; // Default smoothing level: 0 (Off)
    this.strokes = []; // Array of stroke objects
  }

  clone() {
    const copy = new MandalaLayer(this.id, this.name, this.symmetry, this.brushColor, this.brushSize, this.height);
    copy.mirror = this.mirror;
    copy.visible = this.visible;
    copy.smoothing = this.smoothing;
    copy.strokes = JSON.parse(JSON.stringify(this.strokes));
    return copy;
  }
}

export class Mandala {
  constructor() {
    this.layers = [];
    this.activeLayerId = null;
    this.undoStack = [];
    this.redoStack = [];
    
    // Canvas coordinate dimensions: fixed virtual resolution of 1000x1000 pixels
    this.width = 1000;
    this.height = 1000;
    this.centerX = 500;
    this.centerY = 500;
    this.maxRadius = 500; // Radius in pixels
    
    // Default layer
    this.addLayer("Main Layer");
  }

  // Add a new layer
  addLayer(name, symmetry = 12, brushColor = '#ec4899', brushSize = 0.5, height = 1.0) {
    const id = 'layer-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const newLayer = new MandalaLayer(id, name, symmetry, brushColor, brushSize, height);
    
    // Assign a color from palette if adding new layers
    if (this.layers.length > 0) {
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ffffff'];
      newLayer.brushColor = colors[this.layers.length % colors.length];
    }
    
    this.layers.push(newLayer);
    this.activeLayerId = id;
    this.saveState();
    return newLayer;
  }

  // Remove a layer
  deleteLayer(id) {
    if (this.layers.length <= 1) return false; // Keep at least one layer
    
    const index = this.layers.findIndex(l => l.id === id);
    if (index !== -1) {
      this.layers.splice(index, 1);
      if (this.activeLayerId === id) {
        // Activate another layer
        this.activeLayerId = this.layers[Math.max(0, index - 1)].id;
      }
      this.saveState();
      return true;
    }
    return false;
  }

  // Get active layer
  getActiveLayer() {
    return this.layers.find(l => l.id === this.activeLayerId) || this.layers[0];
  }

  // Set active layer
  setActiveLayer(id) {
    if (this.layers.some(l => l.id === id)) {
      this.activeLayerId = id;
    }
  }

  // Add stroke to active layer
  addStroke(stroke) {
    const activeLayer = this.getActiveLayer();
    if (activeLayer) {
      activeLayer.strokes.push(stroke);
      this.saveState();
      return true;
    }
    return false;
  }

  // Save current state for undo
  saveState() {
    // Limit stack size to 50
    if (this.undoStack.length >= 50) {
      this.undoStack.shift();
    }
    
    // Deep clone layers state
    const stateToSave = this.layers.map(layer => layer.clone());
    this.undoStack.push(stateToSave);
    
    // Clear redo stack on new action
    this.redoStack = [];
  }

  // Undo action
  undo() {
    if (this.undoStack.length > 1) {
      // Pop current state and push to redo stack
      const currentState = this.undoStack.pop();
      this.redoStack.push(currentState);
      
      // Restore previous state
      const prevState = this.undoStack[this.undoStack.length - 1];
      this.layers = prevState.map(layer => layer.clone());
      
      // Ensure activeLayerId is still valid
      if (!this.layers.some(l => l.id === this.activeLayerId)) {
        this.activeLayerId = this.layers[0].id;
      }
      return true;
    }
    return false;
  }

  // Redo action
  redo() {
    if (this.redoStack.length > 0) {
      const nextState = this.redoStack.pop();
      this.undoStack.push(nextState);
      
      this.layers = nextState.map(layer => layer.clone());
      if (!this.layers.some(l => l.id === this.activeLayerId)) {
        this.activeLayerId = this.layers[0].id;
      }
      return true;
    }
    return false;
  }

  // Reset to empty canvas on all layers
  clearAll() {
    this.layers.forEach(layer => {
      layer.strokes = [];
    });
    this.saveState();
  }

  // Clear current active layer only
  clearActiveLayer() {
    const activeLayer = this.getActiveLayer();
    if (activeLayer) {
      activeLayer.strokes = [];
      this.saveState();
    }
  }

  // Check if undo/redo is available
  canUndo() {
    return this.undoStack.length > 1;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  // Draw the guidelines (sector lines and grid) on the guide canvas
  drawGuides(canvas, showGuides, showGrid) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const activeLayer = this.getActiveLayer();
    if (!activeLayer) return;
    
    const S = activeLayer.symmetry;
    
    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    
    // Draw Concentric Grid Rings
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      
      // Draw 5 concentric rings
      for (let r = 1; r <= 5; r++) {
        const radius = (this.maxRadius / 5) * r;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Add tiny markers for pixel sizes
        if (r < 5) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.font = '10px JetBrains Mono';
          ctx.fillText(`${r * 20}%`, radius + 4, 4);
        }
      }
    }

    // Draw Radial Sector Guide Lines
    if (showGuides && S > 1) {
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.15)'; // Primary theme color, translucent
      ctx.lineWidth = 1;
      
      for (let i = 0; i < S; i++) {
        const angle = (i * Math.PI * 2) / S;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * this.maxRadius, Math.sin(angle) * this.maxRadius);
        ctx.stroke();
      }
      
      // Draw a subtle dash line highlighting the mirror axis if mirror is enabled
      if (activeLayer.mirror) {
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)'; // Cyan color
        ctx.setLineDash([4, 4]);
        
        for (let i = 0; i < S; i++) {
          // Mirror line is in the center of the sector: angle + sector_angle/2
          const angle = ((i + 0.5) * Math.PI * 2) / S;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * this.maxRadius, Math.sin(angle) * this.maxRadius);
          ctx.stroke();
        }
      }
    }
    
    ctx.restore();
  }

  // Draw all layers on the main canvas
  drawAll(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw from bottom layer to top layer
    this.layers.forEach(layer => {
      if (!layer.visible) return;
      this.drawLayer(ctx, layer);
    });
  }

  // Draw a specific layer
  drawLayer(ctx, layer) {
    const S = layer.symmetry;
    const mirror = layer.mirror;
    
    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    
    // Convert brush size in mm to pixels on canvas
    // Assume maxRadius (500px) corresponds to 50mm physical radius (100mm diameter)
    // Scale factor: 1mm = 10px. So brushSize in mm * 10 = brush size in pixels.
    const pixelBrushSize = layer.brushSize * 10;
    
    layer.strokes.forEach(stroke => {
      ctx.strokeStyle = layer.brushColor;
      ctx.fillStyle = layer.brushColor;
      ctx.lineWidth = pixelBrushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      for (let i = 0; i < S; i++) {
        const angle = (i * Math.PI * 2) / S;
        
        // 1. Draw original instance in this sector
        ctx.save();
        ctx.rotate(angle);
        this.drawStroke(ctx, stroke);
        ctx.restore();
        
        // 2. Draw mirrored instance in this sector
        if (mirror && S > 1) {
          ctx.save();
          ctx.rotate(angle);
          ctx.scale(1, -1); // Reflect vertically (across X-axis)
          this.drawStroke(ctx, stroke);
          ctx.restore();
        }
      }
    });
    
    ctx.restore();
  }

  // Draw raw stroke path relative to origin
  drawStroke(ctx, stroke) {
    ctx.beginPath();
    
    if (stroke.type === 'freehand') {
      if (stroke.points.length === 0) return;
      
      if (stroke.points.length === 1) {
        const pt = stroke.points[0];
        ctx.arc(pt.x, pt.y, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    } else if (stroke.type === 'line') {
      ctx.moveTo(stroke.x1, stroke.y1);
      ctx.lineTo(stroke.x2, stroke.y2);
      ctx.stroke();
    } else if (stroke.type === 'circle') {
      ctx.arc(stroke.cx, stroke.cy, stroke.r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (stroke.type === 'polygon') {
      const sides = stroke.sides;
      const r = stroke.r;
      const angle = stroke.angle || 0;
      
      for (let j = 0; j <= sides; j++) {
        const polyAngle = angle + (j * Math.PI * 2) / sides;
        const px = stroke.cx + Math.cos(polyAngle) * r;
        const py = stroke.cy + Math.sin(polyAngle) * r;
        if (j === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    }
  }

  // Convert current design to SVG format
  exportToSVG(overallScaleMm = 100) {
    const viewSize = 1000;
    
    // Scale factor: mapping 1000px canvas to target overall scale in mm
    // By default, 1000px matches 100mm.
    const svgScale = overallScaleMm / viewSize;
    
    let svgString = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${overallScaleMm} ${overallScaleMm}" width="${overallScaleMm}mm" height="${overallScaleMm}mm">
  <rect width="100%" height="100%" fill="#0a0f1a" />
  <g transform="translate(${overallScaleMm/2}, ${overallScaleMm/2})">
`;

    // Add layers
    this.layers.forEach((layer, lIndex) => {
      if (!layer.visible || layer.strokes.length === 0) return;
      
      const S = layer.symmetry;
      const mirror = layer.mirror;
      const strokeWidthMm = layer.brushSize;
      
      svgString += `    <!-- Layer: ${layer.name} -->\n`;
      svgString += `    <g id="layer-${lIndex}" stroke="${layer.brushColor}" stroke-width="${strokeWidthMm}" fill="none" stroke-linecap="round" stroke-linejoin="round">\n`;
      
      // Define base geometry for this layer
      svgString += `      <defs>\n`;
      svgString += `        <g id="layer-${lIndex}-base">\n`;
      
      layer.strokes.forEach((stroke, sIndex) => {
        let pathData = '';
        if (stroke.type === 'freehand') {
          if (stroke.points.length === 0) return;
          
          // Map canvas points to mm units
          pathData = `M ${stroke.points[0].x * svgScale} ${stroke.points[0].y * svgScale}`;
          for (let i = 1; i < stroke.points.length; i++) {
            pathData += ` L ${stroke.points[i].x * svgScale} ${stroke.points[i].y * svgScale}`;
          }
        } else if (stroke.type === 'line') {
          pathData = `M ${stroke.x1 * svgScale} ${stroke.y1 * svgScale} L ${stroke.x2 * svgScale} ${stroke.y2 * svgScale}`;
        } else if (stroke.type === 'circle') {
          const cx = stroke.cx * svgScale;
          const cy = stroke.cy * svgScale;
          const r = stroke.r * svgScale;
          // SVG circle as path to allow scale transform properly
          pathData = `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy}`;
        } else if (stroke.type === 'polygon') {
          const sides = stroke.sides;
          const r = stroke.r * svgScale;
          const cx = stroke.cx * svgScale;
          const cy = stroke.cy * svgScale;
          const angle = stroke.angle || 0;
          
          for (let j = 0; j <= sides; j++) {
            const polyAngle = angle + (j * Math.PI * 2) / sides;
            const px = cx + Math.cos(polyAngle) * r;
            const py = cy + Math.sin(polyAngle) * r;
            if (j === 0) {
              pathData += `M ${px} ${py}`;
            } else {
              pathData += ` L ${px} ${py}`;
            }
          }
        }
        
        if (pathData) {
          svgString += `          <path d="${pathData}" />\n`;
        }
      });
      
      svgString += `        </g>\n`;
      svgString += `      </defs>\n`;
      
      // Instantiate symmetric copies
      for (let i = 0; i < S; i++) {
        const angleDeg = (i * 360) / S;
        svgString += `      <use href="#layer-${lIndex}-base" transform="rotate(${angleDeg})" />\n`;
        
        if (mirror && S > 1) {
          svgString += `      <use href="#layer-${lIndex}-base" transform="rotate(${angleDeg}) scale(1, -1)" />\n`;
        }
      }
      
      svgString += `    </g>\n`;
    });
    
    svgString += `  </g>\n</svg>`;
    return svgString;
  }

  // Load state from imported JSON
  loadFromJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      
      // Validation check
      if (!data || !Array.isArray(data.layers)) return false;
      
      this.layers = data.layers.map(layerData => {
        const layer = new MandalaLayer(
          layerData.id || ('layer-' + Date.now() + '-' + Math.floor(Math.random() * 1000)),
          layerData.name || "Imported Layer",
          layerData.symmetry || 12,
          layerData.brushColor || "#ec4899",
          layerData.brushSize || 0.5,
          layerData.height || 1.0
        );
        layer.mirror = layerData.mirror !== undefined ? layerData.mirror : true;
        layer.visible = layerData.visible !== undefined ? layerData.visible : true;
        layer.smoothing = layerData.smoothing !== undefined ? parseInt(layerData.smoothing) : 0;
        
        // Upgrade strokes: ensure freehand strokes have rawPoints
        layer.strokes = Array.isArray(layerData.strokes) ? layerData.strokes.map(stroke => {
          if (stroke.type === 'freehand') {
            return {
              ...stroke,
              rawPoints: stroke.rawPoints || JSON.parse(JSON.stringify(stroke.points))
            };
          }
          return stroke;
        }) : [];
        
        return layer;
      });
      
      this.activeLayerId = data.activeLayerId || this.layers[0].id;
      this.undoStack = [];
      this.redoStack = [];
      this.saveState();
      
      return true;
    } catch (e) {
      console.error("Error loading project JSON:", e);
      return false;
    }
  }

  // Save state to JSON string
  exportToJSON() {
    return JSON.stringify({
      layers: this.layers,
      activeLayerId: this.activeLayerId
    }, null, 2);
  }
}
