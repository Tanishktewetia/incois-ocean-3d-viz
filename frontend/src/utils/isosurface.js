import * as THREE from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";
import { interpolateColor } from "./colorScale.js";

export const ISOSURFACE_RESOLUTION = 32;

function bracket(values, target) {
  if (target <= values[0]) return [0, 0, 0];
  const last = values.length - 1;
  if (target >= values[last]) return [last, last, 0];

  let upper = 1;
  while (values[upper] < target) upper += 1;
  const lower = upper - 1;
  return [lower, upper, (target - values[lower]) / (values[upper] - values[lower])];
}

function lerp(first, second, amount) {
  return first + (second - first) * amount;
}

function trilinear(corners, xAmount, yAmount, zAmount) {
  if (corners.some((value) => value === null || !Number.isFinite(value))) return null;
  const lowerFront = lerp(corners[0], corners[1], xAmount);
  const lowerBack = lerp(corners[2], corners[3], xAmount);
  const upperFront = lerp(corners[4], corners[5], xAmount);
  const upperBack = lerp(corners[6], corners[7], xAmount);
  return lerp(
    lerp(lowerFront, lowerBack, yAmount),
    lerp(upperFront, upperBack, yAmount),
    zAmount,
  );
}

export function interpolateVolume(payload, missingValue, resolution = ISOSURFACE_RESOLUTION) {
  const depths = payload.layers.map((layer) => layer.depth);
  const field = new Float32Array(resolution ** 3);
  const last = resolution - 1;

  for (let z = 0; z < resolution; z += 1) {
    const [z0, z1, zAmount] = bracket(depths, (z / last) * depths.at(-1));
    for (let y = 0; y < resolution; y += 1) {
      const sourceY = (y / last) * (payload.latitudes.length - 1);
      const y0 = Math.floor(sourceY);
      const y1 = Math.min(y0 + 1, payload.latitudes.length - 1);
      const yAmount = sourceY - y0;
      for (let x = 0; x < resolution; x += 1) {
        const sourceX = (x / last) * (payload.longitudes.length - 1);
        const x0 = Math.floor(sourceX);
        const x1 = Math.min(x0 + 1, payload.longitudes.length - 1);
        const xAmount = sourceX - x0;
        const lower = payload.layers[z0].values;
        const upper = payload.layers[z1].values;
        const value = trilinear([
          lower[y0][x0], lower[y0][x1], lower[y1][x0], lower[y1][x1],
          upper[y0][x0], upper[y0][x1], upper[y1][x0], upper[y1][x1],
        ], xAmount, yAmount, zAmount);
        field[x + y * resolution + z * resolution * resolution] = value ?? missingValue;
      }
    }
  }
  return field;
}

export function createIsosurface(payload, range, planeWidth, planeHeight, stackHeight) {
  let colorRange = range;
  let currentThreshold = (range.minimum + range.maximum) / 2;
  const material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.82,
    shininess: 55,
  });
  const mesh = new MarchingCubes(ISOSURFACE_RESOLUTION, material, false, false, 150000);
  const missingValue = range.minimum - Math.max(range.maximum - range.minimum, 1);
  mesh.field.set(interpolateVolume(payload, missingValue));
  mesh.scale.set(planeWidth / 2, planeHeight / 2, stackHeight / 2);
  // MarchingCubes coordinates increase upward; model depth increases downward.
  mesh.scale.z *= -1;
  mesh.position.z = 0;
  mesh.visible = false;
  mesh.renderOrder = 50;

  function setThreshold(threshold) {
    currentThreshold = threshold;
    mesh.isolation = threshold;
    const [red, green, blue] = interpolateColor(
      threshold,
      colorRange.minimum,
      colorRange.maximum,
    );
    material.color.setRGB(red / 255, green / 255, blue / 255, THREE.SRGBColorSpace);
    mesh.update();
  }

  return {
    mesh,
    setThreshold,
    updateVolume(nextPayload, nextRange) {
      colorRange = nextRange;
      const nextMissingValue = nextRange.minimum
        - Math.max(nextRange.maximum - nextRange.minimum, 1);
      mesh.field.set(interpolateVolume(nextPayload, nextMissingValue));
      setThreshold(currentThreshold);
    },
    setVisible(visible) {
      mesh.visible = visible;
    },
    setVerticalExaggeration(exaggeration) {
      mesh.scale.z = -(stackHeight / 2) * exaggeration;
      mesh.position.z = stackHeight / 2 - (stackHeight * exaggeration) / 2;
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
    },
  };
}