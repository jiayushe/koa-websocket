const url = require('url');
const compose = require('koa-compose');
const co = require('co');
const ws = require('ws');

const WebSocketServer = ws.Server;
const debug = require('debug')('koa:websockets');

function KoaWebSocketServer(app, options) {
  this.app = app;
  this.middleware = [];
  this.options = options;
}

KoaWebSocketServer.prototype.listen = function listen(server) {
  const self = this;
  this.server = new WebSocketServer({
    server,
  });
  this.server.on('connection', (socket, req) => {
    (self.onConnection.bind(self))(socket, req);
    self.options.onConnection(socket);
  });
};

KoaWebSocketServer.prototype.onConnection = function onConnection(socket, req) {
  debug('Connection received');
  socket.on('error', (err) => {
    debug('Error occurred:', err);
  });
  const fn = co.wrap(compose(this.middleware));

  const context = this.app.createContext(req);
  context.websocket = socket;
  context.path = url.parse(req.url).pathname;

  fn(context).catch((err) => {
    debug(err);
  });
};

KoaWebSocketServer.prototype.use = function use(fn) {
  this.middleware.push(fn);
  return this;
};

module.exports = function middleware(app, options) {
  const oldListen = app.listen;
  app.listen = function listen(...args) {
    debug('Attaching server...');
    app.server = oldListen.apply(app, args);
    app.ws.listen(app.server);
    return app.server;
  };
  app.ws = new KoaWebSocketServer(app, options);
  return app;
};
