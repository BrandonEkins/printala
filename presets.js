// Predefined beautiful design templates for Mendala
export const presets = {
  flower_of_life: {
    projectName: "flower_of_life",
    layers: [
      {
        id: "preset-fol-layer-1",
        name: "Flower of Life",
        symmetry: 6,
        mirror: false,
        brushColor: "#ec4899", // Vibrant Pink
        brushSize: 0.6,
        height: 1.2,
        visible: true,
        smoothing: 0,
        strokes: [
          // Central circle
          { type: 'circle', cx: 0, cy: 0, r: 100 },
          // First ring: 6 circles centered on the central circle's circumference
          { type: 'circle', cx: 100, cy: 0, r: 100 },
          // Second ring: 6 circles centered at distance 200
          { type: 'circle', cx: 200, cy: 0, r: 100 },
          // Inner intersections: 6 circles centered at distance 173.205 (200 * cos(30)) at 30 degrees
          { type: 'circle', cx: 173.205, cy: 100, r: 100 },
          // Border circles to enclose the pattern beautifully
          { type: 'circle', cx: 0, cy: 0, r: 300 },
          { type: 'circle', cx: 0, cy: 0, r: 310 }
        ]
      }
    ],
    activeLayerId: "preset-fol-layer-1"
  },
  symmetrical_star: {
    projectName: "symmetrical_star",
    layers: [
      {
        id: "preset-star-layer-1",
        name: "Star Core",
        symmetry: 8,
        mirror: true,
        brushColor: "#f59e0b", // Warm Yellow
        brushSize: 0.8,
        height: 1.5,
        visible: true,
        smoothing: 0,
        strokes: [
          { type: 'circle', cx: 0, cy: 0, r: 40 },
          { type: 'polygon', cx: 0, cy: 0, r: 80, sides: 4, angle: 0 },
          { type: 'polygon', cx: 0, cy: 0, r: 120, sides: 3, angle: 0 },
          { type: 'line', x1: 0, y1: 80, x2: 0, y2: 200 }
        ]
      },
      {
        id: "preset-star-layer-2",
        name: "Star Frame",
        symmetry: 16,
        mirror: true,
        brushColor: "#06b6d4", // Electric Cyan
        brushSize: 0.5,
        height: 2.2,
        visible: true,
        smoothing: 0,
        strokes: [
          { type: 'circle', cx: 0, cy: 0, r: 240 },
          { type: 'circle', cx: 0, cy: 240, r: 35 },
          { type: 'line', x1: 0, y1: 200, x2: 45, y2: 240 },
          { type: 'line', x1: 0, y1: 240, x2: 0, y2: 300 }
        ]
      }
    ],
    activeLayerId: "preset-star-layer-1"
  },
  winter_snowflake: {
    projectName: "winter_snowflake",
    layers: [
      {
        id: "preset-snow-layer-1",
        name: "Snow Crystal",
        symmetry: 6,
        mirror: true,
        brushColor: "#3b82f6", // Electric Blue
        brushSize: 0.7,
        height: 1.8,
        visible: true,
        smoothing: 0,
        strokes: [
          // Central base
          { type: 'circle', cx: 0, cy: 0, r: 50 },
          { type: 'circle', cx: 0, cy: 0, r: 110 },
          // Main stem
          { type: 'line', x1: 0, y1: 0, x2: 0, y2: 350 },
          // Branch spurs
          { type: 'line', x1: 0, y1: 120, x2: 60, y2: 180 },
          { type: 'line', x1: 0, y1: 220, x2: 50, y2: 270 },
          { type: 'line', x1: 0, y1: 290, x2: 30, y2: 320 },
          // Tip crystal
          { type: 'polygon', cx: 0, cy: 350, r: 18, sides: 6, angle: Math.PI / 6 },
          // Inter-arm accents
          { type: 'circle', cx: 0, cy: 160, r: 12 }
        ]
      }
    ],
    activeLayerId: "preset-snow-layer-1"
  }
};
