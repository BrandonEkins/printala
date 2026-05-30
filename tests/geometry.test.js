// Self-contained geometry regression test suite for Mendala
const fs = require('fs');
const https = require('https');
const path = require('path');
const assert = require('assert');

const CACHE_DIR = path.join(__dirname, '.cache');
const CLIPPER_URL = 'https://cdn.jsdelivr.net/npm/clipper-lib@6.4.2/clipper.min.js';
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.js';

const clipperPath = path.join(CACHE_DIR, 'clipper.min.js');
const threePath = path.join(CACHE_DIR, 'three.js');

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      resolve();
      return;
    }
    console.log(`Downloading test dependency: ${path.basename(dest)}...`);
    const file = fs.createWriteStream(dest);
    https.get(url, response => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: status code ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', err => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function runTests() {
  try {
    await download(CLIPPER_URL, clipperPath);
    await download(THREE_URL, threePath);
    
    // Set up mock global browser environment
    global.window = global;
    global.self = global;
    
    // Load dependencies into global namespace
    global.ClipperLib = require(clipperPath);
    global.THREE = require(threePath);
    
    // Load OrbitControls & BufferGeometryUtils (mock minimum since we only need BufferGeometryUtils.mergeBufferGeometries)
    global.THREE.BufferGeometryUtils = {
      mergeBufferGeometries: (geoms) => {
        if (geoms.length === 0) return null;
        // Simple mock geometry merging for test validation
        const totalPositions = geoms.reduce((acc, g) => acc + g.attributes.position.count, 0);
        const merged = new global.THREE.BufferGeometry();
        const array = new Float32Array(totalPositions * 3);
        merged.setAttribute('position', new global.THREE.BufferAttribute(array, 3));
        return merged;
      },
      mergeVertices: (geom) => geom
    };
    
    // Load and evaluate preview3d.js
    const preview3dFilePath = path.join(__dirname, '..', 'preview3d.js');
    if (!fs.existsSync(preview3dFilePath)) {
      throw new Error(`preview3d.js not found at ${preview3dFilePath}`);
    }
    
    const preview3dCode = fs.readFileSync(preview3dFilePath, 'utf8')
      .replace(/export class/g, 'class')
      .replace(/export function/g, 'function');
      
    eval(preview3dCode + `
      global.createStrokeOutline = createStrokeOutline;
      global.getSymmetricContours = getSymmetricContours;
      global.polyTreeToShapes = polyTreeToShapes;
      global.simplifyPath = simplifyPath;
      global.getStrokeOutlineContours = getStrokeOutlineContours;
      global.analyzeMeshManifold = analyzeMeshManifold;
    `);
    
    console.log('✔ Successfully loaded preview3d.js dependencies');
    
    // ----------------------------------------------------
    // Test 1: PolyTree to Shape Conversion
    // ----------------------------------------------------
    console.log('\nRunning Test 1: PolyTree conversion correctness...');
    const clipper = new global.ClipperLib.Clipper();
    
    // Add a simple square outline contour: 10x10 square at origin
    const squareContour = [
      { x: -5, y: -5 },
      { x: 5, y: -5 },
      { x: 5, y: 5 },
      { x: -5, y: 5 }
    ];
    
    const scale = 10000;
    const clipperPathData = squareContour.map(pt => ({
      X: Math.round(pt.x * scale),
      Y: Math.round(pt.y * scale)
    }));
    
    clipper.AddPath(clipperPathData, global.ClipperLib.PolyType.ptSubject, true);
    
    const polyTree = new global.ClipperLib.PolyTree();
    const success = clipper.Execute(
      global.ClipperLib.ClipType.ctUnion,
      polyTree,
      global.ClipperLib.PolyFillType.pftNonZero,
      global.ClipperLib.PolyFillType.pftNonZero
    );
    
    assert.strictEqual(success, true, 'Clipper Union execution failed');
    
    const shapes = global.polyTreeToShapes(polyTree, scale);
    assert.ok(shapes.length > 0, 'polyTreeToShapes returned empty array');
    assert.strictEqual(shapes.length, 1, 'Expected exactly 1 shape from a single outline');
    console.log(`✔ Test 1 passed: Converted ${shapes.length} shapes from PolyTree`);
    
    // ----------------------------------------------------
    // Test 2: Symmetric Contours and Extrusion
    // ----------------------------------------------------
    console.log('\nRunning Test 2: Symmetric contours and Three.js extrusion...');
    const stroke = {
      type: 'freehand',
      points: [
        { x: -10, y: -10 },
        { x: 0, y: 0 },
        { x: 10, y: 10 }
      ]
    };
    
    const scaleFactor = 0.1;
    const brushRadius = 0.5;
    const S = 4;
    const mirror = true;
    
    const contours = global.getSymmetricContours(stroke, scaleFactor, brushRadius, S, mirror);
    assert.ok(contours.length > 0, 'getSymmetricContours returned empty contours array');
    console.log(`Generated contours count: ${contours.length}`);
    
    // Perform Clipper Union on symmetric contours
    const layerClipper = new global.ClipperLib.Clipper();
    contours.forEach(c => {
      const p = c.map(pt => ({ X: Math.round(pt.x * scale), Y: Math.round(pt.y * scale) }));
      layerClipper.AddPath(p, global.ClipperLib.PolyType.ptSubject, true);
    });
    
    const layerPolyTree = new global.ClipperLib.PolyTree();
    layerClipper.Execute(
      global.ClipperLib.ClipType.ctUnion,
      layerPolyTree,
      global.ClipperLib.PolyFillType.pftNonZero,
      global.ClipperLib.PolyFillType.pftNonZero
    );
    
    const unifiedShapes = global.polyTreeToShapes(layerPolyTree, scale);
    assert.ok(unifiedShapes.length > 0, 'Union polyTreeToShapes returned empty array');
    
    unifiedShapes.forEach((shape, index) => {
      const extrudeSettings = { depth: 1.0, bevelEnabled: false };
      const geo = new global.THREE.ExtrudeGeometry(shape, extrudeSettings);
      assert.ok(geo.attributes.position.count > 0, `ExtrudeGeometry for shape ${index} has 0 vertices`);
      console.log(`✔ Shape ${index} extruded successfully. Vertices: ${geo.attributes.position.count}`);
    });
    
    console.log('✔ Test 2 passed successfully');
    
    // ----------------------------------------------------
    // Test 3: Manifold Checking Analysis
    // ----------------------------------------------------
    console.log('\nRunning Test 3: Manifold checker validation...');
    
    // Case A: Manifold closed welded Cube
    const boxGeo = new global.THREE.BufferGeometry();
    const boxVertices = new Float32Array([
      -1, -1, -1, // 0
       1, -1, -1, // 1
       1,  1, -1, // 2
      -1,  1, -1, // 3
      -1, -1,  1, // 4
       1, -1,  1, // 5
       1,  1,  1, // 6
      -1,  1,  1  // 7
    ]);
    const boxIndices = [
      0, 1, 2,  0, 2, 3,
      1, 5, 6,  1, 6, 2,
      5, 4, 7,  5, 7, 6,
      4, 0, 3,  4, 3, 7,
      3, 2, 6,  3, 6, 7,
      4, 5, 1,  4, 1, 0
    ];
    boxGeo.setAttribute('position', new global.THREE.BufferAttribute(boxVertices, 3));
    boxGeo.setIndex(boxIndices);
    const boxAnalysis = global.analyzeMeshManifold(boxGeo);
    
    console.log('Welded cube manifold report:', boxAnalysis);
    assert.strictEqual(boxAnalysis.isManifold, true, 'Welded cube geometry should be manifold');
    assert.strictEqual(boxAnalysis.boundaryEdges, 0, 'Welded cube should have 0 boundary/leak edges');
    assert.strictEqual(boxAnalysis.nonManifoldEdges, 0, 'Welded cube should have 0 non-manifold edges');
    console.log('✔ Case A passed: Welded cube is manifold');

    // Case B: Open mesh (Single flat triangle)
    const triangleGeo = new global.THREE.BufferGeometry();
    const vertices = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0
    ]);
    triangleGeo.setAttribute('position', new global.THREE.BufferAttribute(vertices, 3));
    const triangleAnalysis = global.analyzeMeshManifold(triangleGeo);
    
    console.log('Single triangle open geometry report:', triangleAnalysis);
    assert.strictEqual(triangleAnalysis.isManifold, false, 'Open flat triangle should not be manifold');
    assert.strictEqual(triangleAnalysis.boundaryEdges, 3, 'Single triangle should have 3 boundary/leak edges');
    assert.strictEqual(triangleAnalysis.nonManifoldEdges, 0, 'Single triangle should have 0 non-manifold edges');
    console.log('✔ Case B passed: Single triangle identified with boundaries');

    // Case C: Non-manifold T-junction (3 triangles sharing a single edge)
    const nonManifoldGeo = new global.THREE.BufferGeometry();
    // 5 vertices:
    // v0: (0,0,0), v1: (1,0,0)  <-- the shared edge
    // v2: (0,1,0), v3: (0,0,1), v4: (0,-1,0) <-- the outer points for the 3 wings
    const nmVertices = new Float32Array([
      0, 0, 0,  // 0
      1, 0, 0,  // 1
      0, 1, 0,  // 2
      0, 0, 1,  // 3
      0, -1, 0  // 4
    ]);
    const nmIndices = [
      0, 1, 2,  // Face 1: sharing (0,1)
      0, 1, 3,  // Face 2: sharing (0,1)
      0, 1, 4   // Face 3: sharing (0,1) - non-manifold edge!
    ];
    nonManifoldGeo.setAttribute('position', new global.THREE.BufferAttribute(nmVertices, 3));
    nonManifoldGeo.setIndex(nmIndices);
    const nonManifoldAnalysis = global.analyzeMeshManifold(nonManifoldGeo);
    
    console.log('T-junction geometry report:', nonManifoldAnalysis);
    assert.strictEqual(nonManifoldAnalysis.isManifold, false, 'T-junction should not be manifold');
    assert.strictEqual(nonManifoldAnalysis.nonManifoldEdges, 1, 'T-junction should have exactly 1 non-manifold edge');
    console.log('✔ Case C passed: Non-manifold edge correctly detected');

    console.log('✔ Test 3 passed successfully');
    console.log('\nAll geometry, extrusion, and manifold tests passed with flying colors! 🎉');
    process.exit(0);
    
  } catch (err) {
    console.error('\nFAIL: Test suite failed with error:', err);
    process.exit(1);
  }
}

runTests();
