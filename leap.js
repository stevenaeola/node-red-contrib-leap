const Leap = require('leapjs');
const _ = require('lodash');

module.exports = function (RED) {
    'use strict';

    function LeapNode (config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.controller = new Leap.Controller();

        node.connected = { server: false };

        node.hands = {
            left: { entered: false, pinched: false, clenched: false },
            right: { entered: false, pinched: false, clenched: false }
        };
        // threshholds for pinched and clenched
        node.upperThreshhold = 0.9;
        node.lowerThreshhold = 0.7;

        node.controller.on('frame', (frame) => {
            const handsPrevious = _.cloneDeep(node.hands);
            for (const lr in node.hands) {
                node.hands[lr].entered = false;
            }

            for (const hand of frame.hands) {
                const lr = hand.type; // left or right

                node.hands[lr].entered = true;
                if (!handsPrevious[lr].entered) {
                    sendHandMsg(lr, { payload: 'enter', palmPosition: hand.palmPosition });
                }
            }

            for (const lr in node.hands) {
                if (handsPrevious[lr].entered && !node.hands[lr].entered) {
                    sendHandMsg(lr, { payload: 'leave' });
                }
            }

            node.send([{ payload: 'frame' }, null, null]);
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
                    node.send([null, content, null]);
                    break;

                case 'right':
                    node.send([null, null, content]);
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
    }
    RED.nodes.registerType('leap', LeapNode);
};
