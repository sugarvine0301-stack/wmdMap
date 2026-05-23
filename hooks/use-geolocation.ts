"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type GeolocationCoords = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

export type HeadingPermissionState =
  | "unsupported"
  | "prompt"
  | "granted"
  | "denied";

type UseGeolocationOptions = {
  /** false のときは位置情報の取得を行わない */
  enabled?: boolean;
  enableHighAccuracy?: boolean;
  maximumAge?: number;
  timeout?: number;
};

type DeviceOrientationEventConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

function geolocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return "位置情報の利用が許可されていません";
    case 2:
      return "位置情報を取得できませんでした";
    case 3:
      return "位置情報の取得がタイムアウトしました";
    default:
      return "位置情報の取得に失敗しました";
  }
}

function normalizeHeading(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

function readDeviceHeading(event: DeviceOrientationEvent): number | null {
  const extended = event as DeviceOrientationEvent & {
    webkitCompassHeading?: number;
  };

  // iOS Safari（deviceorientation で提供）
  if (
    typeof extended.webkitCompassHeading === "number" &&
    !Number.isNaN(extended.webkitCompassHeading) &&
    extended.webkitCompassHeading >= 0
  ) {
    return normalizeHeading(extended.webkitCompassHeading);
  }

  if (event.alpha != null && !Number.isNaN(event.alpha)) {
    // 絶対方位（Android など）
    if (event.absolute) {
      return normalizeHeading(360 - event.alpha);
    }

    // 相対方位: 端末がおおよそ水平のとき alpha を方位として使う
    const beta = event.beta ?? 90;
    const gamma = event.gamma ?? 0;
    if (Math.abs(beta) <= 50 && Math.abs(gamma) <= 50) {
      return normalizeHeading(360 - event.alpha);
    }
  }

  return null;
}

function readGeolocationHeading(coords: GeolocationCoordinates): number | null {
  const { heading } = coords;
  if (heading == null || Number.isNaN(heading) || heading < 0) {
    return null;
  }
  return normalizeHeading(heading);
}

function getInitialHeadingPermission(): HeadingPermissionState {
  if (typeof window === "undefined") return "unsupported";
  if (!("DeviceOrientationEvent" in window)) return "unsupported";

  const DeviceOrientation = DeviceOrientationEvent as DeviceOrientationEventConstructor;
  if (typeof DeviceOrientation.requestPermission === "function") {
    return "prompt";
  }

  return "granted";
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    enabled = true,
    enableHighAccuracy = true,
    maximumAge = 10_000,
    timeout = 30_000,
  } = options;

  const [position, setPosition] = useState<GeolocationCoords | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [headingPermission, setHeadingPermission] =
    useState<HeadingPermissionState>(getInitialHeadingPermission);

  const headingListenerActiveRef = useRef(false);
  const orientationHandlerRef = useRef<(event: DeviceOrientationEvent) => void>(
    () => {}
  );

  orientationHandlerRef.current = (event: DeviceOrientationEvent) => {
    const next = readDeviceHeading(event);
    if (next == null) return;
    setHeading((prev) => {
      if (prev != null && Math.abs(prev - next) < 0.5) return prev;
      return next;
    });
  };

  const onOrientation = useCallback((event: DeviceOrientationEvent) => {
    orientationHandlerRef.current(event);
  }, []);

  const stopHeadingListener = useCallback(() => {
    if (!headingListenerActiveRef.current) return;
    window.removeEventListener("deviceorientationabsolute", onOrientation, true);
    window.removeEventListener("deviceorientation", onOrientation, true);
    headingListenerActiveRef.current = false;
  }, [onOrientation]);

  const startHeadingListener = useCallback(() => {
    if (headingListenerActiveRef.current) return;
    if (!("DeviceOrientationEvent" in window)) return;

    window.addEventListener("deviceorientationabsolute", onOrientation, true);
    window.addEventListener("deviceorientation", onOrientation, true);
    headingListenerActiveRef.current = true;
  }, [onOrientation]);

  const applyPosition = useCallback((result: GeolocationPosition) => {
    const coords: GeolocationCoords = {
      latitude: result.coords.latitude,
      longitude: result.coords.longitude,
      accuracy: result.coords.accuracy,
    };
    setPosition(coords);
    const geoHeading = readGeolocationHeading(result.coords);
    if (geoHeading != null) {
      setHeading(geoHeading);
    }
    setLoading(false);
    setError(null);
    return coords;
  }, []);

  const retryLocation = useCallback((): Promise<GeolocationCoords | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setError("このブラウザは位置情報に対応していません");
        setLoading(false);
        resolve(null);
        return;
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (result) => {
          resolve(applyPosition(result));
        },
        (result) => {
          setError(geolocationErrorMessage(result.code));
          setLoading(false);
          resolve(null);
        },
        { enableHighAccuracy, maximumAge, timeout }
      );
    });
  }, [applyPosition, enableHighAccuracy, maximumAge, timeout]);

  const requestHeadingPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;

    if (!("DeviceOrientationEvent" in window)) {
      setHeadingPermission("unsupported");
      return false;
    }

    const DeviceOrientation =
      DeviceOrientationEvent as DeviceOrientationEventConstructor;

    if (typeof DeviceOrientation.requestPermission !== "function") {
      setHeadingPermission("granted");
      startHeadingListener();
      return true;
    }

    try {
      const result = await DeviceOrientation.requestPermission();
      if (result === "granted") {
        setHeadingPermission("granted");
        startHeadingListener();
        return true;
      }
      setHeadingPermission("denied");
      setHeading(null);
      stopHeadingListener();
      return false;
    } catch {
      setHeadingPermission("denied");
      setHeading(null);
      stopHeadingListener();
      return false;
    }
  }, [startHeadingListener, stopHeadingListener]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    if (!navigator.geolocation) {
      setError("このブラウザは位置情報に対応していません");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setError(null);
    setLoading(true);

    const handleSuccess = (result: GeolocationPosition) => {
      if (cancelled) return;
      applyPosition(result);
    };

    const handleError = (result: GeolocationPositionError) => {
      if (cancelled) return;
      setError(geolocationErrorMessage(result.code));
      setLoading(false);
    };

    const watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      { enableHighAccuracy, maximumAge, timeout }
    );

    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watchId);
      setLoading(false);
    };
  }, [enabled, enableHighAccuracy, maximumAge, timeout, applyPosition]);

  useEffect(() => {
    if (!enabled) {
      stopHeadingListener();
      setHeading(null);
      return;
    }

    if (headingPermission === "granted") {
      startHeadingListener();
      return () => stopHeadingListener();
    }

    stopHeadingListener();
    // iOS では prompt の間も GPS の heading は維持する（ここで null にしない）
    if (headingPermission === "denied") {
      setHeading(null);
    }
  }, [
    enabled,
    headingPermission,
    startHeadingListener,
    stopHeadingListener,
  ]);

  return {
    position,
    loading,
    error,
    heading,
    headingPermission,
    requestHeadingPermission,
    retryLocation,
  };
}
