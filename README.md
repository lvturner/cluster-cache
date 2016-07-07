cluster-node-cache
===========
[![NPM version](https://badge.fury.io/js/cluster-node-cache.png)](http://badge.fury.io/js/cluster-node-cache)

[![NPM](https://nodei.co/npm/cluster-node-cache.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/cluster-node-cache/)

# Simple and fast NodeJS internal caching that works in a clustered environment.

This module is a wrapper for [node-cache](https://github.com/tcs-de/nodecache) that allows it to work in a
clustered environment - without it, you would have an instance of node-cache per core. It's API and functionality
is mostly similar.

# Note
This does not yet support the the 2.0 release of node-cache.

# Install

``bash
  npm install cluster-node-cache
``
# Examples:

## Initialize (INIT):

```js
var cluster = require('cluster');
var myCache = require('cluster-node-cache')(cluster);
```

### Options

- `stdTTL`: *(default: `0`)* the standard ttl as number in seconds for every generated cache element.  
`0` = unlimited
- `checkperiod`: *(default: `600`)* The period in seconds, as a number, used for the automatic delete check interval.  
`0` = no periodic check.  

```js
var cluster = require('cluster');
var myCache = require('cluster-node-cache')(cluster, {stdTTL: 100, checkperiod: 900});
```

### Optional CLS support

```js
var cluster = require('cluster');
var cls     = require('continuation-local-storage');
var ns      = cls.createNamespace('myNamespace');
var myCache = require('cluster-node-cache')(cluster,{},ns);
```

## Store a key (SET):

`myCache.set(key, val, [ttl])`

Sets a `key` `value` pair. It is possible to define a `ttl` (in seconds).  
Returns `true` on success.

```js
obj = { my: "Special", variable: 42 };
myCache.set("myKey", obj).then(function(result) {
  console.log(result.err);
  console.log(result.success);
});
```

## Retrieve a key (GET):

`myCache.get(key)`

Gets a saved value from the cache.
Returns a `undefined` if not found or expired.

```js
eyCache.get("myKey").then(function(results) {
  if(results.err) {
    console.log(results.err);
  } else {
    console.log(results.value.myKey);
  }
});
```

## Get multiple keys (MGET):

`myCache.get([ key1, key2, ...])`

Gets multiple saved values from the cache.

```js
myCache.get(["keyA", "keyB"]).then(function(results) {
  if(results.err) {
    console.log(results.err);
  } else {
    console.log(results.value);
  }
});
```


## Delete a key (DEL):

`myCache.del(key)`

Delete a key. Returns the number of deleted entries. A delete will never fail.

```
myCache.del("myKey").then(function(results) {
  if(!results.err) {
    console.log(results.count);
  }
});
```

## Change TTL (TTL):

`myCache.ttl(key, ttl)`

Redefine the ttl of a key. Returns true if the key has been found and changed. Otherwise returns false.  
If the ttl-argument isn't passed the default-TTL will be used.

```js
myCache = new NodeCache({ stdTTL: 100 })
myCache.ttl( "myKey", 100).then(function(results) {
  if(!results.err) {
    console.log(results.changed); // true
  }
});
```

## List keys (KEYS)

`myCache.keys()`

Returns an array of all existing keys.  

```js
myCache.keys().then(function(results) {
  if(!results.err) {
    console.log(results.keys);
  }
});
```

## Statistics (STATS):

`myCache.getStats()`

Returns the statistics.  

```js
myCache.getStats().then(function(results) {
  console.log(results);
  /*
    {
      keys: 0,    // global key count
      hits: 0,    // global hit count
      misses: 0,  // global miss count
      ksize: 0,   // global key size count
      vsize: 0    // global value size count
    }
  */
});
```

## Flush all data (FLUSH):

`myCache.flushAll()`

Flush all data.  

```js
myCache.flushAll().then(function(results) {
  console.log(results);
  /*
    {
      keys: 0,    // global key count
      hits: 0,    // global hit count
      misses: 0,  // global miss count
      ksize: 0,   // global key size count
      vsize: 0    // global value size count
    }
  */
});
```

# Pull requests welcomed !
  * Especially if they contain tests better than the current terrible ones :)

# The ISC License

Copyright (c) 2015, Lee Turner

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
