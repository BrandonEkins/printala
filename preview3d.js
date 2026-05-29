// 3D Preview Engine using Three.js

export class Preview3D {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`3D Container with ID ${containerId} not found.`);
      return;
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    
    // Group containing the mandala geometry (extruded lines and base plate)
    this.mandalaGroup = null;
    
    // Helper visual elements
    this.gridHelper = null;
    this.printBed = null;
    
    // Material presets
    this.materials = {};
    this.currentMaterialName = 'matte-red';
    
    // Config parameters
    this.showBed = true;
    this.isAutoRotating = false;
    
    this.initScene();
    this.initMaterials();
    this.animate();
    
    // Listen for resize
    window.addEventListener('resize', () => this.onWindowResize());
  }

  // Set up the scene, lighting, camera, and renderer
  initScene() {
    const THREE = window.THREE;
    
    // 1. Create Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05080f); // Match app dark background
    this.scene.fog = new THREE.FogExp2(0x05080f, 0.0035);

    // 2. Create Camera (Z-up orientation for 3D printing alignment)
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      1,
      1000
    );
    this.camera.position.set(0, -120, 90);
    this.camera.up.set(0, 0, 1); // Set Z as up

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 4. Orbit Controls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera going below print bed
    this.controls.minDistance = 20;
    this.controls.maxDistance = 250;
    this.controls.target.set(0, 0, 2);

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambientLight);

    // Primary directional light representing overhead printer light
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.75);
    dirLight1.position.set(60, 50, 100);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 2048;
    dirLight1.shadow.mapSize.height = 2048;
    dirLight1.shadow.camera.near = 0.5;
    dirLight1.shadow.camera.far = 250;
    
    const d = 80;
    dirLight1.shadow.camera.left = -d;
    dirLight1.shadow.camera.right = d;
    dirLight1.shadow.camera.top = d;
    dirLight1.shadow.camera.bottom = -d;
    dirLight1.shadow.bias = -0.0005;
    this.scene.add(dirLight1);

    // Soft fill blue light from bottom front
    const dirLight2 = new THREE.DirectionalLight(0x3b82f6, 0.35);
    dirLight2.position.set(-60, -80, -20);
    this.scene.add(dirLight2);

    // Highlight rim light
    const pointLight = new THREE.PointLight(0xffffff, 0.5, 120);
    pointLight.position.set(0, 0, 60);
    this.scene.add(pointLight);

    // 6. Geometry Group
    this.mandalaGroup = new THREE.Group();
    this.scene.add(this.mandalaGroup);

    // 7. Visual Printer Bed Grid
    this.createPrinterBed();
  }

  // Setup filament style materials
  initMaterials() {
    const THREE = window.THREE;
    
    // Matte PLA Red
    this.materials['matte-red'] = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.85,
      metalness: 0.05
    });

    // Silk Gold
    this.materials['silk-gold'] = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.18,
      metalness: 0.85,
      bumpScale: 0.05
    });

    // Translucent Cyan Neon
    this.materials['neon-cyan'] = new THREE.MeshPhysicalMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.75,
      roughness: 0.25,
      metalness: 0.1,
      transmission: 0.7,
      thickness: 3.0,
      clearcoat: 0.5
    });

    // Glow in the dark green
    this.materials['glow-green'] = new THREE.MeshStandardMaterial({
      color: 0xdcfce7,
      emissive: 0x22c55e,
      emissiveIntensity: 0.45,
      roughness: 0.6,
      metalness: 0.1
    });

    // Carbon Fiber Black
    this.materials['carbon'] = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.95,
      metalness: 0.15
    });
  }

  // Create the simulated build plate (print bed)
  createPrinterBed() {
    const THREE = window.THREE;
    
    if (this.printBed) this.scene.remove(this.printBed);
    if (this.gridHelper) this.scene.remove(this.gridHelper);

    // Build Bed Grid (220mm square, representing standard Ender-3 or Prusa bed)
    this.gridHelper = new THREE.GridHelper(220, 22, 0x475569, 0x1e293b);
    this.gridHelper.rotation.x = Math.PI / 2; // Lay flat in XY plane
    this.gridHelper.position.z = -0.1; // Place slightly below model
    this.scene.add(this.gridHelper);

    // Translucent solid backing plate
    const bedGeo = new THREE.BoxGeometry(220, 220, 2);
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0x0b1329,
      roughness: 0.9,
      metalness: 0.2,
      transparent: true,
      opacity: 0.5
    });
    this.printBed = new THREE.Mesh(bedGeo, bedMat);
    this.printBed.position.z = -1.1; // Place below grid line
    this.printBed.receiveShadow = true;
    this.scene.add(this.printBed);

    this.togglePrintBed(this.showBed);
  }

  togglePrintBed(visible) {
    this.showBed = visible;
    if (this.printBed && this.gridHelper) {
      this.printBed.visible = visible;
      this.gridHelper.visible = visible;
    }
  }

  // Change active preview material style
  setMaterial(materialName) {
    if (this.materials[materialName]) {
      this.currentMaterialName = materialName;
      const mat = this.materials[materialName];
      
      // Update materials on all children of mandala group
      this.mandalaGroup.traverse((child) => {
        if (child.isMesh) {
          child.material = mat;
        }
      });
    }
  }

  // Reset view to default camera angle
  resetView() {
    this.camera.position.set(0, -120, 90);
    this.controls.target.set(0, 0, 2);
    this.controls.update();
  }

  // Helper to dense-sample all drawn coordinates from the mandala design (including symmetries)
  getDrawnPoints(mandala, scaleFactor) {
    const points = [];
    
    mandala.layers.forEach((layer) => {
      if (!layer.visible || layer.strokes.length === 0) return;
      
      const S = layer.symmetry;
      const mirror = layer.mirror;
      const halfBrush = (layer.brushSize * scaleFactor * 10) / 2; // Half brush size in physical mm
      
      layer.strokes.forEach((stroke) => {
        let strokePts = [];
        
        if (stroke.type === 'freehand') {
          strokePts = stroke.points.map(p => ({ x: p.x * scaleFactor, y: p.y * scaleFactor }));
        } else if (stroke.type === 'line') {
          const p1 = { x: stroke.x1 * scaleFactor, y: stroke.y1 * scaleFactor };
          const p2 = { x: stroke.x2 * scaleFactor, y: stroke.y2 * scaleFactor };
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const steps = Math.max(2, Math.ceil(len / 0.5)); // Sample every 0.5 mm
          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            strokePts.push({ x: p1.x + dx * t, y: p1.y + dy * t });
          }
        } else if (stroke.type === 'circle') {
          const cx = stroke.cx * scaleFactor;
          const cy = stroke.cy * scaleFactor;
          const r = stroke.r * scaleFactor;
          const numSegs = Math.max(32, Math.floor(r * 3));
          for (let j = 0; j <= numSegs; j++) {
            const a = (j * Math.PI * 2) / numSegs;
            strokePts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
          }
        } else if (stroke.type === 'polygon') {
          const cx = stroke.cx * scaleFactor;
          const cy = stroke.cy * scaleFactor;
          const r = stroke.r * scaleFactor;
          const sides = stroke.sides;
          const angle = stroke.angle || 0;
          for (let j = 0; j < sides; j++) {
            const a1 = angle + (j * Math.PI * 2) / sides;
            const a2 = angle + ((j + 1) * Math.PI * 2) / sides;
            const p1 = { x: cx + Math.cos(a1) * r, y: cy + Math.sin(a1) * r };
            const p2 = { x: cx + Math.cos(a2) * r, y: cy + Math.sin(a2) * r };
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const steps = Math.max(2, Math.ceil(len / 0.5));
            for (let k = 0; k <= steps; k++) {
              const t = k / steps;
              strokePts.push({ x: p1.x + dx * t, y: p1.y + dy * t });
            }
          }
        }
        
        // Generate symmetric coordinates for all points in the stroke
        strokePts.forEach(pt => {
          for (let i = 0; i < S; i++) {
            const rotateAngle = (i * Math.PI * 2) / S;
            const cosA = Math.cos(rotateAngle);
            const sinA = Math.sin(rotateAngle);
            
            // Original orientation point
            points.push({
              x: pt.x * cosA - pt.y * sinA,
              y: pt.x * sinA + pt.y * cosA,
              halfBrush: halfBrush
            });
            
            // Mirrored orientation point
            if (mirror && S > 1) {
              const my = -pt.y;
              points.push({
                x: pt.x * cosA - my * sinA,
                y: pt.x * sinA + my * cosA,
                halfBrush: halfBrush
              });
            }
          }
        });
      });
    });
    
    return points;
  }

  // Extrude the 2D mandala layout into a 3D model
  updateModel(mandala, basePlateSettings, overallScale = 100) {
    const THREE = window.THREE;
    
    // Clear old geometry
    while (this.mandalaGroup.children.length > 0) {
      const obj = this.mandalaGroup.children[0];
      if (obj.geometry) obj.geometry.dispose();
      this.mandalaGroup.remove(obj);
    }
    
    const activeMaterial = this.materials[this.currentMaterialName];
    
    // Scale factor to map 1000px canvas to real physical units (mm)
    const scaleFactor = overallScale / 1000;
    
    const baseType = basePlateSettings.type;
    const baseThickness = parseFloat(basePlateSettings.thickness) || 0;
    const baseRadius = parseFloat(basePlateSettings.radius) || 0;
    const baseBorder = parseFloat(basePlateSettings.border) || 0;
    
    // 1. Build Extruded Mandala Strokes
    mandala.layers.forEach((layer) => {
      if (!layer.visible || layer.strokes.length === 0) return;
      
      const S = layer.symmetry;
      const mirror = layer.mirror;
      const brushRadius = (layer.brushSize * scaleFactor * 10) / 2; // Physical brush radius in mm
      const layerHeight = layer.height; // Extrusion height in mm
      
      const geometries = [];
      
      // Reusable base cylinder for joints
      const baseCylinder = new THREE.CylinderGeometry(brushRadius, brushRadius, layerHeight, 8);
      baseCylinder.rotateX(Math.PI / 2); // Align height along Z-axis
      
      // Reusable unit box for segments
      const baseBox = new THREE.BoxGeometry(1, 1, 1);
      
      layer.strokes.forEach((stroke) => {
        let pts = [];
        let isClosed = false;
        
        if (stroke.type === 'freehand') {
          pts = stroke.points.map(p => ({ x: p.x * scaleFactor, y: p.y * scaleFactor }));
          isClosed = false;
        } else if (stroke.type === 'line') {
          pts = [
            { x: stroke.x1 * scaleFactor, y: stroke.y1 * scaleFactor },
            { x: stroke.x2 * scaleFactor, y: stroke.y2 * scaleFactor }
          ];
          isClosed = false;
        } else if (stroke.type === 'circle') {
          const cx = stroke.cx * scaleFactor;
          const cy = stroke.cy * scaleFactor;
          const r = stroke.r * scaleFactor;
          const numSegs = Math.max(16, Math.floor(r * 1.5));
          for (let j = 0; j < numSegs; j++) {
            const a = (j * Math.PI * 2) / numSegs;
            pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
          }
          isClosed = true;
        } else if (stroke.type === 'polygon') {
          const cx = stroke.cx * scaleFactor;
          const cy = stroke.cy * scaleFactor;
          const r = stroke.r * scaleFactor;
          const sides = stroke.sides;
          const angle = stroke.angle || 0;
          for (let j = 0; j < sides; j++) {
            const a = angle + (j * Math.PI * 2) / sides;
            pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
          }
          isClosed = true;
        }
        
        if (pts.length < 2) return;
        
        // Generate symmetric geometries
        for (let i = 0; i < S; i++) {
          const rotateAngle = (i * Math.PI * 2) / S;
          
          // Original path
          this.addStrokeGeometries(geometries, pts, isClosed, rotateAngle, false, brushRadius, layerHeight, baseBox, baseCylinder);
          
          // Mirrored path
          if (mirror && S > 1) {
            this.addStrokeGeometries(geometries, pts, isClosed, rotateAngle, true, brushRadius, layerHeight, baseBox, baseCylinder);
          }
        }
      });
      
      // Dispose base helpers
      baseCylinder.dispose();
      baseBox.dispose();
      
      // Merge all geometries into a single mesh for this layer
      if (geometries.length > 0) {
        try {
          const mergedGeo = THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);
          let finalGeo = mergedGeo;
          if (THREE.BufferGeometryUtils.weld) {
            try {
              finalGeo = THREE.BufferGeometryUtils.weld(mergedGeo);
            } catch (err) {
              console.warn("Welding failed for layer:", err);
            }
          }
          const layerMesh = new THREE.Mesh(finalGeo, activeMaterial);
          layerMesh.name = `Layer_${layer.name.replace(/\s+/g, '_')}`;
          layerMesh.castShadow = true;
          layerMesh.receiveShadow = true;
          
          // Shift UP by base thickness minus a small overlap (0.05 mm) to prevent coplanar touching faces
          if (baseType !== 'none' && baseThickness > 0) {
            layerMesh.position.z = baseThickness - 0.05;
          }
          
          this.mandalaGroup.add(layerMesh);
        } catch (e) {
          console.error("Error merging geometries for layer:", e);
        }
        
        // Dispose of the sub-geometries since they're merged
        geometries.forEach(geo => geo.dispose());
      }
    });
    
    // 2. Build Base Plate (solid backing or conforming outline backing)
    if (baseType !== 'none' && baseThickness > 0) {
      if (baseType === 'conforming-outline') {
        // Conforming backing: duplicate all strokes with an expanded brush size
        mandala.layers.forEach((layer) => {
          if (!layer.visible || layer.strokes.length === 0) return;
          
          const S = layer.symmetry;
          const mirror = layer.mirror;
          
          // Expanded brush radius in mm: (brushSize + 2 * borderOffset) / 2
          const expandedBrushRadius = ((layer.brushSize + 2 * baseBorder) * scaleFactor * 10) / 2;
          
          const geometries = [];
          
          const baseCylinder = new THREE.CylinderGeometry(expandedBrushRadius, expandedBrushRadius, baseThickness, 8);
          baseCylinder.rotateX(Math.PI / 2);
          
          const baseBox = new THREE.BoxGeometry(1, 1, 1);
          
          layer.strokes.forEach((stroke) => {
            let pts = [];
            let isClosed = false;
            
            if (stroke.type === 'freehand') {
              pts = stroke.points.map(p => ({ x: p.x * scaleFactor, y: p.y * scaleFactor }));
              isClosed = false;
            } else if (stroke.type === 'line') {
              pts = [
                { x: stroke.x1 * scaleFactor, y: stroke.y1 * scaleFactor },
                { x: stroke.x2 * scaleFactor, y: stroke.y2 * scaleFactor }
              ];
              isClosed = false;
            } else if (stroke.type === 'circle') {
              const cx = stroke.cx * scaleFactor;
              const cy = stroke.cy * scaleFactor;
              const r = stroke.r * scaleFactor;
              const numSegs = Math.max(16, Math.floor(r * 1.5));
              for (let j = 0; j < numSegs; j++) {
                const a = (j * Math.PI * 2) / numSegs;
                pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
              }
              isClosed = true;
            } else if (stroke.type === 'polygon') {
              const cx = stroke.cx * scaleFactor;
              const cy = stroke.cy * scaleFactor;
              const r = stroke.r * scaleFactor;
              const sides = stroke.sides;
              const angle = stroke.angle || 0;
              for (let j = 0; j < sides; j++) {
                const a = angle + (j * Math.PI * 2) / sides;
                pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
              }
              isClosed = true;
            }
            
            if (pts.length < 2) return;
            
            for (let i = 0; i < S; i++) {
              const rotateAngle = (i * Math.PI * 2) / S;
              this.addStrokeGeometries(geometries, pts, isClosed, rotateAngle, false, expandedBrushRadius, baseThickness, baseBox, baseCylinder);
              if (mirror && S > 1) {
                this.addStrokeGeometries(geometries, pts, isClosed, rotateAngle, true, expandedBrushRadius, baseThickness, baseBox, baseCylinder);
              }
            }
          });
          
          baseCylinder.dispose();
          baseBox.dispose();
          
          if (geometries.length > 0) {
            try {
              const mergedGeo = THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);
              let finalGeo = mergedGeo;
              if (THREE.BufferGeometryUtils.weld) {
                try {
                  finalGeo = THREE.BufferGeometryUtils.weld(mergedGeo);
                } catch (err) {
                  console.warn("Welding failed for conforming base:", err);
                }
              }
              const conformingMesh = new THREE.Mesh(finalGeo, activeMaterial);
              conformingMesh.name = "Base_Plate";
              conformingMesh.castShadow = true;
              conformingMesh.receiveShadow = true;
              // Placed at z = 0 (bottom of strokes)
              this.mandalaGroup.add(conformingMesh);
            } catch (e) {
              console.error("Error creating conforming base:", e);
            }
            geometries.forEach(geo => geo.dispose());
          }
        });
      } else if (baseType === 'conforming-solid') {
        // Conforming solid backing: create a solid fill backing that covers all interior areas
        const numBins = 360;
        const r_samples = new Array(numBins).fill(0);
        const drawnPoints = this.getDrawnPoints(mandala, scaleFactor);
        
        drawnPoints.forEach(pt => {
          const dist = Math.sqrt(pt.x * pt.x + pt.y * pt.y);
          const r = dist + pt.halfBrush;
          let angle = Math.atan2(pt.y, pt.x);
          if (angle < 0) angle += Math.PI * 2;
          
          const bin = Math.floor((angle / (Math.PI * 2)) * numBins) % numBins;
          if (r > r_samples[bin]) {
            r_samples[bin] = r;
          }
        });
        
        // Interpolate empty bins
        for (let i = 0; i < numBins; i++) {
          if (r_samples[i] === 0) {
            let leftVal = 0;
            let leftDist = 0;
            for (let d = 1; d < numBins; d++) {
              const idx = (i - d + numBins) % numBins;
              if (r_samples[idx] > 0) {
                leftVal = r_samples[idx];
                leftDist = d;
                break;
              }
            }
            
            let rightVal = 0;
            let rightDist = 0;
            for (let d = 1; d < numBins; d++) {
              const idx = (i + d) % numBins;
              if (r_samples[idx] > 0) {
                rightVal = r_samples[idx];
                rightDist = d;
                break;
              }
            }
            
            if (leftVal > 0 && rightVal > 0) {
              const totalDist = leftDist + rightDist;
              r_samples[i] = (leftVal * rightDist + rightVal * leftDist) / totalDist;
            } else if (leftVal > 0) {
              r_samples[i] = leftVal;
            } else if (rightVal > 0) {
              r_samples[i] = rightVal;
            } else {
              r_samples[i] = 10; // Fallback default if drawing is empty
            }
          }
        }
        
        // Smooth the radii array to make the outer edge look organic and smooth
        const smoothedR = new Array(numBins);
        const windowSize = 5;
        const halfWin = Math.floor(windowSize / 2);
        for (let i = 0; i < numBins; i++) {
          let sum = 0;
          for (let w = -halfWin; w <= halfWin; w++) {
            const idx = (i + w + numBins) % numBins;
            sum += r_samples[idx];
          }
          smoothedR[i] = sum / windowSize;
        }
        
        // Generate shape points
        const shape = new THREE.Shape();
        const startAngle = 0;
        const startR = smoothedR[0] + baseBorder;
        shape.moveTo(Math.cos(startAngle) * startR, Math.sin(startAngle) * startR);
        
        for (let i = 1; i < numBins; i++) {
          const angle = (i * Math.PI * 2) / numBins;
          const r = smoothedR[i] + baseBorder;
          shape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        shape.closePath();
        
        // Add hanging hole if enabled
        if (basePlateSettings.addHole && basePlateSettings.holeSize > 0) {
          const holeRadius = basePlateSettings.holeSize / 2;
          const angleDeg = basePlateSettings.holeAngle !== undefined ? basePlateSettings.holeAngle : 90;
          const theta = (angleDeg * Math.PI) / 180;
          let bin = Math.floor((angleDeg / 360) * 360) % 360;
          if (bin < 0) bin += 360;
          const boundaryRadius = smoothedR[bin] + baseBorder;
          const holeDist = Math.max(holeRadius * 2, boundaryRadius - basePlateSettings.holeDistance);
          const holeX = Math.cos(theta) * holeDist;
          const holeY = Math.sin(theta) * holeDist;
          const holePath = new THREE.Path();
          holePath.absarc(holeX, holeY, holeRadius, 0, Math.PI * 2, true); // clockwise for subtraction
          shape.holes.push(holePath);
        }
        
        const extrudeSettings = {
          depth: baseThickness,
          bevelEnabled: false
        };
        const baseGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        
        const baseMesh = new THREE.Mesh(baseGeo, activeMaterial);
        baseMesh.name = "Base_Plate";
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        
        // Placed at z = 0 (bottom of strokes)
        this.mandalaGroup.add(baseMesh);
      } else if (baseRadius > 0) {
        // Classic solid shape base plate (circle, hexagon, octagon)
        const shape = new THREE.Shape();
        
        if (baseType === 'hexagon') {
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI * 2) / 6;
            if (i === 0) shape.moveTo(Math.cos(a) * baseRadius, Math.sin(a) * baseRadius);
            else shape.lineTo(Math.cos(a) * baseRadius, Math.sin(a) * baseRadius);
          }
          shape.closePath();
        } else if (baseType === 'octagon') {
          for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI * 2) / 8;
            if (i === 0) shape.moveTo(Math.cos(a) * baseRadius, Math.sin(a) * baseRadius);
            else shape.lineTo(Math.cos(a) * baseRadius, Math.sin(a) * baseRadius);
          }
          shape.closePath();
        } else {
          // Circle
          shape.absarc(0, 0, baseRadius, 0, Math.PI * 2, false);
        }
        
        // Add hanging hole if enabled
        if (basePlateSettings.addHole && basePlateSettings.holeSize > 0) {
          const holeRadius = basePlateSettings.holeSize / 2;
          const angleDeg = basePlateSettings.holeAngle !== undefined ? basePlateSettings.holeAngle : 90;
          const theta = (angleDeg * Math.PI) / 180;
          const holeDist = Math.max(holeRadius * 2, baseRadius - basePlateSettings.holeDistance);
          const holeX = Math.cos(theta) * holeDist;
          const holeY = Math.sin(theta) * holeDist;
          const holePath = new THREE.Path();
          holePath.absarc(holeX, holeY, holeRadius, 0, Math.PI * 2, true); // clockwise for subtraction
          shape.holes.push(holePath);
        }
        
        const extrudeSettings = {
          depth: baseThickness,
          bevelEnabled: false
        };
        const baseGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        
        const baseMesh = new THREE.Mesh(baseGeo, activeMaterial);
        baseMesh.name = "Base_Plate";
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        // Placed at z = 0 (extruding up to baseThickness)
        this.mandalaGroup.add(baseMesh);
      }
    }
    
    // 3. Update UI Metadata info
    this.updateStats();
  }

  // Optimize: Construct and orient geometry objects to be merged later
  addStrokeGeometries(geometriesList, pts, isClosed, rotateAngle, isMirrored, brushRadius, layerHeight, baseBox, baseCylinder) {
    const THREE = window.THREE;
    
    // Transform coordinates based on rotation and mirror state
    const cosA = Math.cos(rotateAngle);
    const sinA = Math.sin(rotateAngle);
    
    const transformedPts = pts.map(pt => {
      let tx = pt.x;
      let ty = pt.y;
      if (isMirrored) {
        ty = -ty;
      }
      return {
        x: tx * cosA - ty * sinA,
        y: tx * sinA + ty * cosA
      };
    });
    
    const numPoints = transformedPts.length;
    const mz = layerHeight / 2;
    
    // Add segment boxes and start point cylinders
    for (let i = 0; i < numPoints - 1; i++) {
      const p1 = transformedPts[i];
      const p2 = transformedPts[i + 1];
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length < 0.001) continue;
      
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      const segmentAngle = Math.atan2(dy, dx);
      
      // Box segment geometry
      const boxGeo = baseBox.clone();
      boxGeo.scale(length, brushRadius * 2, layerHeight);
      
      const posMatrix = new THREE.Matrix4().makeTranslation(mx, my, mz);
      const rotMatrix = new THREE.Matrix4().makeRotationZ(segmentAngle);
      const matrix = posMatrix.multiply(rotMatrix);
      boxGeo.applyMatrix4(matrix);
      geometriesList.push(boxGeo);
      
      // Rounded joint at segment start
      const jointGeo = baseCylinder.clone();
      jointGeo.translate(p1.x, p1.y, mz);
      geometriesList.push(jointGeo);
    }
    
    // End capping
    if (isClosed && numPoints >= 3) {
      const p1 = transformedPts[numPoints - 1];
      const p2 = transformedPts[0];
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length >= 0.001) {
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        const segmentAngle = Math.atan2(dy, dx);
        
        const boxGeo = baseBox.clone();
        boxGeo.scale(length, brushRadius * 2, layerHeight);
        
        const posMatrix = new THREE.Matrix4().makeTranslation(mx, my, mz);
        const rotMatrix = new THREE.Matrix4().makeRotationZ(segmentAngle);
        const matrix = posMatrix.multiply(rotMatrix);
        boxGeo.applyMatrix4(matrix);
        geometriesList.push(boxGeo);
        
        const jointGeo = baseCylinder.clone();
        jointGeo.translate(p1.x, p1.y, mz);
        geometriesList.push(jointGeo);
      }
    } else if (!isClosed) {
      // Open path: add cylinder to cap the final point
      const pLast = transformedPts[numPoints - 1];
      const jointGeo = baseCylinder.clone();
      jointGeo.translate(pLast.x, pLast.y, mz);
      geometriesList.push(jointGeo);
    }
  }

  // Update triangle counts and display boundaries
  updateStats() {
    let triangleCount = 0;
    const THREE = window.THREE;
    
    const bbox = new THREE.Box3().setFromObject(this.mandalaGroup);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    
    this.mandalaGroup.traverse((child) => {
      if (child.isMesh && child.geometry) {
        const pos = child.geometry.attributes.position;
        if (pos) {
          if (child.geometry.index) {
            triangleCount += child.geometry.index.count / 3;
          } else {
            triangleCount += pos.count / 3;
          }
        }
      }
    });

    const polyText = document.getElementById('poly-count');
    const dimText = document.getElementById('dimensions');
    
    if (polyText) polyText.textContent = `Triangles: ${Math.round(triangleCount).toLocaleString()}`;
    if (dimText) dimText.textContent = `Size: ${Math.round(size.x)} x ${Math.round(size.y)} x ${size.z.toFixed(1)} mm`;
  }

  // Main render loop
  animate() {
    requestAnimationFrame(() => this.animate());
    
    if (this.controls) this.controls.update();
    
    if (this.isAutoRotating && this.mandalaGroup) {
      this.mandalaGroup.rotation.z += 0.005;
    } else if (this.mandalaGroup) {
      this.mandalaGroup.rotation.z = 0; // Lock to origin orientation when not auto-rotating
    }
    
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  // Handle window resizing
  onWindowResize() {
    if (!this.camera || !this.renderer || !this.container) return;
    
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  // Export current meshes in group as a Binary STL blob
  exportToSTL() {
    const THREE = window.THREE;
    
    // Collect all triangles in the mandalaGroup
    const triangles = [];
    const tempV1 = new THREE.Vector3();
    const tempV2 = new THREE.Vector3();
    const tempV3 = new THREE.Vector3();
    
    // Ensure matrices are updated
    this.scene.updateMatrixWorld(true);
    
    this.mandalaGroup.traverse((node) => {
      if (node.isMesh && node.geometry) {
        const geom = node.geometry;
        const matrix = node.matrixWorld;
        
        const positionAttr = geom.attributes.position;
        if (!positionAttr) return;
        
        const indexAttr = geom.index;
        
        if (indexAttr) {
          for (let i = 0; i < indexAttr.count; i += 3) {
            const idx1 = indexAttr.getX(i);
            const idx2 = indexAttr.getX(i + 1);
            const idx3 = indexAttr.getX(i + 2);
            
            tempV1.set(positionAttr.getX(idx1), positionAttr.getY(idx1), positionAttr.getZ(idx1)).applyMatrix4(matrix);
            tempV2.set(positionAttr.getX(idx2), positionAttr.getY(idx2), positionAttr.getZ(idx2)).applyMatrix4(matrix);
            tempV3.set(positionAttr.getX(idx3), positionAttr.getY(idx3), positionAttr.getZ(idx3)).applyMatrix4(matrix);
            
            triangles.push({
              v1: tempV1.clone(),
              v2: tempV2.clone(),
              v3: tempV3.clone()
            });
          }
        } else {
          for (let i = 0; i < positionAttr.count; i += 3) {
            tempV1.set(positionAttr.getX(i), positionAttr.getY(i), positionAttr.getZ(i)).applyMatrix4(matrix);
            tempV2.set(positionAttr.getX(i + 1), positionAttr.getY(i + 1), positionAttr.getZ(i + 1)).applyMatrix4(matrix);
            tempV3.set(positionAttr.getX(i + 2), positionAttr.getY(i + 2), positionAttr.getZ(i + 2)).applyMatrix4(matrix);
            
            triangles.push({
              v1: tempV1.clone(),
              v2: tempV2.clone(),
              v3: tempV3.clone()
            });
          }
        }
      }
    });

    // Write binary STL data structure
    const totalTriangles = triangles.length;
    const bufferSize = 84 + totalTriangles * 50;
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const dataView = new DataView(arrayBuffer);
    
    // Header (80 bytes)
    const headerStr = "Mendala 3D Export - STL binary format";
    for (let i = 0; i < 80; i++) {
      if (i < headerStr.length) {
        dataView.setUint8(i, headerStr.charCodeAt(i));
      } else {
        dataView.setUint8(i, 0);
      }
    }
    
    // Triangle Count (4 bytes)
    dataView.setUint32(80, totalTriangles, true); // true = Little Endian
    
    // Triangle Data (50 bytes each)
    let offset = 84;
    for (let i = 0; i < totalTriangles; i++) {
      const tri = triangles[i];
      
      // Calculate face normal
      const cb = new THREE.Vector3().subVectors(tri.v3, tri.v2);
      const ab = new THREE.Vector3().subVectors(tri.v1, tri.v2);
      cb.cross(ab).normalize();
      
      // Normal Vector (3 floats = 12 bytes)
      dataView.setFloat32(offset, cb.x, true);
      dataView.setFloat32(offset + 4, cb.y, true);
      dataView.setFloat32(offset + 8, cb.z, true);
      
      // Vertex 1 (3 floats = 12 bytes)
      dataView.setFloat32(offset + 12, tri.v1.x, true);
      dataView.setFloat32(offset + 16, tri.v1.y, true);
      dataView.setFloat32(offset + 20, tri.v1.z, true);
      
      // Vertex 2 (3 floats = 12 bytes)
      dataView.setFloat32(offset + 24, tri.v2.x, true);
      dataView.setFloat32(offset + 28, tri.v2.y, true);
      dataView.setFloat32(offset + 32, tri.v2.z, true);
      
      // Vertex 3 (3 floats = 12 bytes)
      dataView.setFloat32(offset + 36, tri.v3.x, true);
      dataView.setFloat32(offset + 40, tri.v3.y, true);
      dataView.setFloat32(offset + 44, tri.v3.z, true);
      
      // Attribute Byte Count (2 bytes) = 0
      dataView.setUint16(offset + 48, 0, true);
      
      offset += 50;
    }
    
    return new Blob([arrayBuffer], { type: 'application/octet-stream' });
  }

  // Export current meshes in group as a Multi-Color/Multi-Part OBJ file
  exportToOBJ() {
    const THREE = window.THREE;
    let objText = "# Mendala Multi-Color Assembly OBJ\n# Generated by Mendala\n\n";
    let vertexOffset = 1; // OBJ is 1-indexed
    
    this.scene.updateMatrixWorld(true);
    
    this.mandalaGroup.children.forEach((mesh) => {
      if (!mesh.isMesh || !mesh.geometry) return;
      
      const geom = mesh.geometry;
      const name = mesh.name || "Object";
      
      objText += `g ${name}\n`;
      objText += `o ${name}\n`;
      
      const positionAttr = geom.attributes.position;
      if (!positionAttr) return;
      
      // Write vertices
      const matrix = mesh.matrixWorld;
      const tempV = new THREE.Vector3();
      for (let i = 0; i < positionAttr.count; i++) {
        tempV.set(positionAttr.getX(i), positionAttr.getY(i), positionAttr.getZ(i)).applyMatrix4(matrix);
        objText += `v ${tempV.x.toFixed(4)} ${tempV.y.toFixed(4)} ${tempV.z.toFixed(4)}\n`;
      }
      
      // Write faces
      const indexAttr = geom.index;
      if (indexAttr) {
        for (let i = 0; i < indexAttr.count; i += 3) {
          const v1 = indexAttr.getX(i) + vertexOffset;
          const v2 = indexAttr.getX(i + 1) + vertexOffset;
          const v3 = indexAttr.getX(i + 2) + vertexOffset;
          objText += `f ${v1} ${v2} ${v3}\n`;
        }
      } else {
        for (let i = 0; i < positionAttr.count; i += 3) {
          const v1 = i + vertexOffset;
          const v2 = i + 1 + vertexOffset;
          const v3 = i + 2 + vertexOffset;
          objText += `f ${v1} ${v2} ${v3}\n`;
        }
      }
      
      vertexOffset += positionAttr.count;
      objText += "\n";
    });
    
    return new Blob([objText], { type: 'text/plain' });
  }
}
