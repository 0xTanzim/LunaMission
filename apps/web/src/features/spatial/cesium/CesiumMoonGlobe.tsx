import React, { useEffect, useRef, useState } from 'react';
import { loadCesiumRuntime } from './cesiumLoader';
import { CANDIDATE_SITES } from '@luna/contracts';

export type CesiumCameraPreset = 'global' | 'south-pole' | 'site';

interface CesiumMoonGlobeProps {
  token: string;
  activeSiteId: string;
  cameraPreset: CesiumCameraPreset;
  onTilesetStatus?: (status: 'tileset-3d' | 'basemap-lroc') => void;
  onError?: (err: Error) => void;
  className?: string;
}

export const CesiumMoonGlobe: React.FC<CesiumMoonGlobeProps> = ({
  token,
  activeSiteId,
  cameraPreset,
  onTilesetStatus,
  onError,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // 1. Initialize Cesium Moon Viewer with LROC 2K Basemap + On-Demand 3D Tiles
  useEffect(() => {
    let isCancelled = false;
    if (!containerRef.current || !token) return;

    loadCesiumRuntime(token)
      .then(async (Cesium) => {
        if (isCancelled || !containerRef.current) return;

        // Configure IAU Moon Ellipsoid (R = 1,737.4 km)
        Cesium.Ellipsoid.default = Cesium.Ellipsoid.MOON;

        const viewer = new Cesium.Viewer(containerRef.current, {
          baseLayer: false,
          baseLayerPicker: false,
          geocoder: false,
          animation: false,
          timeline: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          infoBox: false,
          selectionIndicator: false,
        });

        viewer.scene.globe.show = true;
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0b0f19');
        viewerRef.current = viewer;

        // A. Load authentic local LROC 2K lunar basemap on Moon Ellipsoid
        try {
          const lunarImagery = await Cesium.SingleTileImageryProvider.fromUrl(
            '/assets/lunar/lroc_color_2k.jpg',
            { ellipsoid: Cesium.Ellipsoid.MOON },
          );
          if (!isCancelled) {
            viewer.imageryLayers.addImageryProvider(lunarImagery);
          }
        } catch (imgErr) {
          console.warn('LROC basemap texture fallback notice:', imgErr);
        }

        // B. Add all 20 Candidate Landing Site Pins on Moon Surface
        CANDIDATE_SITES.forEach((site) => {
          const pos = Cesium.Cartesian3.fromDegrees(
            site.coordinates.longitudeDeg,
            site.coordinates.latitudeDeg,
            site.coordinates.elevationMeters,
            Cesium.Ellipsoid.MOON,
          );

          viewer.entities.add({
            position: pos,
            point: {
              pixelSize: site.id === activeSiteId ? 14 : 9,
              color: site.id === activeSiteId ? Cesium.Color.CYAN : Cesium.Color.GOLD,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
            },
            label: {
              text: site.name,
              font: '11px monospace',
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -10),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 4000000),
            },
          });
        });

        // C. Attempt to load Cesium Ion Moon 3D Tileset (Asset 2684829)
        try {
          const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2684829);
          if (!isCancelled) {
            viewer.scene.primitives.add(tileset);
            viewer.scene.globe.show = false;
            if (onTilesetStatus) onTilesetStatus('tileset-3d');
          }
        } catch {
          // If Asset 2684829 is not yet subscribed in user's Ion account, LROC basemap remains active
          if (!isCancelled) {
            viewer.scene.globe.show = true;
            if (onTilesetStatus) onTilesetStatus('basemap-lroc');
          }
        }

        if (!isCancelled) {
          setIsInitializing(false);
        }
      })
      .catch((err) => {
        if (!isCancelled && onError) onError(err);
        setIsInitializing(false);
      });

    return () => {
      isCancelled = true;
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [token]);

  // 2. Camera Navigation Presets
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || isInitializing || !window.Cesium) return;
    const Cesium = window.Cesium;

    const activeSite = CANDIDATE_SITES.find((s) => s.id === activeSiteId) ?? CANDIDATE_SITES[0];

    if (cameraPreset === 'global') {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(0, -20, 5000000, Cesium.Ellipsoid.MOON),
        duration: 1.8,
      });
    } else if (cameraPreset === 'south-pole') {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(0, -89.9, 850000, Cesium.Ellipsoid.MOON),
        duration: 1.8,
      });
    } else if (cameraPreset === 'site') {
      const sitePos = Cesium.Cartesian3.fromDegrees(
        activeSite.coordinates.longitudeDeg,
        activeSite.coordinates.latitudeDeg,
        activeSite.coordinates.elevationMeters,
        Cesium.Ellipsoid.MOON,
      );
      const sphere = new Cesium.BoundingSphere(sitePos, 50000);
      viewer.camera.flyToBoundingSphere(sphere, {
        duration: 2.0,
        offset: new Cesium.HeadingPitchRange(0, -Cesium.Math.toRadians(45), 75000),
      });
    }
  }, [cameraPreset, activeSiteId, isInitializing]);

  return (
    <div className={`relative w-full h-full min-h-[500px] overflow-hidden ${className}`}>
      <div ref={containerRef} className="w-full h-full" />
      {isInitializing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--lm-color-canvas)]/80 backdrop-blur z-20 font-mono text-xs text-[var(--lm-color-text-secondary)]">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--lm-color-info)] border-t-transparent animate-spin" />
          <span>Mounting Cesium Ion Lunar 3D Observatory...</span>
        </div>
      )}
    </div>
  );
};
