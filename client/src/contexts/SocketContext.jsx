import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import {
  disconnectActiveSocket,
  setActiveSocket,
} from '../utils/socketManager';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }

  return context;
};

export const SocketProvider = ({ children }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      disconnectActiveSocket();
      setSocket(null);
      setIsConnected(false);
      return undefined;
    }

    const socketUrl =
      import.meta.env.VITE_SOCKET_URL || window.location.origin;

    const socketInstance = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);

    setActiveSocket(socketInstance);
    setSocket(socketInstance);

    if (socketInstance.connected) {
      setIsConnected(true);
    }

    return () => {
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
      socketInstance.disconnect();
      setActiveSocket(null);
      setSocket(null);
      setIsConnected(false);
    };
  }, [token]);

  const joinTrip = useCallback(
    (tripId) => {
      if (socket?.connected) {
        socket.emit('join_trip', { tripId });
      }
    },
    [socket]
  );

  const leaveTrip = useCallback(
    (tripId) => {
      if (socket?.connected) {
        socket.emit('leave_trip', { tripId });
      }
    },
    [socket]
  );

  const value = useMemo(
    () => ({
      socket,
      isConnected,
      joinTrip,
      leaveTrip,
    }),
    [socket, isConnected, joinTrip, leaveTrip]
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
