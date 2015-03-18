var cluster = require('cluster');
var cluster_cache = require('./cluster-cache')(cluster);
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

    cluster_cache.del("myKey");

    cluster_cache.getStats().then(function(result) {
        console.log(result);
    });
}
