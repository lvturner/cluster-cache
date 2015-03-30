var cluster = require('cluster');
var cluster_cache = require('./cluster-node-cache')(cluster);
if(cluster.isMaster && !process.env.DEBUG) {
    var cpus = require('os').cpus().length;
    for(var i = 0; i < cpus; i++) {
        setTimeout(function() {
            worker = cluster.fork();
        }, (i * 1000));
    }
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
}
