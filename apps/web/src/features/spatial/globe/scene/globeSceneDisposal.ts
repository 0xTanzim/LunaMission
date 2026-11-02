import * as THREE from 'three';

const TEXTURE_PROPERTIES = [
  'map', 'normalMap', 'bumpMap', 'roughnessMap',
  'metalnessMap', 'alphaMap', 'specularMap', 'envMap',
] as const;

/**
 * Safe GPU Resource Disposer (Milestone M4 / Feature 18).
 * Tracks allocated Three.js GPU objects with a WeakSet to prevent double-disposal.
 */
export class SafeGpuResourceDisposer {
  private disposed = new WeakSet<object>();

  disposeGeometry(geometry?: THREE.BufferGeometry | null): void {
    if (!geometry || this.disposed.has(geometry)) return;
    this.disposed.add(geometry);
    geometry.dispose();
  }

  disposeTexture(texture?: THREE.Texture | null): void {
    if (!texture || this.disposed.has(texture)) return;
    this.disposed.add(texture);
    texture.dispose();
    if ('image' in texture && texture.image) {
      (texture as any).image = null;
    }
  }

  disposeMaterial(material?: THREE.Material | THREE.Material[] | null): void {
    if (!material) return;
    if (Array.isArray(material)) {
      material.forEach((mat) => this.disposeMaterial(mat));
      return;
    }
    if (this.disposed.has(material)) return;
    this.disposed.add(material);

    const matAny = material as any;
    for (const key of TEXTURE_PROPERTIES) {
      if (matAny[key] instanceof THREE.Texture) {
        this.disposeTexture(matAny[key]);
      }
    }
    material.dispose();
  }

  disposeObject(obj?: THREE.Object3D | null): void {
    if (!obj) return;
    obj.traverse((child) => {
      const anyChild = child as any;
      if (anyChild.geometry instanceof THREE.BufferGeometry) {
        this.disposeGeometry(anyChild.geometry);
      }
      if (anyChild.material) {
        this.disposeMaterial(anyChild.material);
      }
    });
    while (obj.children.length > 0) {
      obj.remove(obj.children[0]);
    }
  }

  disposeRenderTarget(target?: THREE.WebGLRenderTarget | null): void {
    if (!target || this.disposed.has(target)) return;
    this.disposed.add(target);
    target.dispose();
  }

  disposeEffectComposer(composer?: any | null): void {
    if (!composer || this.disposed.has(composer)) return;
    this.disposed.add(composer);
    if (Array.isArray(composer.passes)) {
      for (const pass of composer.passes) {
        if (pass && typeof pass.dispose === 'function') pass.dispose();
      }
    }
    this.disposeRenderTarget(composer.renderTarget1);
    this.disposeRenderTarget(composer.renderTarget2);
    if (typeof composer.dispose === 'function') composer.dispose();
  }
}

export interface GlobeSceneGraphDisposalInput {
  scene: THREE.Scene;
  markers?: Map<string, { container: THREE.Object3D }>;
  graticuleGroup?: THREE.Group;
  footprintGroup?: THREE.Group;
  vectorsGroup?: THREE.Group;
  customBeacon?: THREE.Group | null;
  surface?: { dispose: () => void };
  polarTerrain?: { dispose: () => void };
  laserTracks?: { dispose: () => void };
  sunLight?: THREE.DirectionalLight;
  composer?: any;
}

export function disposeFullGlobeSceneGraph(input: GlobeSceneGraphDisposalInput): void {
  const disposer = new SafeGpuResourceDisposer();
  if (input.markers) {
    for (const marker of input.markers.values()) {
      disposer.disposeObject(marker.container);
      input.scene.remove(marker.container);
    }
    input.markers.clear();
  }
  if (input.graticuleGroup) {
    disposer.disposeObject(input.graticuleGroup);
    input.scene.remove(input.graticuleGroup);
  }
  if (input.footprintGroup) {
    disposer.disposeObject(input.footprintGroup);
    input.scene.remove(input.footprintGroup);
  }
  if (input.vectorsGroup) {
    disposer.disposeObject(input.vectorsGroup);
    input.scene.remove(input.vectorsGroup);
  }
  if (input.customBeacon) {
    disposer.disposeObject(input.customBeacon);
    input.scene.remove(input.customBeacon);
  }
  if (input.sunLight?.shadow?.map) {
    input.sunLight.shadow.map.dispose();
  }
  input.surface?.dispose();
  input.polarTerrain?.dispose();
  input.laserTracks?.dispose();
  if (input.composer) {
    disposer.disposeEffectComposer(input.composer);
  }
}
