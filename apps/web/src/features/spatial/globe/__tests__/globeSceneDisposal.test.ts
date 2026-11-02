import { describe, it, expect, vi } from 'bun:test';
import * as THREE from 'three';
import {
  SafeGpuResourceDisposer,
  disposeFullGlobeSceneGraph,
} from '../scene/globeSceneDisposal';

describe('SafeGpuResourceDisposer', () => {
  it('disposes geometries safely and idempotently using WeakSet deduplication', () => {
    const disposer = new SafeGpuResourceDisposer();
    const geom = new THREE.BufferGeometry();
    const disposeSpy = vi.spyOn(geom, 'dispose');

    disposer.disposeGeometry(geom);
    expect(disposeSpy).toHaveBeenCalledTimes(1);

    // Second call on same geometry should be a no-op
    disposer.disposeGeometry(geom);
    expect(disposeSpy).toHaveBeenCalledTimes(1);
  });

  it('disposes materials and their attached textures safely', () => {
    const disposer = new SafeGpuResourceDisposer();
    const texture = new THREE.Texture();
    const textureDisposeSpy = vi.spyOn(texture, 'dispose');

    const material = new THREE.MeshStandardMaterial({
      map: texture,
    });
    const matDisposeSpy = vi.spyOn(material, 'dispose');

    disposer.disposeMaterial(material);
    expect(matDisposeSpy).toHaveBeenCalledTimes(1);
    expect(textureDisposeSpy).toHaveBeenCalledTimes(1);
    expect(texture.image).toBeNull();

    // Idempotent call
    disposer.disposeMaterial(material);
    expect(matDisposeSpy).toHaveBeenCalledTimes(1);
  });

  it('recursively disposes object hierarchies and meshes', () => {
    const disposer = new SafeGpuResourceDisposer();
    const root = new THREE.Group();
    const childMesh = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshBasicMaterial(),
    );
    root.add(childMesh);

    const geomDisposeSpy = vi.spyOn(childMesh.geometry, 'dispose');
    const matDisposeSpy = vi.spyOn(childMesh.material as THREE.Material, 'dispose');

    disposer.disposeObject(root);

    expect(geomDisposeSpy).toHaveBeenCalledTimes(1);
    expect(matDisposeSpy).toHaveBeenCalledTimes(1);
  });

  it('disposes EffectComposer and its passes without throwing', () => {
    const disposer = new SafeGpuResourceDisposer();
    const mockPass1 = { dispose: vi.fn() };
    const mockPass2 = { dispose: vi.fn() };
    const mockComposer = {
      passes: [mockPass1, mockPass2],
      renderTarget1: { dispose: vi.fn() },
      renderTarget2: { dispose: vi.fn() },
      dispose: vi.fn(),
    };

    disposer.disposeEffectComposer(mockComposer);
    expect(mockPass1.dispose).toHaveBeenCalledTimes(1);
    expect(mockPass2.dispose).toHaveBeenCalledTimes(1);
    expect(mockComposer.dispose).toHaveBeenCalledTimes(1);
  });
});

describe('disposeFullGlobeSceneGraph', () => {
  it('comprehensively cleans up all scene layers, markers, lights and postprocessing', () => {
    const scene = new THREE.Scene();
    const graticuleGroup = new THREE.Group();
    const footprintGroup = new THREE.Group();
    const vectorsGroup = new THREE.Group();
    const customBeacon = new THREE.Group();

    // Mock markers map
    const mockMarkerContainer = new THREE.Group();
    mockMarkerContainer.add(new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshBasicMaterial()));
    const markers = new Map<string, any>([
      ['site-1', { container: mockMarkerContainer }],
    ]);

    const mockSurface = { dispose: vi.fn() };
    const mockPolarTerrain = { dispose: vi.fn() };
    const mockLaserTracks = { dispose: vi.fn() };
    const mockShadowMap = { dispose: vi.fn() };
    const mockSunLight = {
      shadow: {
        map: mockShadowMap,
      },
    };
    const mockComposer = {
      passes: [],
      dispose: vi.fn(),
    };

    disposeFullGlobeSceneGraph({
      scene,
      markers,
      graticuleGroup,
      footprintGroup,
      vectorsGroup,
      customBeacon,
      surface: mockSurface,
      polarTerrain: mockPolarTerrain,
      laserTracks: mockLaserTracks,
      sunLight: mockSunLight as any,
      composer: mockComposer,
    });

    expect(mockSurface.dispose).toHaveBeenCalledTimes(1);
    expect(mockPolarTerrain.dispose).toHaveBeenCalledTimes(1);
    expect(mockLaserTracks.dispose).toHaveBeenCalledTimes(1);
    expect(mockShadowMap.dispose).toHaveBeenCalledTimes(1);
    expect(mockComposer.dispose).toHaveBeenCalledTimes(1);
    expect(markers.size).toBe(0);
  });
});
