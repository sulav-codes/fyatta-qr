let socketServer = null;

function setSocketServer(io) {
  socketServer = io;
  return socketServer;
}

function getSocketServer() {
  return socketServer;
}

export { setSocketServer, getSocketServer };
