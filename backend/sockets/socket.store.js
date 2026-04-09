let socketServer = null;

function setSocketServer(io) {
  socketServer = io;
  return socketServer;
}

function getSocketServer() {
  return socketServer;
}

module.exports = {
  setSocketServer,
  getSocketServer,
};
