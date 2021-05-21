const Leap = require('leapjs');

module.exports = function (RED) {
    'use strict';

    function LeapNode(config) {


        RED.nodes.createNode(this, config);
        const node = this;

        node.controller = new Leap.Controller();

        node.connected = {server: false};

        node.hands = {
            left: { entered: false, pinched: false, clenched: false },
            right: { entered: false, pinched: false, clenched: false }
        };

        node.controller.on('connect', () => {
            node.warn('connected to leap server');
            connected('server', true);
         });

         node.controller.on('disconnect', () => {
            node.warn('disconnected from leap server');
            connected('server', false);
         });

         node.controller.on('frame', (frame) => {
             let msg = [{payload: frame}, null, null];
             node.send(msg);
         })
         
        node.controller.connect();

        function connected(thing, isConnected){
            node.connected[thing] = isConnected;
            if (node.connected['server']) {
                node.status({fill:"green",shape:"dot",text:"connected"});
            } else {
                node.status({fill:"red",shape:"ring",text:"disconnected"});
            }
        }
    }

    RED.nodes.registerType("leap", LeapNode)
}

