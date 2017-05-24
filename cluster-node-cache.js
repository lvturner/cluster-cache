module.exports = function(cluster, options, namespace) {
  var UNDEFINED_KEY_ERROR = "Undefined or null key";

  var NodeCache     = require("node-cache");
  var Promise       = require('bluebird');
  var clsBluebird   = require('cls-bluebird');

  var crypto = require('crypto');

  function prefixData(data) {
    data.clusternodecache = true;

    if (namespace && namespace.name) {
      data.namespace = namespace.name;
    }

    return data;
  }

  function incoming_message(worker, msg) {
    // validate this message is for us
    if (!msg.clusternodecache) {
      return;
    }

    if (msg.namespace && namespace && msg.namespace != namespace.name) {
      // for another cache (namespace)
      return;
    }

    switch(msg.method) {
      case "set":
        if(msg.key === undefined || msg.key === null) {
          worker.send(prefixData({
            sig: msg.method + msg.key + msg.timestamp,
            body: {
              err: UNDEFINED_KEY_ERROR,
              success: {}
            }
          }));
        } else {
          cache.set(msg.key, msg.val, msg.ttl, function(err, success) {
            worker.send(prefixData({
              sig: msg.method + msg.key + msg.timestamp,
              body: {
                err: err,
                success: success
              }
            }));
          });
        }
        break;
      case "get":
        if(msg.key === undefined || msg.key === null) {
          worker.send(prefixData({
            sig: msg.method + msg.key + msg.timestamp,
            body: {
              err: UNDEFINED_KEY_ERROR,
              success: {}
            }
          }));
        } else {
          cache.get(msg.key, function(err, value) {
            worker.send(prefixData({
              sig: msg.method + msg.key + msg.timestamp,
              body: {
                err: err,
                value: value
              }
            }));
          });
        }
        break;
      case "del":
        cache.del(msg.key, function(err, count) {
          worker.send(prefixData({
            sig: msg.method + msg.key + msg.timestamp,
            body: {
              err: err,
              count: count
            }
          }));
        });
        break;
      case "ttl":
        cache.ttl(msg.key, msg.ttl, function(err, changed) {
          worker.send(prefixData({
            sig: msg.method + msg.key + msg.timestamp,
            body: {
              err: err,
              changed: changed
            }
          }));
        });
        break;
      case "keys":
        cache.keys(function(err, keys) {
          worker.send(prefixData({
            sig: msg.method + msg.timestamp,
            body: {
              err: err,
              keys: keys
            }
          }));
        });
        break;
      case "getStats":
        worker.send(prefixData({
          sig: msg.method + msg.timestamp,
          body: cache.getStats()
        }));
        break;
      case "flushAll":
        cache.flushAll();
        worker.send(prefixData({
          sig: msg.method + msg.timestamp,
          body: cache.getStats()
        }));
        break;
    }
  }

  if(cluster.isMaster && !process.env.DEBUG) {
    var cache = new NodeCache(options);

    cluster.on('online', function(worker) {
      worker.on('message', incoming_message.bind(null, worker));
    });
  } else {
    var ClusterCache = {};
    var resolve_dict = {};
    var debugCache = {};

    var debugMode = Boolean(process.env.DEBUG);

    if(debugMode) {
      debugCache = new NodeCache(options);
    }

    if (namespace){
      clsBluebird(namespace,Promise);
    }

    process.on("message", function(msg) {
      // validate this message is for us
      if (!msg.clusternodecache) {
        return;
      }

      if (msg.namespace && namespace && msg.namespace != namespace.name) {
        // for another cache (namespace)
        return;
      }

      if(resolve_dict[msg.sig]) {
        resolve_dict[msg.sig](msg.body);
        delete resolve_dict[msg.sig];
      }
    });

    ClusterCache.set = function(key, val, ttl) {
      return new Promise(function(resolve, reject) {
        if(debugMode) {
          if(key === undefined || key === null) {
            resolve({ err: "Undefined or null key", success: {} });
          } else {
            debugCache.set(key, val, ttl, function(err, success) {
              resolve({ err: err, success: success });
            });
          }
        } else {
          var timestamp = getId();
          resolve_dict["set" + key + timestamp] = resolve;
          process.send(prefixData({
            method: "set",
            timestamp: timestamp,
            key: key,
            val: val,
            ttl: ttl
          }));
        }
      });
    };

    ClusterCache.get = function(key) {
      return new Promise(function(resolve, reject) {
        if(debugMode) {
          if(key === undefined || key === null) {
            resolve({ err: UNDEFINED_KEY_ERROR, success: {} });
          } else {
            debugCache.get(key, function(err, value) {
              resolve({ err: err, value: value });
            });
          }
        } else {
          var timestamp = getId();
          resolve_dict["get" + key + timestamp] = resolve;
          process.send(prefixData({
            method: "get",
            timestamp: timestamp,
            key: key,
          }));
        }
      });
    };

    ClusterCache.del = function(key) {
      return new Promise(function(resolve, reject) {
        if(debugMode) {
          debugCache.del(key, function(err, count) {
            resolve({ err: err, count: count });
          });
        } else {
          var timestamp = getId();
          resolve_dict["del" + key + timestamp] = resolve;
          process.send(prefixData({
            method: "del",
            timestamp: timestamp,
            key: key,
          }));
        }
      });
    };

    ClusterCache.ttl = function(key, ttl) {
      return new Promise(function(resolve, reject) {
        if(debugMode) {
          debugCache.ttl(key, ttl, function(err, changed) {
            resolve({ err: err, changed: changed });
          });
        } else {
          var timestamp = getId();
          resolve_dict["ttl" + key + timestamp] = resolve;
          process.send(prefixData({
            method: "ttl",
            timestamp: timestamp,
            key: key,
            ttl: ttl
          }));
        }
      });
    };

    ClusterCache.keys = function() {
      return new Promise(function(resolve, reject) {
        if(debugMode) {
          debugCache.keys(function(err, keys) {
            resolve({ err: err, value: keys });
          });
        } else {
          var timestamp = getId();
          resolve_dict['keys' + timestamp] = resolve;
          process.send(prefixData({
            method: "keys",
            timestamp: timestamp,
          }));
        }
      });
    };

    ClusterCache.getStats = function() {
      return new Promise(function(resolve, reject) {
        if(debugMode) {
          resolve(debugCache.getStats());
        } else {
          var timestamp = getId();
          resolve_dict['getStats' + timestamp] = resolve;
          process.send(prefixData({
            method: "getStats",
            timestamp: timestamp,
          }));
        }
      });
    };

    ClusterCache.flushAll = function() {
      return new Promise(function(resolve, reject) {
        if(debugMode) {
          resolve(debugCache.flushAll());
        } else {
          var timestamp = getId();
          resolve_dict['flushAll' + timestamp] = resolve;
          process.send(prefixData({
            method: "flushAll",
            timestamp: timestamp,
          }));
        }
      });
    };

    return ClusterCache;
  }

  function getId() {
    return crypto.randomBytes(16).toString("hex");
  }
};
