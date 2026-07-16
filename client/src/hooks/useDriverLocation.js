import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import * as driverService from '../api/driverService';
import { LOCATION_UPDATE_INTERVAL_MS } from '../utils/constants';

export const useDriverLocation = (isAvailable = false) => {
  const { isDriver } = useAuth();
  const { socket, isConnected } = useSocket();
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (!isDriver || !isAvailable || !navigator.geolocation) {
      return undefined;
    }

    const sendLocation = async (position) => {
      const payload = {
        lng: position.coords.longitude,
        lat: position.coords.latitude,
        heading: position.coords.heading ?? 0,
      };

      if (socket?.connected) {
        socket.emit('driver_location_update', payload);
        return;
      }

      try {
        await driverService.updateLocation(payload);
      } catch {
        // REST fallback should not block geolocation tracking
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      sendLocation,
      () => {},
      {
        enableHighAccuracy: true,
        maximumAge: LOCATION_UPDATE_INTERVAL_MS,
        timeout: LOCATION_UPDATE_INTERVAL_MS,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isDriver, isAvailable, isConnected, socket]);
};
