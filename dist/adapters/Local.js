"use strict";

var _prototypeProperties = function (child, staticProps, instanceProps) { if (staticProps) Object.defineProperties(child, staticProps); if (instanceProps) Object.defineProperties(child.prototype, instanceProps); };

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

require("babel/polyfill");
var _ = require("lodash");
var should = require("should");
var Promise = (global || window).Promise = require("bluebird");
var __DEV__ = process.env.NODE_ENV !== "production";
var __PROD__ = !__DEV__;
var __BROWSER__ = typeof window === "object";
var __NODE__ = !__BROWSER__;
if (__DEV__) {
  Promise.longStackTraces();
  Error.stackTraceLimit = Infinity;
}

var _2 = require("../");

var Client = _2.Client;
var Server = _2.Server;
var Link = Server.Link;

var _LocalServer = undefined,
    _LocalLink = undefined;

var LocalClient = (function (Client) {
  function LocalClient(server) {
    var _this = this;

    _classCallCheck(this, LocalClient);

    if (__DEV__) {
      server.should.be.an.instanceOf(_LocalServer);
    }
    this._server = server;
    this._link = new _LocalLink(this);
    this._server.acceptLink(this._link);
    _get(Object.getPrototypeOf(LocalClient.prototype), "constructor", this).call(this);
    this.lifespan.onRelease(function () {
      _this._link.lifespan.release();
      _this._link = null;
    });
  }

  _inherits(LocalClient, Client);

  _prototypeProperties(LocalClient, null, {
    sendToServer: {
      value: function sendToServer(ev) {
        this._link.receiveFromClient(ev);
      },
      writable: true,
      configurable: true
    },
    fetch: {
      value: function fetch(path) {
        var _this = this;

        // just ignore hash
        return Promise["try"](function () {
          // fail if there is not such published path
          _this._server.stores.should.have.property(path);
          return _this._server.stores[path];
        });
      },
      writable: true,
      configurable: true
    }
  });

  return LocalClient;
})(Client);

var LocalLink = (function (Link) {
  function LocalLink(client) {
    var _this = this;

    _classCallCheck(this, LocalLink);

    if (__DEV__) {
      client.should.be.an.instanceOf(LocalClient);
    }
    _get(Object.getPrototypeOf(LocalLink.prototype), "constructor", this).call(this);
    this._client = client;
    this.lifespan.onRelease(function () {
      client.lifespan.release();
      _this._client = null;
    });
  }

  _inherits(LocalLink, Link);

  _prototypeProperties(LocalLink, null, {
    sendToClient: {
      value: function sendToClient(ev) {
        this._client.receiveFromServer(ev);
      },
      writable: true,
      configurable: true
    }
  });

  return LocalLink;
})(Link);

_LocalLink = LocalLink;

var LocalServer = (function (Server) {
  function LocalServer() {
    var _this = this;

    var stores = arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, LocalServer);

    if (__DEV__) {
      stores.should.be.an.Object;
    }
    _get(Object.getPrototypeOf(LocalServer.prototype), "constructor", this).call(this);
    this.stores = stores;
    this.lifespan.onRelease(function () {
      return _this.stores = null;
    });
  }

  _inherits(LocalServer, Server);

  return LocalServer;
})(Server);

_LocalServer = LocalServer;

module.exports = {
  Client: LocalClient,
  Server: LocalServer };