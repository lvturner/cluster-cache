module.exports = function(cluster) {
    var Promise = require('bluebird');
    function incoming_message(worker, msg) {
        switch(msg.method) {
            case "set":
                cache.set(msg.key, msg.val, msg.ttl, function(err, success) { 
                worker.send({ 
                    sig: msg.method + msg.key,
                    body: {
                        err: err,
                        success: success
                    }
                });
            });
            break;
            case "get":
                cache.get(msg.key, function(err, value) {
                    worker.send({ 
                        sig: msg.method + msg.key,
                        body: {
                            err: err,
                            value: value
                        }
                    });
            });
            break;
            case "del":
                cache.del(msg.key, function(err, count) { 
                    worker.send({ 
                        sig: msg.method + msg.key,
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
                        sig: msg.method + msg.key,
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
                        sig: msg.method,
                        body: {
                            err: err,
                            keys: keys
                        }
                    });
            });
            break;
            case "getStats":
                worker.send({ 
                    sig: msg.method,
                    body: cache.getStats() 
                });
            break;
            case "flushAll":
                cache.flushAll();
                worker.send({ 
                    sig: msg.method,
                    body: cache.getStats()
                });
            break;
        }
    }
    if(cluster.isMaster) {
        var NodeCache = require("node-cache");
        var cache = new NodeCache();

        cluster.on('online', function(worker) {
            console.log("Cluster cache has been told about " + worker.id);
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
                process.send({ 
                    method: "set", 
                    key: key, 
                    val: val, 
                    ttl: ttl 
                });
                resolve_dict["set" + key] = resolve;
            });
        };

        ClusterCache.get = function(key) {
            return new Promise(function(resolve, reject) {
                process.send({ 
                    method: "get", 
                    key: key, 
                });
                resolve_dict["get" + key] = resolve;
            });
        };

        ClusterCache.del = function(key) {
            return new Promise(function(resolve, reject) {
                process.send({ 
                    method: "del", 
                    key: key, 
                });
                resolve_dict["del" + key] = resolve;
            });
        };

        ClusterCache.ttl = function(key, ttl) {
            return new Promise(function(resolve, reject) {
                process.send({ 
                    method: "ttl", 
                    key: key, 
                    ttl: ttl
                });
                resolve_dict["ttl" + key] = resolve;
            });
        };

        ClusterCache.keys = function() {
            return new Promise(function(resolve, reject) {
                process.send({ 
                    method: "keys", 
                });
                resolve_dict.keys = resolve;
            });
        };

        ClusterCache.getStats = function() {
            return new Promise(function(resolve, reject) {
                process.send({ 
                    method: "getStats" 
                });
                resolve_dict.getStats = resolve;
            });
        };

        ClusterCache.flushAll = function() {
            return new Promise(function(resolve, reject) {
                process.send({ 
                    method: "flushAll" 
                });
                resolve_dict.flushAll = resolve;
            });
        };

        return ClusterCache;
    }
};
