import * as THREE from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";
import { interpolateVolume } from "./isosurface.js";
import { interpolateColor } from "./colorScale.js";

// A dense, continuous volume made from the loaded 3D scalar field. It is deliberately
// not a stack of planes: Marching Cubes produces closed 3D surfaces from trilinear data.
const RESOLUTION = 40;

export function createTemperatureSolid(payload, range, width, height, depth) {
  const group = new THREE.Group();
  const missingValue = range.minimum - Math.max(range.maximum - range.minimum, 1);
  const field = interpolateVolume(payload, missingValue, RESOLUTION);
  const levels = [0.18, 0.42, 0.68].map((fraction) => range.minimum + (range.maximum - range.minimum) * fraction);
  const materials = [];
  levels.forEach((level, index) => {
    const [red, green, blue] = interpolateColor(level, range.minimum, range.maximum);
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(red / 255, green / 255, blue / 255),
      transparent: true,
      opacity: [0.18, 0.25, 0.34][index],
      side: THREE.DoubleSide,
      depthWrite: index === levels.length - 1,
      shininess: 45,
    });
    const mesh = new MarchingCubes(RESOLUTION, material, false, false, 180000);
    mesh.field.set(field);
    mesh.isolation = level;
    mesh.update();
    mesh.scale.set(width / 2, height / 2, -(depth * 1.75) / 2);
    mesh.position.z = -(depth * 0.38);
    mesh.renderOrder = 60 + index;
    group.add(mesh);
    materials.push(material);
  });
  group.visible = false;
  return {
    group,
    update(nextPayload, nextRange) {
      const nextMissing = nextRange.minimum - Math.max(nextRange.maximum - nextRange.minimum, 1);
      const nextField = interpolateVolume(nextPayload, nextMissing, RESOLUTION);
      const nextLevels = [0.18, 0.42, 0.68].map((fraction) => nextRange.minimum + (nextRange.maximum - nextRange.minimum) * fraction);
      group.children.forEach((mesh, index) => {
        mesh.field.set(nextField);
        mesh.isolation = nextLevels[index];
        const [red, green, blue] = interpolateColor(nextLevels[index], nextRange.minimum, nextRange.maximum);
        materials[index].color.setRGB(red / 255, green / 255, blue / 255);
        mesh.update();
      });
    },
    setVerticalExaggeration(exaggeration) {
      group.children.forEach((mesh) => { mesh.scale.z = -(depth * 1.75 * exaggeration) / 2; mesh.position.z = -(depth * 0.38 * exaggeration); });
    },
    dispose() { group.children.forEach((mesh) => mesh.geometry.dispose()); materials.forEach((material) => material.dispose()); },
  };
}
