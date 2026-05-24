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
  enabled?: boolean;
};

type DeviceOrientationCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 5_000,
  timeout: 15_000,
};

const FAST_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 30_000,
  timeout: 8_000,
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
  const ext = event as DeviceOrientationEvent & { webkitCompassHeading?: number };
  if (
    typeof ext.webkitCompassHeading === "number" &&
    !Number.isNaN(ext.webkitCompassHeading) &&
    ext.webkitCompassHeading >= 0
  ) {
    return normalizeHeading(ext.webkitCompassHeading);
  }
  if (event.alpha != null && !Number.isNaN(event.alpha)) {
    if (event.absolute) return normalizeHeading(360 - event.alpha);
    const beta = event.beta ?? 90;
    const gamma = event.gamma ?? 0;
    if (Math.abs(beta) <= 50 && Math.abs(gamma) <= 50) {
      return normalizeHeading(360 - event.alpha);
    }
  }
  return null;
}

function readGpsHeading(coords: GeolocationCoordinates): number | null {
  const { heading } = coords;
  if (heading == null || Number.isNaN(heading) || heading < 0) return null;
  return normalizeHeading(heading);
}

function getInitialHeadingPermission(): HeadingPermissionState {
  if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
    return "unsupported";
  }
  const Ctor = DeviceOrientationEvent as DeviceOrientationCtor;
  return typeof Ctor.requestPermission === "function" ? "prompt" : "granted";
}

function getPosition(
  options: PositionOptions
): Promise<GeolocationPosition | GeolocationPositionError> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(resolve, resolve, options);
  });
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const { enabled = true } = options;

  const [position, setPosition] = useState<GeolocationCoords | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [headingPermission, setHeadingPermission] =
    useState<HeadingPermissionState>(getInitialHeadingPermission);

  const headingActiveRef = useRef(false);

  const applyPosition = useCallback((result: GeolocationPosition) => {
    const coords: GeolocationCoords = {
      latitude: result.coords.latitude,
      longitude: result.coords.longitude,
      accuracy: result.coords.accuracy,
    };
    setPosition(coords);
    setLoading(false);
    setError(null);

    const gpsHeading = readGpsHeading(result.coords);
    if (gpsHeading != null) setHeading(gpsHeading);

    return coords;
  }, []);

  const onOrientation = useCallback((event: DeviceOrientationEvent) => {
    const next = readDeviceHeading(event);
    if (next == null) return;
    setHeading((prev) => (prev != null && Math.abs(prev - next) < 0.5 ? prev : next));
  }, []);

  const stopHeading = useCallback(() => {
    if (!headingActiveRef.current) return;
    window.removeEventListener("deviceorientationabsolute", onOrientation, true);
    window.removeEventListener("deviceorientation", onOrientation, true);
    headingActiveRef.current = false;
  }, [onOrientation]);

  const startHeading = useCallback(() => {
    if (headingActiveRef.current || !("DeviceOrientationEvent" in window)) return;
    window.addEventListener("deviceorientationabsolute", onOrientation, true);
    window.addEventListener("deviceorientation", onOrientation, true);
    headingActiveRef.current = true;
  }, [onOrientation]);

  const requestHeadingPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      setHeadingPermission("unsupported");
      return false;
    }

    const Ctor = DeviceOrientationEvent as DeviceOrientationCtor;
    if (typeof Ctor.requestPermission !== "function") {
      setHeadingPermission("granted");
      startHeading();
      return true;
    }

    try {
      const result = await Ctor.requestPermission();
      if (result === "granted") {
        setHeadingPermission("granted");
        startHeading();
        return true;
      }
      setHeadingPermission("denied");
      stopHeading();
      return false;
    } catch {
      setHeadingPermission("denied");
      stopHeading();
      return false;
    }
  }, [startHeading, stopHeading]);

  const retryLocation = useCallback(async (): Promise<GeolocationCoords | null> => {
    if (!navigator.geolocation) {
      setError("このブラウザは位置情報に対応していません");
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError(null);

    const fast = await getPosition(FAST_OPTIONS);
    if ("coords" in fast) return applyPosition(fast);

    const accurate = await getPosition(WATCH_OPTIONS);
    if ("coords" in accurate) return applyPosition(accurate);

    setError(geolocationErrorMessage(accurate.code));
    setLoading(false);
    return null;
  }, [applyPosition]);

  // 位置情報: 即時取得 + 継続監視
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
    setLoading(true);
    setError(null);

    const onSuccess = (result: GeolocationPosition) => {
      if (!cancelled) applyPosition(result);
    };

    const onError = (err: GeolocationPositionError) => {
      if (cancelled) return;
      setError(geolocationErrorMessage(err.code));
      setLoading(false);
    };

    void (async () => {
      const fast = await getPosition(FAST_OPTIONS);
      if (cancelled) return;
      if ("coords" in fast) {
        applyPosition(fast);
      } else {
        const accurate = await getPosition(WATCH_OPTIONS);
        if (cancelled) return;
        if ("coords" in accurate) applyPosition(accurate);
      }
    })();

    const watchId = navigator.geolocation.watchPosition(
      onSuccess,
      onError,
      WATCH_OPTIONS
    );

    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watchId);
      setLoading(false);
    };
  }, [enabled, applyPosition]);

  // 方位: デスクトップ等は自動開始 / iOS は許可後
  useEffect(() => {
    if (!enabled) {
      stopHeading();
      return;
    }
    if (headingPermission === "granted") {
      startHeading();
      return stopHeading;
    }
    stopHeading();
  }, [enabled, headingPermission, startHeading, stopHeading]);

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
