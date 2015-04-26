module.exports = function(cluster, options) {
  var Promise = require('bluebird');
  function incoming_message(worker, msg) {
    switch(msg.method) {
      case "set":
        if(msg.key === undefined || msg.key === null) {
        console.log("Trying to set a key with an undefined or null value!\n" + msg);
        worker.send({
          sig: msg.method + msg.key + msg.timestamp,
          body: { 
            err: "undefined or null key sent",
            success: {}
          }
        });
      } else {
        cache.set(msg.key, msg.val, msg.ttl, function(err, success) { 
          worker.send({ 
            sig: msg.method + msg.key + msg.timestamp,
            body: {
              err: err,
              success: success
            }
          });
        });
      }
      break;
      case "get":
        if(msg.key === undefined || msg.key === null) {
        console.log("Trying to get a key with an undefined or null value!\n" + msg);
        worker.send({
          sig: msg.method + msg.key + msg.timestamp,
          body: { 
            err: "undefined or null key sent",
            success: {}
          }
        });
      } else {
        cache.get(msg.key, function(err, value) {
          worker.send({ 
            sig: msg.method + msg.key + msg.timestamp,
            body: {
              err: err,
              value: value
            }
          });
        });
      }
      break;
      case "del":
        cache.del(msg.key, function(err, count) { 
        worker.send({ 
          sig: msg.method + msg.key + msg.timestamp,
          body: {
            err: err,
            count: count
          }
        });
      });
      break;
      case "ttl":
        cache.ttl(msg.key, msg.ttl, function(err, changed) { 
        worker.send({ 
          sig: msg.method + msg.key + msg.timestamp,
          body: {
            err: err,
            changed: changed
          }
        });
      });
      break;
      case "keys":
        cache.keys(function(err, keys) {
        worker.send({ 
          sig: msg.method + msg.timestamp,
          body: {
            err: err,
            keys: keys
          }
        });
      });
      break;
      case "getStats":
        worker.send({ 
        sig: msg.method + msg.timestamp,
        body: cache.getStats() 
      });
      break;
      case "flushAll":
        cache.flushAll();
      worker.send({ 
        sig: msg.method + msg.timestamp,
        body: cache.getStats()
      });
      break;
    }
  }
  if(cluster.isMaster) {
    var NodeCache = require("node-cache");
    var cache = new NodeCache(options);

    cluster.on('online', function(worker) {
      worker.on('message', incoming_message.bind(null, worker));
    });
  } else {
    var ClusterCache = {};
    var resolve_dict = {};

    process.on("message", function(msg) {
      if(resolve_dict[msg.sig]) {
        resolve_dict[msg.sig](msg.body);
        delete resolve_dict[msg.sig];
      }
    });

    ClusterCache.set = function(key, val, ttl) {
      return new Promise(function(resolve, reject) {
        var timestamp = (new Date()).getTime();
        process.send({ 
          method: "set", 
          timestamp: timestamp,
          key: key, 
          val: val, 
          ttl: ttl 
        });
        resolve_dict["set" + key + timestamp] = resolve;
      });
    };

    ClusterCache.get = function(key) {
      return new Promise(function(resolve, reject) {
        var timestamp = (new Date()).getTime();
        process.send({ 
          method: "get", 
          timestamp: timestamp,
          key: key, 
        });
        resolve_dict["get" + key + timestamp] = resolve;
      });
    };

    ClusterCache.del = function(key) {
      return new Promise(function(resolve, reject) {
        var timestamp = (new Date()).getTime();
        process.send({ 
          method: "del", 
          timestamp: timestamp,
          key: key, 
        });
        resolve_dict["del" + key + timestamp] = resolve;
      });
    };

    ClusterCache.ttl = function(key, ttl) {
      return new Promise(function(resolve, reject) {
        var timestamp = (new Date()).getTime();
        process.send({ 
          method: "ttl", 
          timestamp: timestamp,
          key: key, 
          ttl: ttl
        });
        resolve_dict["ttl" + key + timestamp] = resolve;
      });
    };

    ClusterCache.keys = function() {
      return new Promise(function(resolve, reject) {
        var timestamp = (new Date()).getTime();
        process.send({ 
          method: "keys", 
          timestamp: timestamp,
        });
        resolve_dict['keys' + timestamp] = resolve;
      });
    };

    ClusterCache.getStats = function() {
      return new Promise(function(resolve, reject) {
        var timestamp = (new Date()).getTime();
        process.send({ 
          method: "getStats",
          timestamp: timestamp,
        });
        resolve_dict['getStats' + timestamp] = resolve;
      });
    };

    ClusterCache.flushAll = function() {
      return new Promise(function(resolve, reject) {
        var timestamp = (new Date()).getTime();
        process.send({ 
          method: "flushAll",
          timestamp: timestamp,
        });
        resolve_dict['flushAll' + timestamp] = resolve;
      });
    };

    return ClusterCache;
  }
};
