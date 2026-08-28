import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { getOceanLayers } from "../api/client.js";
import { createColorBuffer, getFiniteRange } from "../utils/colorScale.js";

const SCENE_HEIGHT = 560;
const PLANE_WIDTH = 12;
const STACK_HEIGHT = 5;

function createOceanScene(container, payload, range) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07131d);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(10, -13, 10);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);

  const longitudeSpan = payload.longitudes.at(-1) - payload.longitudes[0];
  const latitudeSpan = payload.latitudes.at(-1) - payload.latitudes[0];
  const planeHeight = PLANE_WIDTH * (latitudeSpan / longitudeSpan);
  const geometry = new THREE.PlaneGeometry(PLANE_WIDTH, planeHeight);
  const maximumDepth = Math.max(...payload.layers.map((layer) => layer.depth));
  const textures = [];
  const materials = [];

  payload.layers.forEach((layer) => {
    const pixels = createColorBuffer(
      layer.values,
      range.minimum,
      range.maximum,
    );
    const texture = new THREE.DataTexture(
      pixels,
      payload.longitudes.length,
      payload.latitudes.length,
      THREE.RGBAFormat,
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    textures.push(texture);

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      opacity: 0.76,
      side: THREE.DoubleSide,
      transparent: true,
    });
    materials.push(material);

    const plane = new THREE.Mesh(geometry, material);
    plane.position.z = STACK_HEIGHT / 2 - (layer.depth / maximumDepth) * STACK_HEIGHT;
    plane.renderOrder = payload.layers.length - payload.layers.indexOf(layer);
    scene.add(plane);
  });

  const frame = new THREE.LineSegments(
    new THREE.EdgesGeometry(
      new THREE.BoxGeometry(PLANE_WIDTH, planeHeight, STACK_HEIGHT),
    ),
    new THREE.LineBasicMaterial({ color: 0x7da6bd, transparent: true, opacity: 0.45 }),
  );
  scene.add(frame);

  function resize() {
    const width = Math.max(container.clientWidth, 320);
    renderer.setSize(width, SCENE_HEIGHT, false);
    camera.aspect = width / SCENE_HEIGHT;
    camera.updateProjectionMatrix();
  }

  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  let animationFrame;
  function animate() {
    controls.update();
    renderer.render(scene, camera);
    animationFrame = requestAnimationFrame(animate);
  }
  animate();

  return () => {
    cancelAnimationFrame(animationFrame);
    resizeObserver.disconnect();
    controls.dispose();
    textures.forEach((texture) => texture.dispose());
    materials.forEach((material) => material.dispose());
    geometry.dispose();
    frame.geometry.dispose();
    frame.material.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}

function OceanScene3D() {
  const containerRef = useRef(null);
  const [payload, setPayload] = useState(null);
  const [range, setRange] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    getOceanLayers({ variable: "thetao", signal: controller.signal })
      .then((layersPayload) => {
        setPayload(layersPayload);
        setRange(getFiniteRange(layersPayload.layers.map((layer) => layer.values)));
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError("Unable to load the 3D ocean depth layers.");
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!containerRef.current || !payload || !range) {
      return undefined;
    }

    return createOceanScene(containerRef.current, payload, range);
  }, [payload, range]);

  return (
    <section aria-labelledby="ocean-scene-title">
      <h2 id="ocean-scene-title">3D temperature depth stack</h2>
      <p>Drag to rotate · Scroll to zoom</p>
      {!payload && !error && <p>Loading eight Copernicus Marine depth layers…</p>}
      {error && <p role="alert">{error}</p>}
      <div
        ref={containerRef}
        role="img"
        aria-label="Rotatable stack of eight sea temperature planes from the surface to 1942 metres"
        style={{
          display: payload ? "block" : "none",
          width: "100%",
          minHeight: `${SCENE_HEIGHT}px`,
          overflow: "hidden",
          border: "1px solid #526978",
          background: "#07131d",
        }}
      />
      {payload && range && (
        <p>
          Depths: {payload.layers.map((layer) => layer.depth.toFixed(0)).join(", ")} m
          {" · "}{range.minimum.toFixed(2)}–{range.maximum.toFixed(2)} °C
          {" · "}{payload.time.slice(0, 10)}
        </p>
      )}
    </section>
  );
}

export default OceanScene3D;
