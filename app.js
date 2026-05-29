// Mandala Application Orchestrator

import { Mandala, smoothPoints } from './mandala.js';
import { Preview3D } from './preview3d.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Core State
  const mandala = new Mandala();
  const preview3D = new Preview3D('3d-container');
  
  let currentTool = 'freehand'; // 'freehand', 'line', 'circle', 'polygon'
  let isDrawing = false;
  let startX = 0;
  let startY = 0;
  let currentStroke = null;
  let zoomFactor = 1.0;
  
  // HTML elements
  const drawingCanvas = document.getElementById('drawing-canvas');
  const guideCanvas = document.getElementById('guide-canvas');
  const canvasZoomWrapper = document.getElementById('canvas-zoom-wrapper');
  
  // Set drawing resolutions
  drawingCanvas.width = 1000;
  drawingCanvas.height = 1000;
  guideCanvas.width = 1000;
  guideCanvas.height = 1000;
  
  // UI Controls
  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');
  const btnClear = document.getElementById('btn-clear');
  const btnImportJSON = document.getElementById('btn-import');
  const btnExportJSON = document.getElementById('btn-export-json');
  const fileImportInput = document.getElementById('import-file');
  
  // Zoom Controls
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnZoomReset = document.getElementById('btn-zoom-reset');
  const txtZoomVal = document.getElementById('zoom-value');
  
  // Tool Controls
  const toolFreehand = document.getElementById('tool-freehand');
  const toolLine = document.getElementById('tool-line');
  const toolCircle = document.getElementById('tool-circle');
  const toolPolygon = document.getElementById('tool-polygon');
  const sidesSettingContainer = document.querySelector('.poly-sides-setting');
  const inputSides = document.getElementById('poly-sides');
  
  // SVG Import Controls
  const btnImportSVG = document.getElementById('btn-import-svg');
  const fileImportSVG = document.getElementById('import-svg-file');
  
  // 3D Preview Actions
  const btnResetCamera = document.getElementById('btn-reset-camera');
  const chkAutoRotate = document.getElementById('chk-auto-rotate');
  
  // Sidebar Tabs
  const tabLayers = document.getElementById('tab-layers');
  const tab3D = document.getElementById('tab-3d');
  const paneLayers = document.getElementById('tab-content-layers');
  const pane3D = document.getElementById('tab-content-3d');
  
  // Active Layer Details panel
  const layerSymmetrySlider = document.getElementById('layer-symmetry');
  const valLayerSymmetry = document.getElementById('val-layer-symmetry');
  const layerMirrorCheckbox = document.getElementById('layer-mirror');
  const layerBrushSlider = document.getElementById('layer-brush-size');
  const valLayerBrush = document.getElementById('val-layer-brush-size');
  const layerHeightSlider = document.getElementById('layer-height');
  const valLayerHeight = document.getElementById('val-layer-height');
  const layerSmoothingSlider = document.getElementById('layer-smoothing');
  const valLayerSmoothing = document.getElementById('val-layer-smoothing');
  const customColorPicker = document.getElementById('layer-color');
  const colorSwatches = document.querySelectorAll('.color-swatch');
  
  // Layer list
  const btnAddLayer = document.getElementById('btn-add-layer');
  const layersContainer = document.getElementById('layers-container');
  
  // Helpers
  const chkShowGuides = document.getElementById('chk-show-guides');
  const chkShowGrid = document.getElementById('chk-show-grid');
  
  // 3D Settings
  const selectBaseType = document.getElementById('base-type');
  const baseThicknessSlider = document.getElementById('base-thickness');
  const valBaseThickness = document.getElementById('val-base-thickness');
  const baseBorderSlider = document.getElementById('base-border');
  const valBaseBorder = document.getElementById('val-base-border');
  const baseRadiusSlider = document.getElementById('base-radius');
  const valBaseRadius = document.getElementById('val-base-radius');
  const chkAutoBaseRadius = document.getElementById('chk-auto-base-radius');
  const chkBaseHole = document.getElementById('chk-base-hole');
  const baseHoleSizeSlider = document.getElementById('base-hole-size');
  const valBaseHoleSize = document.getElementById('val-base-hole-size');
  const baseHoleDistanceSlider = document.getElementById('base-hole-distance');
  const valBaseHoleDistance = document.getElementById('val-base-hole-distance');
  const baseHoleAngleSlider = document.getElementById('base-hole-angle');
  const valBaseHoleAngle = document.getElementById('val-base-hole-angle');
  const selectMaterial = document.getElementById('render-material');
  const chkShowBed = document.getElementById('chk-show-bed');
  const scaleSlider = document.getElementById('mandala-scale');
  const valScale = document.getElementById('val-mandala-scale');
  
  // Exports
  const btnExportSVG = document.getElementById('btn-export-svg');
  const btnExportSTL = document.getElementById('btn-export-stl');
  const btnExportOBJ = document.getElementById('btn-export-obj');
  
  const loadingOverlay = document.getElementById('loading-overlay');

  // --- Initializers ---
  function init() {
    setupDrawingEvents();
    setupUIControls();
    updateLayerListUI();
    syncSlidersWithActiveLayer();
    drawAll();
    update3DPreview();
  }

  // --- Drawing Event Listeners ---
  function setupDrawingEvents() {
    drawingCanvas.addEventListener('pointerdown', handlePointerDown);
    drawingCanvas.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }

  // Translate client pixel coordinates to canvas coordinate system (-500 to 500)
  function getCanvasCoords(event) {
    const rect = drawingCanvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Scale from actual viewport layout dimensions to 1000x1000 coordinate space
    const canvasX = (mouseX / rect.width) * 1000;
    const canvasY = (mouseY / rect.height) * 1000;
    
    // Center origin (0,0)
    return {
      x: canvasX - 500,
      y: canvasY - 500
    };
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return; // Only left click / main pointer touch
    
    event.preventDefault();
    drawingCanvas.setPointerCapture(event.pointerId);
    
    const coords = getCanvasCoords(event);
    startX = coords.x;
    startY = coords.y;
    isDrawing = true;
    
    if (currentTool === 'freehand') {
      currentStroke = {
        type: 'freehand',
        points: [{ x: startX, y: startY }],
        rawPoints: [{ x: startX, y: startY }]
      };
    }
  }

  function handlePointerMove(event) {
    if (!isDrawing) return;
    
    const coords = getCanvasCoords(event);
    const curX = coords.x;
    const curY = coords.y;
    
    if (currentTool === 'freehand') {
      currentStroke.rawPoints.push({ x: curX, y: curY });
      const activeLayer = mandala.getActiveLayer();
      const smoothing = activeLayer ? activeLayer.smoothing : 0;
      currentStroke.points = smoothPoints(currentStroke.rawPoints, smoothing);
      drawAll();
      drawTemporaryStroke();
    } else if (currentTool === 'line') {
      currentStroke = {
        type: 'line',
        x1: startX,
        y1: startY,
        x2: curX,
        y2: curY
      };
      drawAll();
      drawTemporaryStroke();
    } else if (currentTool === 'circle') {
      const r = Math.sqrt((curX - startX) ** 2 + (curY - startY) ** 2);
      currentStroke = {
        type: 'circle',
        cx: startX,
        cy: startY,
        r: r
      };
      drawAll();
      drawTemporaryStroke();
    } else if (currentTool === 'polygon') {
      const r = Math.sqrt((curX - startX) ** 2 + (curY - startY) ** 2);
      const angle = Math.atan2(curY - startY, curX - startX);
      const sides = parseInt(inputSides.value) || 5;
      currentStroke = {
        type: 'polygon',
        cx: startX,
        cy: startY,
        r: r,
        sides: sides,
        angle: angle
      };
      drawAll();
      drawTemporaryStroke();
    }
  }

  function handlePointerUp(event) {
    if (!isDrawing) return;
    isDrawing = false;
    
    try {
      drawingCanvas.releasePointerCapture(event.pointerId);
    } catch (e) {}

    if (currentStroke) {
      // Validate stroke before adding
      let isValid = true;
      if (currentStroke.type === 'freehand' && currentStroke.points.length < 2) {
        isValid = false;
      } else if (currentStroke.type === 'circle' && currentStroke.r < 1) {
        isValid = false;
      } else if (currentStroke.type === 'polygon' && currentStroke.r < 1) {
        isValid = false;
      }
      
      if (isValid) {
        mandala.addStroke(currentStroke);
        updateUndoRedoButtons();
        update3DPreview();
      }
      currentStroke = null;
    }
    
    drawAll();
  }

  // Draw the current in-progress drawing shape
  function drawTemporaryStroke() {
    if (!currentStroke) return;
    
    const ctx = drawingCanvas.getContext('2d');
    const activeLayer = mandala.getActiveLayer();
    if (!activeLayer) return;
    
    ctx.save();
    ctx.translate(500, 500); // Translate to center
    
    const S = activeLayer.symmetry;
    const mirror = activeLayer.mirror;
    const pixelBrushSize = activeLayer.brushSize * 10;
    
    ctx.strokeStyle = activeLayer.brushColor;
    ctx.fillStyle = activeLayer.brushColor;
    ctx.lineWidth = pixelBrushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    for (let i = 0; i < S; i++) {
      const angle = (i * Math.PI * 2) / S;
      
      // Original orientation
      ctx.save();
      ctx.rotate(angle);
      mandala.drawStroke(ctx, currentStroke);
      ctx.restore();
      
      // Mirrored orientation
      if (mirror && S > 1) {
        ctx.save();
        ctx.rotate(angle);
        ctx.scale(1, -1);
        mandala.drawStroke(ctx, currentStroke);
        ctx.restore();
      }
    }
    
    ctx.restore();
  }

  // Re-render guidelines and drawn strokes
  function drawAll() {
    mandala.drawGuides(guideCanvas, chkShowGuides.checked, chkShowGrid.checked);
    mandala.drawAll(drawingCanvas);
  }

  // Helper to compute max drawn radius in mm
  function calculateMaxDrawnRadius() {
    let maxRadiusPixels = 0;
    
    mandala.layers.forEach(layer => {
      layer.strokes.forEach(stroke => {
        if (stroke.type === 'freehand') {
          stroke.points.forEach(pt => {
            const dist = Math.sqrt(pt.x * pt.x + pt.y * pt.y);
            if (dist > maxRadiusPixels) maxRadiusPixels = dist;
          });
        } else if (stroke.type === 'line') {
          const d1 = Math.sqrt(stroke.x1 * stroke.x1 + stroke.y1 * stroke.y1);
          const d2 = Math.sqrt(stroke.x2 * stroke.x2 + stroke.y2 * stroke.y2);
          maxRadiusPixels = Math.max(maxRadiusPixels, d1, d2);
        } else if (stroke.type === 'circle') {
          const distCenter = Math.sqrt(stroke.cx * stroke.cx + stroke.cy * stroke.cy);
          const maxDist = distCenter + stroke.r;
          if (maxDist > maxRadiusPixels) maxRadiusPixels = maxDist;
        } else if (stroke.type === 'polygon') {
          const distCenter = Math.sqrt(stroke.cx * stroke.cx + stroke.cy * stroke.cy);
          const maxDist = distCenter + stroke.r;
          if (maxDist > maxRadiusPixels) maxRadiusPixels = maxDist;
        }
      });
    });
    
    const overallScale = parseInt(scaleSlider.value);
    const scaleFactor = overallScale / 1000;
    
    return maxRadiusPixels * scaleFactor;
  }

  // Update 3D Three.js preview
  function update3DPreview() {
    showLoader(true);
    
    // Yield execution slightly to allow spinner to draw
    setTimeout(() => {
      const overallScale = parseInt(scaleSlider.value);
      const baseType = selectBaseType.value;
      const borderOffset = parseFloat(baseBorderSlider.value);
      
      // Allow base radius up to 300mm
      baseRadiusSlider.max = 300;
      
      // UI feedback: disable/dim controls based on shape
      const radiusCard = document.querySelector('.radius-control-card');
      const basePlateControls = document.querySelectorAll('.base-plate-control');
      
      const isSolidBase = (baseType !== 'none' && baseType !== 'conforming-outline');
      const baseHoleControl = document.querySelector('.base-hole-control');
      const baseHoleDetails = document.querySelectorAll('.base-hole-details');

      if (baseType === 'none') {
        basePlateControls.forEach(ctrl => {
          ctrl.style.opacity = '0.3';
          ctrl.style.pointerEvents = 'none';
        });
        if (baseHoleControl) baseHoleControl.style.display = 'none';
        baseHoleDetails.forEach(ctrl => ctrl.style.display = 'none');
      } else {
        basePlateControls.forEach(ctrl => {
          ctrl.style.opacity = '1';
          ctrl.style.pointerEvents = 'auto';
        });
        
        // If conforming, base radius is not used - dim it
        if (baseType.startsWith('conforming') && radiusCard) {
          radiusCard.style.opacity = '0.3';
          radiusCard.style.pointerEvents = 'none';
        }

        // Hanging Hole options visibility toggle
        if (isSolidBase) {
          if (baseHoleControl) baseHoleControl.style.display = 'block';
          const isHoleEnabled = chkBaseHole && chkBaseHole.checked;
          baseHoleDetails.forEach(ctrl => {
            ctrl.style.display = isHoleEnabled ? 'block' : 'none';
          });
        } else {
          if (baseHoleControl) baseHoleControl.style.display = 'none';
          baseHoleDetails.forEach(ctrl => ctrl.style.display = 'none');
        }
      }
      
      if (chkAutoBaseRadius && chkAutoBaseRadius.checked && !baseType.startsWith('conforming')) {
        const maxDrawnRadius = calculateMaxDrawnRadius();
        
        let calculatedRadius;
        if (maxDrawnRadius > 0) {
          // Pad by custom border offset and round up to keep plate boundary slightly wider than drawings
          calculatedRadius = Math.max(10, Math.ceil(maxDrawnRadius + borderOffset));
        } else {
          // Safe default if drawing is empty (45% of overall scale radius)
          calculatedRadius = Math.max(10, Math.round(overallScale * 0.45));
        }
        
        console.log(`Auto-Scale: maxDrawnRadius = ${maxDrawnRadius.toFixed(2)} mm, setting base radius = ${calculatedRadius} mm`);
        
        baseRadiusSlider.value = calculatedRadius;
        valBaseRadius.textContent = calculatedRadius.toFixed(1) + ' mm';
      }
      
      const basePlate = {
        type: baseType,
        thickness: parseFloat(baseThicknessSlider.value),
        radius: parseFloat(baseRadiusSlider.value),
        border: borderOffset,
        addHole: isSolidBase && chkBaseHole && chkBaseHole.checked,
        holeSize: chkBaseHole ? parseFloat(baseHoleSizeSlider.value) : 0,
        holeDistance: chkBaseHole ? parseFloat(baseHoleDistanceSlider.value) : 0,
        holeAngle: chkBaseHole ? parseFloat(baseHoleAngleSlider.value) : 90
      };
      
      preview3D.updateModel(mandala, basePlate, overallScale);
      showLoader(false);
    }, 30);
  }

  function showLoader(visible) {
    if (visible) {
      loadingOverlay.classList.add('active');
    } else {
      loadingOverlay.classList.remove('active');
    }
  }

  // --- UI Controls Event Binding ---
  function setupUIControls() {
    // Undo / Redo / Clear
    btnUndo.addEventListener('click', () => {
      if (mandala.undo()) {
        drawAll();
        updateUndoRedoButtons();
        update3DPreview();
      }
    });
    
    btnRedo.addEventListener('click', () => {
      if (mandala.redo()) {
        drawAll();
        updateUndoRedoButtons();
        update3DPreview();
      }
    });
    
    btnClear.addEventListener('click', () => {
      if (confirm('Clear all strokes on the active layer?')) {
        mandala.clearActiveLayer();
        drawAll();
        updateUndoRedoButtons();
        update3DPreview();
      }
    });
    
    // File Imports / Exports
    btnExportJSON.addEventListener('click', () => {
      const json = mandala.exportToJSON();
      downloadFile(json, 'mendala_project.json', 'application/json');
    });

    btnImportJSON.addEventListener('click', () => {
      fileImportInput.click();
    });
    
    fileImportInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const success = mandala.loadFromJSON(event.target.result);
        if (success) {
          updateLayerListUI();
          syncSlidersWithActiveLayer();
          drawAll();
          update3DPreview();
          updateUndoRedoButtons();
        } else {
          alert('Failed to parse Mendala project file.');
        }
      };
      reader.readAsText(file);
      fileImportInput.value = ''; // Reset
    });

    // SVG Import Button
    btnImportSVG.addEventListener('click', () => {
      fileImportSVG.click();
    });

    fileImportSVG.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const success = importSVGData(event.target.result);
        if (success) {
          drawAll();
          update3DPreview();
          updateUndoRedoButtons();
        }
      };
      reader.readAsText(file);
      fileImportSVG.value = ''; // Reset
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        btnUndo.click();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        btnRedo.click();
      }
    });

    // Zoom buttons
    btnZoomIn.addEventListener('click', () => adjustZoom(0.1));
    btnZoomOut.addEventListener('click', () => adjustZoom(-0.1));
    btnZoomReset.addEventListener('click', () => resetZoom());

    // Tools toggle
    const tools = [
      { btn: toolFreehand, type: 'freehand' },
      { btn: toolLine, type: 'line' },
      { btn: toolCircle, type: 'circle' },
      { btn: toolPolygon, type: 'polygon' }
    ];
    
    tools.forEach(tool => {
      tool.btn.addEventListener('click', () => {
        tools.forEach(t => t.btn.classList.remove('active'));
        tool.btn.classList.add('active');
        currentTool = tool.type;
        
        // Show/hide regular polygon sides settings input
        if (currentTool === 'polygon') {
          sidesSettingContainer.style.display = 'flex';
        } else {
          sidesSettingContainer.style.display = 'none';
        }
      });
    });

    // Guide switches
    chkShowGuides.addEventListener('change', () => drawAll());
    chkShowGrid.addEventListener('change', () => drawAll());

    // Sidebar Tab Switching
    tabLayers.addEventListener('click', () => {
      tabLayers.classList.add('active');
      tab3D.classList.remove('active');
      paneLayers.classList.add('active');
      pane3D.classList.remove('active');
    });
    
    tab3D.addEventListener('click', () => {
      tab3D.classList.add('active');
      tabLayers.classList.remove('active');
      pane3D.classList.add('active');
      paneLayers.classList.remove('active');
    });

    // Layer Sliders Binding
    layerSymmetrySlider.addEventListener('input', (e) => {
      const activeLayer = mandala.getActiveLayer();
      if (activeLayer) {
        activeLayer.symmetry = parseInt(e.target.value);
        valLayerSymmetry.textContent = activeLayer.symmetry;
        drawAll();
        updateLayerListUI();
        update3DPreview();
      }
    });

    layerMirrorCheckbox.addEventListener('change', (e) => {
      const activeLayer = mandala.getActiveLayer();
      if (activeLayer) {
        activeLayer.mirror = e.target.checked;
        drawAll();
        update3DPreview();
      }
    });

    layerBrushSlider.addEventListener('input', (e) => {
      const activeLayer = mandala.getActiveLayer();
      if (activeLayer) {
        activeLayer.brushSize = parseFloat(e.target.value);
        valLayerBrush.textContent = activeLayer.brushSize.toFixed(1) + ' mm';
        drawAll();
        update3DPreview();
      }
    });

    layerHeightSlider.addEventListener('input', (e) => {
      const activeLayer = mandala.getActiveLayer();
      if (activeLayer) {
        activeLayer.height = parseFloat(e.target.value);
        valLayerHeight.textContent = activeLayer.height.toFixed(1) + ' mm';
        update3DPreview();
      }
    });

    layerSmoothingSlider.addEventListener('input', (e) => {
      const activeLayer = mandala.getActiveLayer();
      if (activeLayer) {
        activeLayer.smoothing = parseInt(e.target.value);
        valLayerSmoothing.textContent = activeLayer.smoothing === 0 ? 'Off' : `Level ${activeLayer.smoothing}`;
        
        // Recalculate points of all freehand strokes in the layer using the raw points
        activeLayer.strokes.forEach(stroke => {
          if (stroke.type === 'freehand') {
            if (!stroke.rawPoints) {
              stroke.rawPoints = JSON.parse(JSON.stringify(stroke.points));
            }
            stroke.points = smoothPoints(stroke.rawPoints, activeLayer.smoothing);
          }
        });
        
        drawAll();
        update3DPreview();
      }
    });

    // Add Layer Button
    btnAddLayer.addEventListener('click', () => {
      const numLayers = mandala.layers.length;
      mandala.addLayer(`Layer ${numLayers + 1}`);
      updateLayerListUI();
      syncSlidersWithActiveLayer();
      drawAll();
      update3DPreview();
      updateUndoRedoButtons();
    });

    // Swatches and custom color picker selection
    colorSwatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        colorSwatches.forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        const color = swatch.getAttribute('data-color');
        
        const activeLayer = mandala.getActiveLayer();
        if (activeLayer) {
          activeLayer.brushColor = color;
          customColorPicker.value = color;
          drawAll();
          updateLayerListUI();
          update3DPreview();
        }
      });
    });

    customColorPicker.addEventListener('input', (e) => {
      // Deactivate all predefined swatches
      colorSwatches.forEach(s => s.classList.remove('active'));
      const activeLayer = mandala.getActiveLayer();
      if (activeLayer) {
        activeLayer.brushColor = e.target.value;
        drawAll();
        updateLayerListUI();
        update3DPreview();
      }
    });

    // 3D settings binding
    btnResetCamera.addEventListener('click', () => preview3D.resetView());
    
    chkAutoRotate.addEventListener('change', (e) => {
      preview3D.isAutoRotating = e.target.checked;
    });

    selectBaseType.addEventListener('change', () => {
      update3DPreview();
    });

    baseThicknessSlider.addEventListener('input', (e) => {
      valBaseThickness.textContent = parseFloat(e.target.value).toFixed(1) + ' mm';
      update3DPreview();
    });

    baseBorderSlider.addEventListener('input', (e) => {
      valBaseBorder.textContent = parseFloat(e.target.value).toFixed(1) + ' mm';
      update3DPreview();
    });

    baseRadiusSlider.addEventListener('input', (e) => {
      if (chkAutoBaseRadius) chkAutoBaseRadius.checked = false;
      valBaseRadius.textContent = parseFloat(e.target.value).toFixed(1) + ' mm';
      update3DPreview();
    });

    if (chkAutoBaseRadius) {
      chkAutoBaseRadius.addEventListener('change', () => {
        update3DPreview();
      });
    }

    if (chkBaseHole) {
      chkBaseHole.addEventListener('change', () => {
        update3DPreview();
      });
    }

    if (baseHoleSizeSlider) {
      baseHoleSizeSlider.addEventListener('input', (e) => {
        valBaseHoleSize.textContent = parseFloat(e.target.value).toFixed(1) + ' mm';
        update3DPreview();
      });
    }

    if (baseHoleDistanceSlider) {
      baseHoleDistanceSlider.addEventListener('input', (e) => {
        valBaseHoleDistance.textContent = parseFloat(e.target.value).toFixed(1) + ' mm';
        update3DPreview();
      });
    }

    if (baseHoleAngleSlider) {
      baseHoleAngleSlider.addEventListener('input', (e) => {
        valBaseHoleAngle.textContent = e.target.value + '°';
        update3DPreview();
      });
    }

    selectMaterial.addEventListener('change', (e) => {
      preview3D.setMaterial(e.target.value);
    });

    chkShowBed.addEventListener('change', (e) => {
      preview3D.togglePrintBed(e.target.checked);
    });

    scaleSlider.addEventListener('input', (e) => {
      valScale.textContent = e.target.value + ' mm';
      update3DPreview();
    });

    // Exports
    btnExportSVG.addEventListener('click', () => {
      const overallScale = parseInt(scaleSlider.value);
      const svg = mandala.exportToSVG(overallScale);
      downloadFile(svg, 'mendala_design.svg', 'image/svg+xml');
    });

    btnExportSTL.addEventListener('click', () => {
      const blob = preview3D.exportToSTL();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mendala_print.stl';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    btnExportOBJ.addEventListener('click', () => {
      const blob = preview3D.exportToOBJ();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mendala_assembly.obj';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    updateUndoRedoButtons();
  }

  // --- Zoom logic ---
  function adjustZoom(delta) {
    zoomFactor = Math.max(0.5, Math.min(3.0, zoomFactor + delta));
    txtZoomVal.textContent = Math.round(zoomFactor * 100) + '%';
    canvasZoomWrapper.style.transform = `scale(${zoomFactor})`;
  }

  function resetZoom() {
    zoomFactor = 1.0;
    txtZoomVal.textContent = '100%';
    canvasZoomWrapper.style.transform = `scale(1.0)`;
  }

  // --- Layer Management UI updates ---
  function updateLayerListUI() {
    layersContainer.innerHTML = '';
    
    // Build from top to bottom (so top layer appears first in list)
    [...mandala.layers].reverse().forEach(layer => {
      const layerItem = document.createElement('div');
      layerItem.className = `layer-item ${layer.id === mandala.activeLayerId ? 'active' : ''}`;
      
      layerItem.innerHTML = `
        <div class="layer-item-meta">
          <div class="layer-color-dot" style="background-color: ${layer.brushColor}; color: ${layer.brushColor}"></div>
          <span class="layer-name">${layer.name}</span>
          <span class="layer-symmetry-badge">${layer.symmetry}x</span>
        </div>
        <div class="layer-actions">
          <button class="layer-action-btn btn-visibility" title="Toggle Visibility">
            ${layer.visible ? 
              `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>` : 
              `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
            }
          </button>
          <button class="layer-action-btn btn-delete delete" title="Delete Layer" ${mandala.layers.length <= 1 ? 'disabled style="opacity:0.2;"' : ''}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      `;

      // Select Layer click
      layerItem.addEventListener('click', (e) => {
        // Prevent activation click if button clicked
        if (e.target.closest('.layer-action-btn')) return;
        
        mandala.setActiveLayer(layer.id);
        updateLayerListUI();
        syncSlidersWithActiveLayer();
        drawAll();
      });

      // Visibility Toggle click
      layerItem.querySelector('.btn-visibility').addEventListener('click', () => {
        layer.visible = !layer.visible;
        updateLayerListUI();
        drawAll();
        update3DPreview();
      });

      // Delete Layer click
      layerItem.querySelector('.btn-delete').addEventListener('click', () => {
        if (confirm(`Delete "${layer.name}" and all of its strokes?`)) {
          mandala.deleteLayer(layer.id);
          updateLayerListUI();
          syncSlidersWithActiveLayer();
          drawAll();
          update3DPreview();
          updateUndoRedoButtons();
        }
      });

      layersContainer.appendChild(layerItem);
    });
  }

  // Update controls display with active layer attributes
  function syncSlidersWithActiveLayer() {
    const activeLayer = mandala.getActiveLayer();
    if (!activeLayer) return;
    
    layerSymmetrySlider.value = activeLayer.symmetry;
    valLayerSymmetry.textContent = activeLayer.symmetry;
    
    layerMirrorCheckbox.checked = activeLayer.mirror;
    
    layerBrushSlider.value = activeLayer.brushSize;
    valLayerBrush.textContent = activeLayer.brushSize.toFixed(1) + ' mm';
    
    layerHeightSlider.value = activeLayer.height;
    valLayerHeight.textContent = activeLayer.height.toFixed(1) + ' mm';
    
    layerSmoothingSlider.value = activeLayer.smoothing;
    valLayerSmoothing.textContent = activeLayer.smoothing === 0 ? 'Off' : `Level ${activeLayer.smoothing}`;
    
    customColorPicker.value = activeLayer.brushColor;
    
    // Highlight swatch matching active layer color
    colorSwatches.forEach(s => {
      if (s.getAttribute('data-color') === activeLayer.brushColor) {
        s.classList.add('active');
      } else {
        s.classList.remove('active');
      }
    });
  }

  function updateUndoRedoButtons() {
    btnUndo.disabled = !mandala.canUndo();
    btnRedo.disabled = !mandala.canRedo();
  }

  // Helper download trigger
  function downloadFile(content, fileName, contentType) {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  // --- SVG Import Vector parsing ---
  function importSVGData(svgText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (!svgEl) {
      alert("Invalid SVG file: No <svg> tag found.");
      return false;
    }
    
    // Find all shapes
    const selectors = 'path, circle, rect, line, polyline, polygon, ellipse';
    const elements = doc.querySelectorAll(selectors);
    if (elements.length === 0) {
      alert("No vector shapes found in the SVG.");
      return false;
    }

    // Create a temporary SVG container to query geometry lengths
    const tempSvgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    tempSvgContainer.style.position = 'absolute';
    tempSvgContainer.style.width = '0';
    tempSvgContainer.style.height = '0';
    tempSvgContainer.style.pointerEvents = 'none';
    document.body.appendChild(tempSvgContainer);

    const importedStrokes = [];

    // Translate each shape to standard path string and sample points
    elements.forEach((el) => {
      let d = '';
      const tagName = el.tagName.toLowerCase();
      
      if (tagName === 'path') {
        d = el.getAttribute('d') || '';
      } else if (tagName === 'circle') {
        const cx = parseFloat(el.getAttribute('cx') || 0);
        const cy = parseFloat(el.getAttribute('cy') || 0);
        const r = parseFloat(el.getAttribute('r') || 0);
        d = `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy}`;
      } else if (tagName === 'rect') {
        const x = parseFloat(el.getAttribute('x') || 0);
        const y = parseFloat(el.getAttribute('y') || 0);
        const w = parseFloat(el.getAttribute('width') || 0);
        const h = parseFloat(el.getAttribute('height') || 0);
        d = `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
      } else if (tagName === 'line') {
        const x1 = parseFloat(el.getAttribute('x1') || 0);
        const y1 = parseFloat(el.getAttribute('y1') || 0);
        const x2 = parseFloat(el.getAttribute('x2') || 0);
        const y2 = parseFloat(el.getAttribute('y2') || 0);
        d = `M ${x1} ${y1} L ${x2} ${y2}`;
      } else if (tagName === 'polygon' || tagName === 'polyline') {
        const pts = el.getAttribute('points');
        if (pts) {
          const coords = pts.trim().replace(/,/g, ' ').split(/\s+/);
          if (coords.length >= 4) {
            d = `M ${coords[0]} ${coords[1]}`;
            for (let i = 2; i < coords.length; i += 2) {
              d += ` L ${coords[i]} ${coords[i+1]}`;
            }
            if (tagName === 'polygon') d += ' Z';
          }
        }
      } else if (tagName === 'ellipse') {
        const cx = parseFloat(el.getAttribute('cx') || 0);
        const cy = parseFloat(el.getAttribute('cy') || 0);
        const rx = parseFloat(el.getAttribute('rx') || 0);
        const ry = parseFloat(el.getAttribute('ry') || 0);
        d = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy}`;
      }

      if (!d) return;

      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', d);
      tempSvgContainer.appendChild(pathEl);
      
      try {
        const length = pathEl.getTotalLength();
        if (length > 0) {
          // Sample points along the path (sample density proportional to length)
          const numSamples = Math.max(12, Math.floor(length / 2));
          const points = [];
          for (let i = 0; i <= numSamples; i++) {
            const pt = pathEl.getPointAtLength((i / numSamples) * length);
            points.push({ x: pt.x, y: pt.y });
          }
          
          importedStrokes.push({
            type: 'freehand',
            points: points,
            rawPoints: JSON.parse(JSON.stringify(points))
          });
        }
      } catch (err) {
        console.warn("Could not calculate vector lengths for el:", el, err);
      }
    });

    document.body.removeChild(tempSvgContainer);

    if (importedStrokes.length === 0) {
      alert("Failed to sample vector coordinates from SVG file.");
      return false;
    }

    // Compute bounding box for centering
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    importedStrokes.forEach(stroke => {
      stroke.points.forEach(pt => {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      });
    });

    const bCenterY = (minY + maxY) / 2;
    const bCenterX = (minX + maxX) / 2;
    
    // Shift coordinates center to origin (0,0)
    importedStrokes.forEach(stroke => {
      stroke.points = stroke.points.map(pt => ({
        x: pt.x - bCenterX,
        y: pt.y - bCenterY
      }));
    });

    // Compute scaling factor based on max radius
    let maxDist = 0.001;
    importedStrokes.forEach(stroke => {
      stroke.points.forEach(pt => {
        const dist = Math.sqrt(pt.x * pt.x + pt.y * pt.y);
        if (dist > maxDist) maxDist = dist;
      });
    });

    // Scale SVG path to fit nicely on drawing board (radius limit of 350 out of 500)
    const scale = 320 / maxDist;
    importedStrokes.forEach(stroke => {
      stroke.points = stroke.points.map(pt => ({
        x: pt.x * scale,
        y: pt.y * scale
      }));
    });

    // Save history and append imported strokes
    const activeLayer = mandala.getActiveLayer();
    if (activeLayer) {
      mandala.saveState();
      importedStrokes.forEach(stroke => {
        activeLayer.strokes.push(stroke);
      });
      // Save state again so undo acts on the entire import group
      mandala.saveState();
      return true;
    }
    return false;
  }

  // Run initializations
  init();
});
