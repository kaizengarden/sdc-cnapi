var async = require('async');
var common = require('../../lib/common');
var path = require('path');
var createModel = require('../../lib/models').createModel;

var configFilename = path.join(__dirname, '..', '..', 'config', 'test.json');

/**
 *
 * Moray
 *
 */

function MockMoray() {
    this.history = [];
    this.callbackValues = {
        putObject: [],
        findObjects: [],
        getObjects: [],
        delObject: []
    };
    this.reqs = [];
}

MockMoray.prototype.when = function (fn, args, results) {
    if (!this.callbackValues[fn]) {
        this.callbackValues[fn] = [];
    }
    this.callbackValues[fn].push(results);
};

MockMoray.prototype._emitResults = function (list) {
    var self = this;
    list.forEach(function (i) {
        self._lastReq().emit('record', { value: i });
    });
    self._lastReq().emit('end');
};

MockMoray.prototype._lastReq = function () {
    return this.reqs[this.reqs.length-1];
};

MockMoray.prototype.getObject = function (bucket, key, callback) {
    this.history.push(['getObject', bucket, key]);
    var val = this.callbackValues.getObject.pop();
    callback.apply(null, [ null, val ]);
    return this;
};

MockMoray.prototype.putObject = function (bucket, key, value, callback) {
    this.history.push(['putObject', bucket, key, value]);
    callback.apply(null, [ null ]);
    return this;
};

MockMoray.prototype.delObject = function (bucket, key, callback) {
    this.history.push(['delObject', bucket, key]);
    callback.apply(null, [ null ]);
    return this;
};

MockMoray.prototype.findObjects = function (bucket, filter, opts) {
    this.history.push(['findObjects', bucket, filter, opts]);
    var req = new process.EventEmitter();
    this.reqs.push(req);
    return req;
};

function MockMorayWrapper() {
    this.client = new MockMoray();
}

MockMorayWrapper.prototype.getClient = function () {
    return this.client;
};


/**
 *
 * Redis
 *
 */

function MockRedis() {
    this.history = [];
    this.callbackValues = {
        get: [],
        del: [],
        hmset: [],
        hmgetall: [],
        exec: [],
        exists: [],
        keys: []
    };
}

MockRedis.prototype.when = function (fn, args, results) {
    if (!this.callbackValues[fn]) {
        this.callbackValues[fn] = [];
    }
    this.callbackValues[fn].push(results);
};

MockRedis.prototype.hmset = function (key, values, callback) {
    this.history.push(['hmset', key, values]);
    callback();
    return this;
};

MockRedis.prototype.hgetall = function (key, callback) {
    this.history.push(['hgetall', key]);
    callback();
    return this;
};

MockRedis.prototype.get = function (key, callback) {
    this.history.push(['get', key]);
    callback();
    return this;
};

MockRedis.prototype.keys = function (key, callback) {
    this.history.push(['keys', key]);
    callback.apply(null, this.callbackValues.keys.pop());
    return this;
};

MockRedis.prototype.del = function (key, callback) {
    this.history.push(['del', key]);
    callback();
    return this;
};

function MockRedisWrapper() {
    this.client = new MockRedis();
}

MockRedisWrapper.prototype.getClient = function () {
    return this.client;
};

/**
 *
 * Ur
 *
 */

function MockUr() {
    this.history = [];
    this.callbackValues = {
        execute: []
    };
}

MockUr.prototype.when = function (fn, args, results) {
    if (!this.callbackValues[fn]) {
        this.callbackValues[fn] = [];
    }
    this.callbackValues[fn].push(results);
};


MockUr.prototype.execute = function (opts, callback) {
    this.history.push(['execute', opts]);
    callback.apply(null, this.callbackValues.execute.pop());
    return this;
};


function newModel(callback) {
    var config;
    var model;

    var logFn = function () { console.log.apply(null, arguments); };
    var log = {
        debug: logFn,
        trace: logFn,
        error: logFn,
        info: logFn
    };

    var moray = new MockMorayWrapper();
    var redis = new MockRedisWrapper();
    var ur = new MockUr();

    async.waterfall([
        function (wf$callback) {
            common.loadConfig(configFilename, function (error, c) {
                config = c;
                return wf$callback();
            });
        },
        function (wf$callback) {
            model = createModel({
                log: log,
                datacenter: config.datacenter_name,
                amqp: {
                    host: 'localhost'
                }
            });
            model.setMoray(moray);
            model.setRedis(redis);
            model.setUr(ur);
            wf$callback();
        }
    ],
    function (error) {
        var components = {
            moray: moray,
            redis: redis,
            ur: ur
        };
        return callback(error, model, components);
    });
}

module.exports = {
    MockRedis: MockRedis,
    MockRedisWrapper: MockRedisWrapper,
    MockMorayWrapper: MockMorayWrapper,
    newModel: newModel
};
