import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Scene3D({ expressions, scope, settings }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(8, 8, 12);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 7);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    const axes = new THREE.AxesHelper(5);
    scene.add(axes);
    const grid = new THREE.GridHelper(20, 20, 0x333333, 0x222222);
    scene.add(grid);

    const surfaceExprs = expressions.filter((e) => e.visible && /z\s*=/.test(e.raw));
    surfaceExprs.forEach((expr, idx) => {
      const geometry = new THREE.PlaneGeometry(10, 10, 64, 64);
      const pos = geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) * 2 - 5;
        const y = pos.getY(i) * 2 - 5;
        let z = 0;
        try {
          const fn = new Function('x', 'y', `return ${expr.raw.replace(/z\s*=\s*/, '')}`);
          z = fn(x, y);
          if (!Number.isFinite(z)) z = 0;
        } catch { z = 0; }
        pos.setZ(i, z / 2);
      }
      geometry.computeVertexNormals();
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(expr.color || '#3b82f6'),
        side: THREE.DoubleSide,
        wireframe: false,
        metalness: 0.1,
        roughness: 0.8,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = idx * 0.05;
      scene.add(mesh);
    });

    let isDragging = false;
    let prev = { x: 0, y: 0 };
    const onPointerDown = (e) => { isDragging = true; prev = { x: e.clientX, y: e.clientY }; };
    const onPointerUp = () => { isDragging = false; };
    const onPointerMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      prev = { x: e.clientX, y: e.clientY };
      const spherical = new THREE.Spherical().setFromVector3(camera.position);
      spherical.theta -= dx * 0.01;
      spherical.phi = Math.max(0.2, Math.min(Math.PI - 0.2, spherical.phi + dy * 0.01));
      camera.position.setFromSpherical(spherical);
      camera.lookAt(0, 0, 0);
    };
    const onWheel = (e) => {
      camera.position.multiplyScalar(e.deltaY > 0 ? 1.05 : 0.95);
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const ro = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    sceneRef.current = { scene, renderer, camera };

    return () => {
      cancelAnimationFrame(frameId);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [expressions, scope, settings]);

  return (
    <div className="calc-scene3d-wrap" ref={containerRef}>
      <div className="calc-scene3d-hint">Drag to rotate · scroll to zoom · enter z=f(x,y) in expressions</div>
    </div>
  );
}
