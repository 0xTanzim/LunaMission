/**
 * Dynamic CesiumJS Runtime Loader
 * Loads CesiumJS on-demand to protect initial application bundle size.
 */

declare global {
  interface Window {
    Cesium?: any;
  }
}

let cesiumPromise: Promise<any> | null = null;

export function loadCesiumRuntime(token: string): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Cesium cannot be loaded in server-side context'));
  }

  if (window.Cesium) {
    window.Cesium.Ion.defaultAccessToken = token;
    return Promise.resolve(window.Cesium);
  }

  if (cesiumPromise) {
    return cesiumPromise;
  }

  cesiumPromise = new Promise((resolve, reject) => {
    // 1. Inject Cesium CSS
    if (!document.querySelector('link[data-cesium-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cesium.com/downloads/cesiumjs/releases/1.121/Build/Cesium/Widgets/widgets.css';
      link.setAttribute('data-cesium-css', 'true');
      document.head.appendChild(link);
    }

    // 2. Inject Cesium JS
    const script = document.createElement('script');
    script.src = 'https://cesium.com/downloads/cesiumjs/releases/1.121/Build/Cesium/Cesium.js';
    script.async = true;

    script.onload = () => {
      if (window.Cesium) {
        window.Cesium.Ion.defaultAccessToken = token;
        resolve(window.Cesium);
      } else {
        reject(new Error('Cesium global object was not defined after script load'));
      }
    };

    script.onerror = () => {
      cesiumPromise = null;
      reject(new Error('Failed to load CesiumJS runtime from CDN'));
    };

    document.head.appendChild(script);
  });

  return cesiumPromise;
}
