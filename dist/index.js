"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

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

var Client = _interopRequire(require("./Client"));

var Lifespan = _interopRequire(require("lifespan"));

var Remutable = _interopRequire(require("remutable"));

var Server = _interopRequire(require("./Server"));

module.exports = {
  Client: Client,
  Lifespan: Lifespan,
  Remutable: Remutable,
  Server: Server };