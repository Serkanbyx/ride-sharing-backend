let activeSocket = null;

export const setActiveSocket = (socket) => {
  activeSocket = socket;
};

export const disconnectActiveSocket = () => {
  if (activeSocket?.connected) {
    activeSocket.disconnect();
  }

  activeSocket = null;
};
