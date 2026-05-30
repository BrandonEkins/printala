// 3D Preview Engine using Three.js

// Ramer-Douglas-Peucker line simplification
function simplifyRDP(points, epsilon) {
  if (points.length <= 2) return points;
  
  let dmax = 0;
  let index = 0;
  const end = points.length - 1;
  
  const p1 = points[0];
  const p2 = points[end];
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;
  
  for (let i = 1; i < end; i++) {
    const p = points[i];
    let d;
    if (lenSq === 0) {
      const rx = p.x - p1.x;
      const ry = p.y - p1.y;
      d = rx * rx + ry * ry;
    } else {
      const t = ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / lenSq;
      const clampedT = Math.max(0, Math.min(1, t));
      const projX = p1.x + clampedT * dx;
      const projY = p1.y + clampedT * dy;
      const rx = p.x - projX;
      const ry = p.y - projY;
      d = rx * rx + ry * ry;
    }
    
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }
  
  if (dmax > epsilon * epsilon) {
    const results1 = simplifyRDP(points.slice(0, index + 1), epsilon);
    const results2 = simplifyRDP(points.slice(index), epsilon);
    return results1.slice(0, results1.length - 1).concat(results2);
  } else {
    return [points[0], points[end]];
  }
}

// Distance-based pre-filter + RDP
function simplifyPath(points, epsilon) {
  if (points.length <= 2) return points;
  
  const radialFilter = [points[0]];
  let prev = points[0];
  const minDistSq = (epsilon * 0.5) * (epsilon * 0.5);
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    if (dx * dx + dy * dy >= minDistSq) {
      radialFilter.push(p);
      prev = p;
    }
  }
  radialFilter.push(points[points.length - 1]);
  
  return simplifyRDP(radialFilter, epsilon);
}

// Helper to convert a path of points into a closed 2D outline shape with round end-caps
// Helper to convert a path of points into a closed 2D outline boundary (array of points) with round end-caps
function createStrokeOutline(pts, brushRadius) {
  const numPoints = pts.length;
  if (numPoints < 2) return null;
  
  const leftPts = [];
  const rightPts = [];
  
  for (let i = 0; i < numPoints; i++) {
    const curr = pts[i];
    let tx = 0;
    let ty = 0;
    
    if (i === 0) {
      const next = pts[1];
      tx = next.x - curr.x;
      ty = next.y - curr.y;
    } else if (i === numPoints - 1) {
      const prev = pts[i - 1];
      tx = curr.x - prev.x;
      ty = curr.y - prev.y;
    } else {
      const prev = pts[i - 1];
      const next = pts[i + 1];
      const t1x = curr.x - prev.x;
      const t1y = curr.y - prev.y;
      const t2x = next.x - curr.x;
      const t2y = next.y - curr.y;
      
      const len1 = Math.sqrt(t1x * t1x + t1y * t1y);
      const len2 = Math.sqrt(t2x * t2x + t2y * t2y);
      
      if (len1 > 0.001 && len2 > 0.001) {
        tx = t1x / len1 + t2x / len2;
        ty = t1y / len1 + t2y / len2;
      } else {
        tx = t2x || t1x;
        ty = t2y || t1y;
      }
    }
    
    const len = Math.sqrt(tx * tx + ty * ty);
    if (len < 0.0001) {
      tx = 1;
      ty = 0;
    } else {
      tx /= len;
      ty /= len;
    }
    
    const nx = -ty;
    const ny = tx;
    
    leftPts.push({
      x: curr.x + nx * brushRadius,
      y: curr.y + ny * brushRadius
    });
    rightPts.push({
      x: curr.x - nx * brushRadius,
      y: curr.y - ny * brushRadius
    });
  }
  
  const outlinePoints = [];
  const p0 = pts[0];
  const startDx = leftPts[0].x - p0.x;
  const startDy = leftPts[0].y - p0.y;
  const startAngle = Math.atan2(startDy, startDx);
  
  outlinePoints.push({ x: leftPts[0].x, y: leftPts[0].y });
  const capSteps = 8;
  for (let j = 1; j < capSteps; j++) {
    const angle = startAngle + (j * Math.PI) / capSteps;
    outlinePoints.push({
      x: p0.x + Math.cos(angle) * brushRadius,
      y: p0.y + Math.sin(angle) * brushRadius
    });
  }
  outlinePoints.push({ x: rightPts[0].x, y: rightPts[0].y });
  
  for (let i = 1; i < numPoints; i++) {
    outlinePoints.push({ x: rightPts[i].x, y: rightPts[i].y });
  }
  
  const pLast = pts[numPoints - 1];
  const endDx = rightPts[numPoints - 1].x - pLast.x;
  const endDy = rightPts[numPoints - 1].y - pLast.y;
  const endAngle = Math.atan2(endDy, endDx);
  
  for (let j = 1; j < capSteps; j++) {
    const angle = endAngle + (j * Math.PI) / capSteps;
    outlinePoints.push({
      x: pLast.x + Math.cos(angle) * brushRadius,
      y: pLast.y + Math.sin(angle) * brushRadius
    });
  }
  outlinePoints.push({ x: leftPts[numPoints - 1].x, y: leftPts[numPoints - 1].y });
  
  for (let i = numPoints - 2; i >= 1; i--) {
    outlinePoints.push({ x: leftPts[i].x, y: leftPts[i].y });
  }
  
  // Enforce CCW winding
  let area = 0;
  const n = outlinePoints.length;
  for (let i = 0; i < n; i++) {
    const p1 = outlinePoints[i];
    const p2 = outlinePoints[(i + 1) % n];
    area += p1.x * p2.y - p2.x * p1.y;
  }
  if (area < 0) {
    outlinePoints.reverse();
  }
  
  return outlinePoints;
}

// Generate the 2D contour paths for a stroke (returns array of paths, each path is array of points)
function getStrokeOutlineContours(stroke, scaleFactor, brushRadius, transformPt, rotateAngle, isMirrored) {
  if (stroke.type === 'freehand') {
    const rawPts = stroke.points.map(p => ({ x: p.x * scaleFactor, y: p.y * scaleFactor }));
    const epsilon = Math.max(0.015, brushRadius * 0.04);
    const pts = simplifyPath(rawPts, epsilon);
    const transformedPts = pts.map(pt => transformPt(pt.x, pt.y));
    const outline = createStrokeOutline(transformedPts, brushRadius);
    return outline ? [outline] : [];
    
  } else if (stroke.type === 'line') {
    const p1 = transformPt(stroke.x1 * scaleFactor, stroke.y1 * scaleFactor);
    const p2 = transformPt(stroke.x2 * scaleFactor, stroke.y2 * scaleFactor);
    const outline = createStrokeOutline([p1, p2], brushRadius);
    return outline ? [outline] : [];
    
  } else if (stroke.type === 'circle') {
    const center = transformPt(stroke.cx * scaleFactor, stroke.cy * scaleFactor);
    const r = stroke.r * scaleFactor;
    
    // Outer circle (CCW)
    const outer = [];
    const numSegs = 64;
    for (let j = 0; j < numSegs; j++) {
      const a = (j * Math.PI * 2) / numSegs;
      outer.push({ x: center.x + Math.cos(a) * (r + brushRadius), y: center.y + Math.sin(a) * (r + brushRadius) });
    }
    
    const contours = [outer];
    
    // Inner hole (CW)
    const innerRadius = r - brushRadius;
    if (innerRadius > 0.001) {
      const inner = [];
      for (let j = numSegs - 1; j >= 0; j--) {
        const a = (j * Math.PI * 2) / numSegs;
        inner.push({ x: center.x + Math.cos(a) * innerRadius, y: center.y + Math.sin(a) * innerRadius });
      }
      contours.push(inner);
    }
    return contours;
    
  } else if (stroke.type === 'polygon') {
    const center = transformPt(stroke.cx * scaleFactor, stroke.cy * scaleFactor);
    const r = stroke.r * scaleFactor;
    const sides = stroke.sides;
    const baseAngle = isMirrored ? -stroke.angle : stroke.angle;
    const finalAngle = baseAngle + rotateAngle;
    
    // Outer polygon (CCW)
    const outer = [];
    for (let j = 0; j < sides; j++) {
      const a = finalAngle + (j * Math.PI * 2) / sides;
      outer.push({ x: center.x + Math.cos(a) * (r + brushRadius), y: center.y + Math.sin(a) * (r + brushRadius) });
    }
    
    const contours = [outer];
    
    // Inner hole (CW)
    const innerRadius = r - brushRadius;
    if (innerRadius > 0.001) {
      const inner = [];
      for (let j = sides - 1; j >= 0; j--) {
        const a = finalAngle + (j * Math.PI * 2) / sides;
        inner.push({ x: center.x + Math.cos(a) * innerRadius, y: center.y + Math.sin(a) * innerRadius });
      }
      contours.push(inner);
    }
    return contours;
  }
  return [];
}

// Generate all symmetric/mirrored contour paths for a stroke
function getSymmetricContours(stroke, scaleFactor, brushRadius, S, mirror) {
  const contours = [];
  
  for (let i = 0; i < S; i++) {
    const rotateAngle = (i * Math.PI * 2) / S;
    const cosA = Math.cos(rotateAngle);
    const sinA = Math.sin(rotateAngle);
    
    // Original orientation
    const rotatePt = (x, y) => ({
      x: x * cosA - y * sinA,
      y: x * sinA + y * cosA
    });
    
    const originalContours = getStrokeOutlineContours(stroke, scaleFactor, brushRadius, rotatePt, rotateAngle, false);
    originalContours.forEach(c => contours.push(c));
    
    // Mirrored orientation
    if (mirror && S > 1) {
      const mirrorRotatePt = (x, y) => {
        const my = -y;
        return {
          x: x * cosA - my * sinA,
          y: x * sinA + my * cosA
        };
      };
      
      const mirroredContours = getStrokeOutlineContours(stroke, scaleFactor, brushRadius, mirrorRotatePt, rotateAngle, true);
      mirroredContours.forEach(c => contours.push(c));
    }
  }
  
  return contours;
}

// Helper to convert Clipper PolyTree to THREE.Shape objects
function polyTreeToShapes(polyTree, scale = 10000) {
  const THREE = window.THREE;
  const shapes = [];
  
  function traverse(node, parentShape) {
    const children = typeof node.Childs === 'function' ? node.Childs() : node.Childs;
    if (!children) return;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const contour = typeof child.Contour === 'function' ? child.Contour() : child.Contour;
      
      if (contour && contour.length > 0) {
        const pts = contour.map(pt => new THREE.Vector2(pt.X / scale, pt.Y / scale));
        
        const isHole = typeof child.IsHole === 'function' ? child.IsHole() : child.IsHole;
        if (!isHole) {
          const shape = new THREE.Shape(pts);
          shapes.push(shape);
          traverse(child, shape);
        } else {
          if (parentShape) {
            const holePath = new THREE.Path(pts);
            parentShape.holes.push(holePath);
          }
          traverse(child, null);
        }
      }
    }
  }
  
  traverse(polyTree, null);
  return shapes;
}

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

  // Extrude the 2D mandala layout into a 3D model (using clean outline extrusions)
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
      
      // Collect all 2D outlines for this layer
      const layerContours = [];
      layer.strokes.forEach((stroke) => {
        const contours = getSymmetricContours(stroke, scaleFactor, brushRadius, S, mirror);
        contours.forEach(c => layerContours.push(c));
      });
      
      if (layerContours.length > 0) {
        let finalShapes = [];
        
        // Try to perform 2D Union using ClipperLib if loaded
        const ClipperLib = window.ClipperLib;
        if (ClipperLib) {
          try {
            const scale = 10000;
            const clipper = new ClipperLib.Clipper();
            
            layerContours.forEach((contour) => {
              const clipperPath = contour.map(pt => ({
                X: Math.round(pt.x * scale),
                Y: Math.round(pt.y * scale)
              }));
              clipper.AddPath(clipperPath, ClipperLib.PolyType.ptSubject, true);
            });
            
            const polyTree = new ClipperLib.PolyTree();
            clipper.Execute(
              ClipperLib.ClipType.ctUnion,
              polyTree,
              ClipperLib.PolyFillType.pftNonZero,
              ClipperLib.PolyFillType.pftNonZero
            );
            
            finalShapes = polyTreeToShapes(polyTree, scale);
          } catch (err) {
            console.error("Clipper union failed for layer, falling back to non-unioned shapes:", err);
            // Fallback: convert contours to THREE.Shapes directly
            finalShapes = layerContours.map(c => new THREE.Shape(c.map(pt => new THREE.Vector2(pt.x, pt.y))));
          }
        } else {
          // Fallback if ClipperLib is not loaded
          finalShapes = layerContours.map(c => new THREE.Shape(c.map(pt => new THREE.Vector2(pt.x, pt.y))));
        }
        
        // Extrude all shapes
        const geometries = [];
        finalShapes.forEach((shape) => {
          const currentExtrudeSettings = { depth: layerHeight, bevelEnabled: false };
          const strokeGeo = new THREE.ExtrudeGeometry(shape, currentExtrudeSettings);
          geometries.push(strokeGeo);
        });
        
        if (geometries.length > 0) {
          try {
            let mergedGeo = THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);
            mergedGeo = THREE.BufferGeometryUtils.mergeVertices(mergedGeo, 0.01);
            const layerMesh = new THREE.Mesh(mergedGeo, activeMaterial);
            layerMesh.name = `Layer_${layer.name.replace(/\s+/g, '_')}`;
            layerMesh.userData = { brushColor: layer.brushColor, type: 'layer' };
            layerMesh.castShadow = true;
            layerMesh.receiveShadow = true;
            
            // Shift UP by base thickness minus a small overlap (0.05 mm) to prevent coplanar touching faces
            if (baseType !== 'none' && baseThickness > 0) {
              layerMesh.position.z = baseThickness - 0.05;
            }
            
            this.mandalaGroup.add(layerMesh);
          } catch (e) {
            console.error("Error creating layer mesh:", e);
          }
          geometries.forEach(geo => geo.dispose());
        }
      }
    });
    
    // 2. Build Base Plate (solid backing or conforming outline backing)
    if (baseType !== 'none' && baseThickness > 0) {
      if (baseType === 'conforming-outline') {
        // Conforming backing: duplicate all strokes with an expanded brush size
        const backingContours = [];
        mandala.layers.forEach((layer) => {
          if (!layer.visible || layer.strokes.length === 0) return;
          
          const S = layer.symmetry;
          const mirror = layer.mirror;
          const expandedBrushRadius = ((layer.brushSize + 2 * baseBorder) * scaleFactor * 10) / 2;
          
          layer.strokes.forEach((stroke) => {
            const contours = getSymmetricContours(stroke, scaleFactor, expandedBrushRadius, S, mirror);
            contours.forEach(c => backingContours.push(c));
          });
        });
        
        if (backingContours.length > 0) {
          let finalShapes = [];
          const ClipperLib = window.ClipperLib;
          if (ClipperLib) {
            try {
              const scale = 10000;
              const clipper = new ClipperLib.Clipper();
              backingContours.forEach((contour) => {
                const clipperPath = contour.map(pt => ({
                  X: Math.round(pt.x * scale),
                  Y: Math.round(pt.y * scale)
                }));
                clipper.AddPath(clipperPath, ClipperLib.PolyType.ptSubject, true);
              });
              
              const polyTree = new ClipperLib.PolyTree();
              clipper.Execute(
                ClipperLib.ClipType.ctUnion,
                polyTree,
                ClipperLib.PolyFillType.pftNonZero,
                ClipperLib.PolyFillType.pftNonZero
              );
              finalShapes = polyTreeToShapes(polyTree, scale);
            } catch (err) {
              console.error("Clipper union failed for conforming base, falling back:", err);
              finalShapes = backingContours.map(c => new THREE.Shape(c.map(pt => new THREE.Vector2(pt.x, pt.y))));
            }
          } else {
            finalShapes = backingContours.map(c => new THREE.Shape(c.map(pt => new THREE.Vector2(pt.x, pt.y))));
          }
          
          const geometries = [];
          finalShapes.forEach((shape) => {
            const currentExtrudeSettings = { depth: baseThickness, bevelEnabled: false };
            const strokeGeo = new THREE.ExtrudeGeometry(shape, currentExtrudeSettings);
            geometries.push(strokeGeo);
          });
          
          if (geometries.length > 0) {
            try {
              let mergedGeo = THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);
              mergedGeo = THREE.BufferGeometryUtils.mergeVertices(mergedGeo, 0.01);
              const conformingMesh = new THREE.Mesh(mergedGeo, activeMaterial);
              conformingMesh.name = "Base_Plate";
              conformingMesh.userData = { brushColor: '#e2e8f0', type: 'base' };
              conformingMesh.castShadow = true;
              conformingMesh.receiveShadow = true;
              this.mandalaGroup.add(conformingMesh);
            } catch (e) {
              console.error("Error creating conforming base:", e);
            }
            geometries.forEach(geo => geo.dispose());
          }
        }
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
          const numHoleSegs = 32;
          for (let i = 0; i < numHoleSegs; i++) {
            const a = (i * Math.PI * -2) / numHoleSegs;
            if (i === 0) holePath.moveTo(holeX + Math.cos(a) * holeRadius, holeY + Math.sin(a) * holeRadius);
            else holePath.lineTo(holeX + Math.cos(a) * holeRadius, holeY + Math.sin(a) * holeRadius);
          }
          holePath.closePath();
          shape.holes.push(holePath);
        }
        
        const currentExtrudeSettings = { depth: baseThickness, bevelEnabled: false };
        const baseGeo = new THREE.ExtrudeGeometry(shape, currentExtrudeSettings);
        const weldedBaseGeo = THREE.BufferGeometryUtils.mergeVertices(baseGeo, 0.01);
        baseGeo.dispose();
        
        const baseMesh = new THREE.Mesh(weldedBaseGeo, activeMaterial);
        baseMesh.name = "Base_Plate";
        baseMesh.userData = { brushColor: '#e2e8f0', type: 'base' };
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        
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
          // Circle (manual segment loop to avoid duplicate start/end point)
          const numSegs = 64;
          for (let i = 0; i < numSegs; i++) {
            const a = (i * Math.PI * 2) / numSegs;
            if (i === 0) shape.moveTo(Math.cos(a) * baseRadius, Math.sin(a) * baseRadius);
            else shape.lineTo(Math.cos(a) * baseRadius, Math.sin(a) * baseRadius);
          }
          shape.closePath();
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
          const numHoleSegs = 32;
          for (let i = 0; i < numHoleSegs; i++) {
            const a = (i * Math.PI * -2) / numHoleSegs;
            if (i === 0) holePath.moveTo(holeX + Math.cos(a) * holeRadius, holeY + Math.sin(a) * holeRadius);
            else holePath.lineTo(holeX + Math.cos(a) * holeRadius, holeY + Math.sin(a) * holeRadius);
          }
          holePath.closePath();
          shape.holes.push(holePath);
        }
        
        const currentExtrudeSettings = { depth: baseThickness, bevelEnabled: false };
        const baseGeo = new THREE.ExtrudeGeometry(shape, currentExtrudeSettings);
        const weldedBaseGeo = THREE.BufferGeometryUtils.mergeVertices(baseGeo, 0.01);
        baseGeo.dispose();
        
        const baseMesh = new THREE.Mesh(weldedBaseGeo, activeMaterial);
        baseMesh.name = "Base_Plate";
        baseMesh.userData = { brushColor: '#e2e8f0', type: 'base' };
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        this.mandalaGroup.add(baseMesh);
      }
    }
    
    // 3. Update UI Metadata info
    this.updateStats();
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
          const indices = indexAttr.array;
          for (let i = 0; i < indexAttr.count; i += 3) {
            const idx1 = indices[i];
            const idx2 = indices[i + 1];
            const idx3 = indices[i + 2];
            
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
    
    // Ensure matrices are updated
    this.scene.updateMatrixWorld(true);
    
    let totalVertices = 0;
    
    this.mandalaGroup.children.forEach((mesh) => {
      if (!mesh.isMesh || !mesh.geometry) return;
      
      const geom = mesh.geometry;
      const positionAttr = geom.attributes.position;
      if (!positionAttr) return;
      
      const name = mesh.name || "Object";
      objText += `o ${name}\n`;
      objText += `g ${name}\n`;
      
      // Perform position-based vertex welding on export
      const uniqueVertices = [];
      const vertexMap = new Map();
      const matrix = mesh.matrixWorld;
      
      function getVertexKey(x, y, z) {
        return `${x.toFixed(4)}_${y.toFixed(4)}_${z.toFixed(4)}`;
      }

      const indexAttr = geom.index;
      const indices = indexAttr ? indexAttr.array : null;
      const numFaces = indices ? indices.length / 3 : positionAttr.count / 3;
      const weldedTriangles = [];

      for (let i = 0; i < numFaces; i++) {
        let idx1, idx2, idx3;
        if (indices) {
          idx1 = indices[i * 3];
          idx2 = indices[i * 3 + 1];
          idx3 = indices[i * 3 + 2];
        } else {
          idx1 = i * 3;
          idx2 = i * 3 + 1;
          idx3 = i * 3 + 2;
        }

        const v1 = new THREE.Vector3(positionAttr.getX(idx1), positionAttr.getY(idx1), positionAttr.getZ(idx1)).applyMatrix4(matrix);
        const v2 = new THREE.Vector3(positionAttr.getX(idx2), positionAttr.getY(idx2), positionAttr.getZ(idx2)).applyMatrix4(matrix);
        const v3 = new THREE.Vector3(positionAttr.getX(idx3), positionAttr.getY(idx3), positionAttr.getZ(idx3)).applyMatrix4(matrix);

        const keys = [
          getVertexKey(v1.x, v1.y, v1.z),
          getVertexKey(v2.x, v2.y, v2.z),
          getVertexKey(v3.x, v3.y, v3.z)
        ];

        const mappedIndices = [];
        const vectors = [v1, v2, v3];

        for (let k = 0; k < 3; k++) {
          const key = keys[k];
          if (!vertexMap.has(key)) {
            vertexMap.set(key, uniqueVertices.length);
            uniqueVertices.push(vectors[k]);
          }
          mappedIndices.push(vertexMap.get(key));
        }

        weldedTriangles.push(mappedIndices);
      }

      // Write vertices
      uniqueVertices.forEach((v) => {
        objText += `v ${v.x.toFixed(4)} ${v.y.toFixed(4)} ${v.z.toFixed(4)}\n`;
      });
      
      const startIdx = totalVertices + 1; // 1-based index offset
      
      // Write faces
      weldedTriangles.forEach((tri) => {
        const v1 = tri[0] + startIdx;
        const v2 = tri[1] + startIdx;
        const v3 = tri[2] + startIdx;
        objText += `f ${v1} ${v2} ${v3}\n`;
      });
      
      objText += "\n";
      totalVertices += uniqueVertices.length;
    });
    
    return new Blob([objText], { type: 'text/plain' });
  }

  // Export current meshes in group as a Multi-Color/Multi-Part 3MF zip file
  async exportTo3MF() {
    const THREE = window.THREE;
    const JSZip = window.JSZip;
    if (!JSZip) {
      throw new Error("JSZip library not loaded. Check your internet connection or CDN configuration.");
    }

    // Ensure matrices are updated
    this.scene.updateMatrixWorld(true);

    const zip = new JSZip();

    // 1. Gather all meshes in mandalaGroup
    const meshes = [];
    this.mandalaGroup.traverse((node) => {
      if (node.isMesh && node.geometry) {
        meshes.push(node);
      }
    });

    if (meshes.length === 0) {
      throw new Error("No meshes to export");
    }

    // 2. Identify unique colors and map them to base materials
    const uniqueColors = [];
    const colorIndexMap = new Map();

    const getHexColor = (colorVal) => {
      if (typeof colorVal === 'string') {
        let hex = colorVal.trim();
        if (hex.startsWith('#')) return hex.toUpperCase();
        return '#CCCCCC';
      }
      if (colorVal && typeof colorVal.getHexString === 'function') {
        return '#' + colorVal.getHexString().toUpperCase();
      }
      return '#CCCCCC';
    };

    meshes.forEach((mesh) => {
      let colorStr = '#CCCCCC';
      if (mesh.userData && mesh.userData.brushColor) {
        colorStr = getHexColor(mesh.userData.brushColor);
      } else if (mesh.material && mesh.material.color) {
        colorStr = getHexColor(mesh.material.color);
      }
      
      if (!colorIndexMap.has(colorStr)) {
        colorIndexMap.set(colorStr, uniqueColors.length);
        uniqueColors.push(colorStr);
      }
    });

    // 3. Build 3D/3dmodel.model XML string
    let modelXml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">\n' +
      '  <metadata name="Title">Mendala Design</metadata>\n' +
      '  <metadata name="Application">Mendala Radial 3D Print Designer</metadata>\n' +
      '  <resources>\n' +
      '    <basematerials id="1">\n';

    uniqueColors.forEach((color, idx) => {
      modelXml += '      <base name="Color_' + (idx + 1) + '" displaycolor="' + color + '" />\n';
    });

    modelXml += '    </basematerials>\n\n';

    let objectId = 2;
    const meshObjectIds = [];

    // Map to store geometry XML for each mesh
    meshes.forEach((mesh) => {
      const geom = mesh.geometry;
      const matrix = mesh.matrixWorld;
      
      const positionAttr = geom.attributes.position;
      if (!positionAttr) return;

      const indexAttr = geom.index;
      const currentMeshId = objectId++;
      const nameVal = mesh.name || ('Part_' + currentMeshId);
      meshObjectIds.push({ id: currentMeshId, name: nameVal });

      // Perform position-based vertex welding on export
      const uniqueVertices = [];
      const vertexMap = new Map();
      
      function getVertexKey(x, y, z) {
        return `${x.toFixed(4)}_${y.toFixed(4)}_${z.toFixed(4)}`;
      }

      const indices = indexAttr ? indexAttr.array : null;
      const numFaces = indices ? indices.length / 3 : positionAttr.count / 3;
      const weldedTriangles = [];

      for (let i = 0; i < numFaces; i++) {
        let idx1, idx2, idx3;
        if (indices) {
          idx1 = indices[i * 3];
          idx2 = indices[i * 3 + 1];
          idx3 = indices[i * 3 + 2];
        } else {
          idx1 = i * 3;
          idx2 = i * 3 + 1;
          idx3 = i * 3 + 2;
        }

        const v1 = new THREE.Vector3(positionAttr.getX(idx1), positionAttr.getY(idx1), positionAttr.getZ(idx1)).applyMatrix4(matrix);
        const v2 = new THREE.Vector3(positionAttr.getX(idx2), positionAttr.getY(idx2), positionAttr.getZ(idx2)).applyMatrix4(matrix);
        const v3 = new THREE.Vector3(positionAttr.getX(idx3), positionAttr.getY(idx3), positionAttr.getZ(idx3)).applyMatrix4(matrix);

        const keys = [
          getVertexKey(v1.x, v1.y, v1.z),
          getVertexKey(v2.x, v2.y, v2.z),
          getVertexKey(v3.x, v3.y, v3.z)
        ];

        const mappedIndices = [];
        const vectors = [v1, v2, v3];

        for (let k = 0; k < 3; k++) {
          const key = keys[k];
          if (!vertexMap.has(key)) {
            vertexMap.set(key, uniqueVertices.length);
            uniqueVertices.push(vectors[k]);
          }
          mappedIndices.push(vertexMap.get(key));
        }

        weldedTriangles.push(mappedIndices);
      }

      modelXml += '    <object id="' + currentMeshId + '" type="model" name="' + nameVal + '">\n';
      modelXml += '      <mesh>\n';
      modelXml += '        <vertices>\n';

      // Write unique welded vertices
      uniqueVertices.forEach((v) => {
        modelXml += '          <vertex x="' + v.x.toFixed(4) + '" y="' + v.y.toFixed(4) + '" z="' + v.z.toFixed(4) + '" />\n';
      });

      modelXml += '        </vertices>\n';
      modelXml += '        <triangles>\n';

      // Get color index for this mesh
      let colorStr = '#CCCCCC';
      if (mesh.userData && mesh.userData.brushColor) {
        colorStr = getHexColor(mesh.userData.brushColor);
      } else if (mesh.material && mesh.material.color) {
        colorStr = getHexColor(mesh.material.color);
      }
      const colorIndex = colorIndexMap.get(colorStr) || 0;

      // Write welded triangles
      weldedTriangles.forEach((tri) => {
        modelXml += '          <triangle v1="' + tri[0] + '" v2="' + tri[1] + '" v3="' + tri[2] + '" pid="1" pindex="' + colorIndex + '" />\n';
      });

      modelXml += '        </triangles>\n';
      modelXml += '      </mesh>\n';
      modelXml += '    </object>\n\n';
    });

    // Create assembly group containing all mesh components
    const assemblyId = objectId++;
    modelXml += '    <object id="' + assemblyId + '" type="model" name="Mandala_Assembly">\n';
    modelXml += '      <components>\n';
    meshObjectIds.forEach((item) => {
      modelXml += '        <component objectid="' + item.id + '" />\n';
    });
    modelXml += '      </components>\n';
    modelXml += '    </object>\n';

    modelXml += '  </resources>\n';
    modelXml += '  <build>\n';
    modelXml += '    <item objectid="' + assemblyId + '" />\n';
    modelXml += '  </build>\n';
    modelXml += '</model>\n';

    // 4. Create OPC package structure
    const contentTypesXml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n' +
      '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n' +
      '  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>\n' +
      '</Types>';

    const relsXml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n' +
      '  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n' +
      '</Relationships>';

    zip.file("[Content_Types].xml", contentTypesXml);
    zip.file("_rels/.rels", relsXml);
    zip.file("3D/3dmodel.model", modelXml);

    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
    return blob;
  }
}

/**
 * Analyzes a Three.js BufferGeometry for non-manifold and boundary edges.
 * @param {THREE.BufferGeometry} geometry - The welded geometry to check.
 * @returns {{isManifold: boolean, boundaryEdges: number, nonManifoldEdges: number, totalEdges: number}}
 */
export function analyzeMeshManifold(geometry) {
  const indexAttr = geometry.index;
  const positionAttr = geometry.attributes.position;
  if (!positionAttr) {
    return { isManifold: false, boundaryEdges: 0, nonManifoldEdges: 0, totalEdges: 0 };
  }

  const edgeMap = new Map();
  const indices = indexAttr ? indexAttr.array : null;
  const numFaces = indices ? indices.length / 3 : positionAttr.count / 3;

  function getEdgeKey(v1, v2) {
    return v1 < v2 ? `${v1}_${v2}` : `${v2}_${v1}`;
  }

  for (let i = 0; i < numFaces; i++) {
    let v1, v2, v3;
    if (indices) {
      v1 = indices[i * 3];
      v2 = indices[i * 3 + 1];
      v3 = indices[i * 3 + 2];
    } else {
      v1 = i * 3;
      v2 = i * 3 + 1;
      v3 = i * 3 + 2;
    }

    const e1 = getEdgeKey(v1, v2);
    const e2 = getEdgeKey(v2, v3);
    const e3 = getEdgeKey(v3, v1);

    edgeMap.set(e1, (edgeMap.get(e1) || 0) + 1);
    edgeMap.set(e2, (edgeMap.get(e2) || 0) + 1);
    edgeMap.set(e3, (edgeMap.get(e3) || 0) + 1);
  }

  let boundaryEdges = 0;
  let nonManifoldEdges = 0;

  for (const [edge, count] of edgeMap.entries()) {
    if (count === 1) {
      boundaryEdges++;
    } else if (count > 2) {
      nonManifoldEdges++;
    }
  }

  return {
    isManifold: boundaryEdges === 0 && nonManifoldEdges === 0,
    boundaryEdges,
    nonManifoldEdges,
    totalEdges: edgeMap.size
  };
}

