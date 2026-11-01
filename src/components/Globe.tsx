'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Earthquake } from '@/lib/types';

type Props = {
  events: Earthquake[];
  selectedId: string | null;
  onSelect: (event: Earthquake) => void;
  autoRotate: boolean;
  heatMode?: boolean;
  densityMode?: boolean;
};

type Engine = {
  globe: THREE.Group;
  markers: THREE.Group;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  targetX: number;
  targetY: number;
  isDragging: boolean;
  pick: (clientX: number, clientY: number) => void;
};

const RADIUS = 2.35;

function geoToVector(lat: number, lon: number, radius: number) {
  const phi = (lon + 180) * Math.PI / 180;
  const theta = (90 - lat) * Math.PI / 180;
  return new THREE.Vector3(
    -radius * Math.cos(phi) * Math.sin(theta),
    radius * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

export default function Globe({ events, selectedId, onSelect, autoRotate, heatMode = false, densityMode = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const eventsRef = useRef(events);
  const onSelectRef = useRef(onSelect);
  const rotatingRef = useRef(autoRotate);
  const [webglError, setWebglError] = useState(false);

  useEffect(() => { eventsRef.current = events; }, [events]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { rotatingRef.current = autoRotate; }, [autoRotate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const shell = shellRef.current;
    if (!canvas || !shell) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.25 : 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 8.6);
    const globe = new THREE.Group();
    globe.rotation.y = -0.52;
    globe.rotation.x = 0.19;
    scene.add(globe);

    const texture = new THREE.TextureLoader().load('/earth-night.jpg');
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    const sphereGeometry = new THREE.SphereGeometry(RADIUS, 96, 64);
    const sphereMaterial = new THREE.MeshPhongMaterial({
      map: texture,
      emissive: 0x0a2434,
      emissiveIntensity: 0.18,
      shininess: 6,
      specular: 0x174e60,
    });
    const earth = new THREE.Mesh(sphereGeometry, sphereMaterial);
    globe.add(earth);

    const wire = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS + 0.007, 32, 20),
      new THREE.MeshBasicMaterial({ color: 0x5cdce0, wireframe: true, transparent: true, opacity: 0.055, depthWrite: false }),
    );
    globe.add(wire);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS * 1.13, 64, 48),
      new THREE.ShaderMaterial({
        vertexShader: `varying vec3 vNormal; void main(){ vNormal=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `varying vec3 vNormal; void main(){ float intensity=pow(0.82-abs(dot(vNormal,vec3(0.0,0.0,1.0))),3.5); gl_FragColor=vec4(0.12,0.73,0.91,clamp(intensity*0.95,0.0,0.55)); }`,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      }),
    );
    scene.add(atmosphere);

    const ringGeometry = new THREE.RingGeometry(3.14, 3.153, 160);
    const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: 0x20627b, side: THREE.DoubleSide, transparent: true, opacity: 0.45 }));
    ring.rotation.x = Math.PI / 2.4;
    scene.add(ring);
    const outerRing = new THREE.Mesh(new THREE.RingGeometry(3.57, 3.577, 160), new THREE.MeshBasicMaterial({ color: 0x1b4e64, side: THREE.DoubleSide, transparent: true, opacity: 0.25 }));
    outerRing.rotation.x = Math.PI / 2.8;
    scene.add(outerRing);

    const starCount = 500;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const b = Math.acos(2 * Math.random() - 1);
      const r = 8 + Math.random() * 10;
      starPositions[i * 3] = r * Math.sin(b) * Math.cos(a);
      starPositions[i * 3 + 1] = r * Math.cos(b);
      starPositions[i * 3 + 2] = r * Math.sin(b) * Math.sin(a);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0x79a8b7, size: 0.028, transparent: true, opacity: 0.52 }));
    scene.add(stars);

    const ambient = new THREE.AmbientLight(0x8eb3cb, 1.8);
    scene.add(ambient);
    const light = new THREE.DirectionalLight(0xb7f3ff, 2.4);
    light.position.set(6, 4, 8);
    scene.add(light);
    const backlight = new THREE.DirectionalLight(0x0e7b94, 0.9);
    backlight.position.set(-4, -1, -5);
    scene.add(backlight);

    const markers = new THREE.Group();
    globe.add(markers);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const engine: Engine = {
      globe, markers, renderer, camera,
      targetX: 0.19, targetY: -0.52, isDragging: false,
      pick: (clientX, clientY) => {
        const bounds = canvas.getBoundingClientRect();
        pointer.set(((clientX - bounds.left) / bounds.width) * 2 - 1, -((clientY - bounds.top) / bounds.height) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(markers.children, true);
        const id = hits.find(hit => hit.object.userData.eventId)?.object.userData.eventId as string | undefined;
        const event = eventsRef.current.find(item => item.id === id);
        if (event) onSelectRef.current(event);
      },
    };
    engineRef.current = engine;

    const resize = () => {
      const width = shell.clientWidth;
      const height = shell.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.position.z = width < 440 ? 10.4 : width < 650 ? 9.1 : 8.6;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(shell);
    resize();

    let dragStartX = 0;
    let dragStartY = 0;
    let lastX = 0;
    let lastY = 0;
    let moved = false;
    const down = (event: PointerEvent) => {
      engine.isDragging = true;
      moved = false;
      dragStartX = lastX = event.clientX;
      dragStartY = lastY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!engine.isDragging) return;
      if (Math.hypot(event.clientX - dragStartX, event.clientY - dragStartY) > 5) moved = true;
      engine.targetY += (event.clientX - lastX) * 0.005;
      engine.targetX = THREE.MathUtils.clamp(engine.targetX + (event.clientY - lastY) * 0.004, -0.95, 0.95);
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const up = (event: PointerEvent) => {
      if (!engine.isDragging) return;
      engine.isDragging = false;
      if (!moved) engine.pick(event.clientX, event.clientY);
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      camera.position.z = THREE.MathUtils.clamp(camera.position.z + event.deltaY * 0.004, 6.6, 12.2);
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', wheel, { passive: false });

    let frame = 0;
    let previous = performance.now();
    let isVisible = true;
    const visibilityObserver = new IntersectionObserver(entries => { isVisible = entries[0]?.isIntersecting ?? false; }, { threshold: 0.02 });
    visibilityObserver.observe(shell);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animate = (now: number) => {
      const delta = Math.min((now - previous) / 1000, 0.06);
      previous = now;
      if (isVisible && !document.hidden && rotatingRef.current && !reduceMotion && !engine.isDragging) engine.targetY += delta * 0.065;
      globe.rotation.y += (engine.targetY - globe.rotation.y) * 0.055;
      globe.rotation.x += (engine.targetX - globe.rotation.x) * 0.055;
      // V4: pulso de foco en el terremoto seleccionado (solo una malla).
      if (isVisible && !document.hidden && !reduceMotion) {
        for (const child of markers.children) {
          if (!child.userData.pulse || !(child instanceof THREE.Mesh)) continue;
          const pulse = Math.sin(now * 0.003);
          child.scale.setScalar(1.15 + (pulse + 1) * 0.25);
          if (child.material instanceof THREE.MeshBasicMaterial) child.material.opacity = 0.12 + (pulse + 1) * 0.08;
        }
      }
      ring.rotation.z += delta * 0.008;
      outerRing.rotation.z -= delta * 0.005;
      if (isVisible && !document.hidden) renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibilityObserver.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('wheel', wheel);
      engineRef.current = null;
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => material.dispose());
        }
      });
      texture.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    for (const child of [...engine.markers.children]) {
      engine.markers.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const material = child.material;
        if (material instanceof THREE.Material) material.dispose();
      }
    }
    // Para mantener un buen rendimiento, mostramos hasta 120 marcadores.
    for (const event of events.slice(0, 120)) {
      const isSelected = event.id === selectedId;
      const color = event.magnitude >= 5 ? 0xff986b : event.magnitude >= 3.5 ? 0xffcf82 : 0x63e9e4;
      const size = isSelected ? 0.073 : event.magnitude >= 5 ? 0.047 : 0.032;
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(size, 10, 10),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }),
      );
      marker.position.copy(geoToVector(event.latitude, event.longitude, RADIUS + 0.045));
      marker.userData.eventId = event.id;
      engine.markers.add(marker);
      if (heatMode && !isSelected) {
        const glow = new THREE.Mesh(
          new THREE.SphereGeometry(size * (event.magnitude >= 5 ? 4.4 : 3), 12, 12),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: event.magnitude >= 5 ? 0.24 : 0.12, depthWrite: false }),
        );
        glow.position.copy(marker.position);
        glow.userData.eventId = event.id;
        engine.markers.add(glow);
      }
      if (isSelected) {
        const halo = new THREE.Mesh(
          new THREE.SphereGeometry(0.125, 12, 12),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, depthWrite: false }),
        );
        halo.position.copy(marker.position);
        halo.userData.eventId = event.id;
        halo.userData.pulse = true;
        engine.markers.add(halo);
      }
    }
    // Capa de densidad geográfica: agrupación en celdas de 15° (no modelo físico de propagación).
    if (densityMode) {
      const cells = new Map<string, { lat: number; lon: number; count: number }>();
      for (const event of events) {
        const lat = Math.max(-82.5, Math.min(82.5, Math.floor((event.latitude + 90) / 15) * 15 - 82.5));
        const lon = Math.max(-172.5, Math.min(172.5, Math.floor((event.longitude + 180) / 15) * 15 - 172.5));
        const key = `${lat}:${lon}`;
        const cell = cells.get(key);
        if (cell) cell.count++;
        else cells.set(key, { lat, lon, count: 1 });
      }
      for (const cell of [...cells.values()].sort((a, b) => b.count - a.count).slice(0, 100)) {
        const radius = Math.min(0.30, 0.085 + Math.sqrt(cell.count) * 0.034);
        const density = new THREE.Mesh(
          new THREE.SphereGeometry(radius, 12, 12),
          new THREE.MeshBasicMaterial({ color: cell.count >= 8 ? 0xff8b62 : cell.count >= 3 ? 0xffc57a : 0x50d9d4,
            transparent: true, opacity: Math.min(0.34, 0.10 + cell.count * 0.024), depthWrite: false }),
        );
        density.position.copy(geoToVector(cell.lat, cell.lon, RADIUS + 0.012));
        engine.markers.add(density);
      }
    }
    if (selectedId) {
      const selected = events.find(event => event.id === selectedId);
      if (selected) {
        const point = geoToVector(selected.latitude, selected.longitude, RADIUS);
        const desired = -Math.atan2(point.x, point.z);
        const current = engine.targetY;
        engine.targetY = current + Math.atan2(Math.sin(desired - current), Math.cos(desired - current));
        engine.targetX = THREE.MathUtils.clamp(Math.atan2(point.y, Math.hypot(point.x, point.z)), -0.9, 0.9);
      }
    }
  }, [events, selectedId, heatMode, densityMode]);

  return (
    <div className="globe-shell" ref={shellRef}>
      {webglError ? (
        <div className="globe-fallback">
          <img src="/earth-night.jpg" alt="Mapa terrestre" />
          <span>Tu navegador no habilitó WebGL. La lista de eventos sigue funcionando.</span>
        </div>
      ) : <canvas ref={canvasRef} className="globe-canvas" aria-label="Globo terráqueo 3D interactivo; arrastrá para girar" />}
      <div className="globe-coordinate globe-coordinate-left">90° N <span>·</span> 180° W</div>
      <div className="globe-coordinate globe-coordinate-right">LIVE GEOSPATIAL VIEW <span>↗</span></div>
      <div className="globe-controls-hint">↔ ARRASTRÁ PARA GIRAR <span>·</span> SCROLL PARA ZOOM</div>
    </div>
  );
}
