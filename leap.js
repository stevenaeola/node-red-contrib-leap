const Leap = require('leapjs');
const _ = require('lodash');

module.exports = function (RED) {
    'use strict';

    function LeapNode (config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.controller = new Leap.Controller();

        node.connected = { server: false };

        node.controller.on('frame', (frame) => {
            for (const hand of frame.hands) {
                const lr = hand.type; // left or right
                const summary = handSummary(hand);
                sendHandMsg(lr, {payload: summary});
            }
        });

        node.controller.on('connect', () => {
            node.warn('connected to leap server');
            connected('server', true);
        });

        node.controller.on('disconnect', () => {
            node.warn('disconnected from leap server');
            connected('server', false);
        });

        node.controller.connect();

        function sendHandMsg (lr, content) {
            switch (lr) {
                case 'left':
                    node.send([content, null]);
                    break;

                case 'right':
                    node.send([null, content]);
                    break;

                default:
                    node.warn('Unexpected hand type: ' + lr);
            }
        }

        function connected (thing, isConnected) {
            node.connected[thing] = isConnected;
            if (node.connected.server) {
                node.status({ fill: 'green', shape: 'dot', text: 'connected' });
            } else {
                node.status({ fill: 'red', shape: 'ring', text: 'disconnected' });
            }
        }

        // include only the 'important' details, to improve performance
        function handSummary (hand) {
            const pos = hand.stabilizedPalmPosition;
            const vel = hand.palmVelocity;
            return {
                x: pos[0],
                y: pos[1],
                z: pos[2],
                vx: vel[0],
                vy: vel[1],
                vz: vel[2],
                pitch: hand.pitch(),
                roll: hand.roll(),
                yaw: hand.yaw(),
                pinch: hand.pinchStrength,
                grab: hand.grabStrength,
                radius: hand.sphereRadius,
                confidence: hand.confidence
            };
        }
    }
    RED.nodes.registerType('leap', LeapNode);
};
