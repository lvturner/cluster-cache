var cluster = require('cluster');
var async = require('async');
var cluster_cache;
try {
  var cls = require('continuation-local-storage');
  var ns = cls.createNamespace('myNamespace');
  cluster_cache = require('./cluster-node-cache')(cluster,{},ns);
} catch (e) {
  console.log("*** CLS support not found, continuing without");
  cluster_cache = require('./cluster-node-cache')(cluster);
}

if(cluster.isMaster && !process.env.DEBUG) {
  worker = cluster.fork();
  cluster.on('exit', function() {
    cluster.fork();
  });
} else {
  cluster_cache.get("key that can't exist");
  cluster_cache.get(undefined);
  cluster_cache.get(null);

  cluster_cache.set("myKey", "myVal", 1).then(function(result) {
    console.log("got result err: " + result.err);
    console.log("got result success: " + result.success);
  });

  cluster_cache.get("myKey").then(function(result) {
    console.log("Get cache result... ");
    console.log(result.value);
  });

  cluster_cache.get("myKey2").then(function(result) {
    console.log("Get cache result... ");
    console.log(result.value);
  });

  cluster_cache.set("myKey3", "myVal").then(function(result) {
    return cluster_cache.set("myKey4", "myVal");
  }).then(function(result) {
    console.log("looking for multiple keys");
    cluster_cache.get(["myKey3", "myKey4"]).then(function(result) {
      console.log("Results from looking for multiple keys");
      console.log(result);
    });
  });


  cluster_cache.set(undefined, "some value").then(function(result) {
    console.log("Results of trying to set undefined key");
    console.log(result.value);
  });

  cluster_cache.set("undefined", undefined).then(function(result) {
    console.log("Results of setting undefined value");
    console.log(result.value);
  });

  cluster_cache.get("undefined").then(function(result) {
    console.log("Results of getting a value that's undefined");
    console.log(result.value);
  });

  cluster_cache.del("myKey");

  cluster_cache.getStats().then(function(result) {
    console.log(result);
  });

  cluster_cache.getStats().then(function(result) {
    console.log(result);
  });

  async.parallel([
    function(callback) {
    cluster_cache.set("val", "val").then(function(result) {
      console.log("-----");
      console.log("ASYNC Set val");
      console.log(result);
      console.log("-----");
      callback(null, result);
    });
  },
  function(callback) {
    cluster_cache.set("val2", "val2").then(function(result) {
      console.log("-----");
      console.log("Set val2");
      console.log(result);
      console.log("-----");
      callback(null, result);
    });
  },
  function(callback) {
    cluster_cache.get("val").then(function(result) {
      console.log("-----");
      console.log("Looking for val, found ");
      console.log(result);
      console.log("-----");
      callback(null, result);
    });
  }
  ],
  // optional callback
  function(err, results){
    // the results array will equal ['one','two'] even though
    // the second function had a shorter timeout.
    console.log("ERRORS: " + err);
    console.log("RESULTS: " + results);
  });

  async.concat([ 'key1', 'key2', 'key3'], function(key_name, callback) {
    cluster_cache.set(key_name, key_name).then(function(results) {
      console.log("Set " + key_name);
      cluster_cache.set(key_name + "alt", key_name + "alt");
    });
    cluster_cache.get(key_name).then(function(results) {
      console.log("-----");
      console.log("Get " + key_name);
      console.log(results);
      console.log("-----");
      cluster_cache.get(key_name+"alt").then(function(altresults) {
        console.log("-----");
        console.log("Alt results");
        console.log(altresults);
        callback(null, altresults);
        console.log("-----");
      });
    });
  },
  function(err, results) { console.log("End of concat"); console.log(results); });
}
