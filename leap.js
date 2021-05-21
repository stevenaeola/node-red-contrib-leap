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

            const frameSummary = {};

            for (const hand of frame.hands) {
                const lr = hand.type; // left or right
                const summary = handSummary(hand);
                frameSummary[lr] = summary;

                node.hands[lr].entered = true;
                if (!handsPrevious[lr].entered) {
                    sendHandMsg(lr, { payload: 'enter', hand: summary });
                }

                if (summary.confidence > 0.5) {
                    if (summary.pinch > node.upperThreshhold && !handsPrevious[lr].pinched) {
                        node.hands[lr].pinched = true;
                        sendHandMsg(lr, { payload: 'pinch', hand: summary });
                    }
                    if (summary.pinch < node.lowerThreshhold && handsPrevious[lr].pinched) {
                        node.hands[lr].pinched = false;
                        sendHandMsg(lr, { payload: 'unpinch', hand: summary });
                    }
                    if (summary.grab > node.upperThreshhold && !handsPrevious[lr].clenched) {
                        node.hands[lr].clenched = true;
                        sendHandMsg(lr, { payload: 'clench', hand: summary });
                    }
                    if (summary.grab < node.lowerThreshhold && handsPrevious[lr].clenched) {
                        node.hands[lr].clenched = false;
                        sendHandMsg(lr, { payload: 'unclench', hand: summary });
                    }
                }
            }

            for (const lr in node.hands) {
                if (handsPrevious[lr].entered && !node.hands[lr].entered) {
                    sendHandMsg(lr, { payload: 'leave' });
                    node.hands[lr].clenched = false;
                    node.hands[lr].pinched = false;
                }
            }

            if (node.hands.left.entered || node.hands.right.entered) {
                node.send([{ payload: frameSummary }, null, null]);
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

        // include only the 'important' details, to improve performance
        function handSummary (hand) {
            return {
                position: hand.stabilizedPalmPosition,
                normal: hand.palmNormal,
                velocity: hand.palmVelocity,
                pitch: hand.pitch(),
                roll: hand.roll(),
                yaw: hand.yaw(),
                pinch: hand.pinchStrength,
                grab: hand.grabStrength,
                confidence: hand.confidence
            };
        }
    }
    RED.nodes.registerType('leap', LeapNode);
};
