var events = require('events');
var dgram = require('dgram');
var util = require('util');
var PythonShell = require('python-shell')
var sleep = require('system-sleep')

/* The P_MUL daemon listens on that port for incoming requests */
var PMUL_SERVER_PORT = 32103;

/* PmulClient which connects to the PMUL daemon */
var PmulClient = function(options) {
    var self = this;
    this.srcIpAddr = '127.0.0.1';           /* Local IP address of the client */
    this.dstIpAddr = '127.0.0.1';           /* IP address of the P_MUL daemon */
    this.daemonPort = PMUL_SERVER_PORT      /* UDP port of the P_MUL daemon */

    var opt = {
        pythonPath: options.pythonPath
    }
    pyshell = PythonShell.run('./node_modules/pmul-client/daemon.py', options, function(err) {
        if (err)
            console.log('daemon.py started with an error ' + err);
            return;
        console.log('pmul daemon was started');
    });
    pyshell.on('message', function(message) {
        console.log(message);
    });
    sleep(2000)
    console.log('create socket');

    /* UDP socket for communication with the P_MUL daemon */
    self.dgram = dgram.createSocket('udp4');
    self.dgram.bind(0);
    self.dgram.on ("message", self._onMsg.bind(self));
    self.dgram.on ("close", self._onClose.bind(self));
    self.dgram.on ("error", self._onError.bind(self));
    console.log('Created PmulClient')

    /* On startup the client registers at the P_MUL daemon */
    msg = JSON.stringify({ 'type': 'register'});
    console.log('send register message to ' + self.dstIpAddr + ':' + self.daemonPort);
    self.dgram.send(msg, 0, msg.length, self.daemonPort, self.dstIpAddr);
};
util.inherits (PmulClient, events.EventEmitter);

/* Handle a message received from the P_MUL daemon */
PmulClient.prototype._onMsg = function (buffer, remote) {
    var self = this;
    var message = JSON.parse(buffer);
    if (message['type'] == 'finished') {
        self.finishedCb();
    }
    else if (message['type'] == 'message') {
        self.emit('message', message['payload'], message['from_addr']);
    }
};

/* Handle close event of socket */
PmulClient.prototype._onClose = function() {
    console.log('onClose');
};

/* Handle error event of socket */
PmulClient.prototype._onError = function() {
    console.log('onError');
};

/* Teardown the socket */
PmulClient.prototype.teardown = function(finishedCb) {
    this.dgram.once('close', function() {
        finishedCb();
    })
    this.dgram.close();
};

/* Send a message via P_MUL */
PmulClient.prototype.sendMessage = function(dstIpAddrs, message, finishedCb) {
    var self = this;
    self.finishedCb = finishedCb;
    msg = JSON.stringify({ 'type': 'send', 'destinations': dstIpAddrs, 'payload': message});
    console.log('send message to ' + self.dstIpAddr + ':' + self.daemonPort);
    self.dgram.send(msg, 0, msg.length, self.daemonPort, self.dstIpAddr);
};

/* Export the P_MUL client class */
exports.PmulClient = PmulClient;

/* Create default options */
exports.createOptions = function() {
    var options = {
        pythonPath: 'python3'
    };
    return options;
};

/* Create a P_MUL client with options */
exports.createPmulClient = function (options) {
        var opt = {
            pythonPath: 'python3'
        };
        if (options != null && options.pythonPath != null)  {
            opt.pythonPath = options.pythonPath
        }
        return new PmulClient(opt);
};

