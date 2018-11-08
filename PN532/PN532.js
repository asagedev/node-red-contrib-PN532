/**
 * Copyright 2013,2016 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function(RED) {
    "use strict";
    var spawn = require('child_process').spawn;
    var fs = require('fs');

    var PN532command = __dirname+'/PN532';

    if ( !(1 & parseInt((fs.statSync(PN532command).mode & parseInt("777", 8)).toString(8)[0]) )) {
        RED.log.error("File Not Executable",{command:PN532command});
        throw "Error : File Not Executable";
    }

    function PN532(n) {
        RED.nodes.createNode(this,n);
        this.sensorFunction = n.sensorFunction;
        this.delay = n.delay;
        var statustimeout = parseInt(this.delay)*1000;
        var node = this;
        var statustimeoutfunction;

        node.child = spawn(PN532command,[this.delay]);
        node.running = true;
        node.status({fill:"green",shape:"dot",text:"Waiting for Card"});

        node.child.stdout.on('data', function (data) {
            console.log(data);
                var pattern = new RegExp("^\\d{12}$");

                clearTimeout(statustimeoutfunction);
                data = data.toString().trim();

                if (data.length > 0) {
                    if (node.running) {
                        if (data.match(pattern)){
                            node.send({ payload:(data) });
                        }
                        else{
                            RED.log.warn("Card Error - " + data)
                        }
                    }

                    node.status({fill:"green",shape:"dot",text:data});
                    if (RED.settings.verbose) { node.log("Card UID: "+data); }
                    statustimeoutfunction = setTimeout(function () {
                        node.status({fill:"green",shape:"dot",text:"Waiting for Card"});
                    }, statustimeout);
                }
            });

            node.child.stderr.on('data', function (data) {
                if (RED.settings.verbose) { node.log("err: "+data); }
            });

            node.child.on('close', function (code) {
                node.running = false;
                node.child = null;
                if (RED.settings.verbose) { node.log(RED._("closed")); }
                if (node.done) {
                    node.status({fill:"grey",shape:"ring",text:"Closed"});
                    node.done();
                }
                else { node.status({fill:"red",shape:"ring",text:"Stopped"}); }
            });

            node.child.on('error', function (err) {
                if (err.errno === "ENOENT") { node.error(RED._("Command Not Found")); }
                else if (err.errno === "EACCES") { node.error(RED._("Command Not Executable")); }
                else { node.error(RED._("Error",{error:err.errno})) }
            });

            node.on("close", function(done) {
                node.status({fill:"grey",shape:"ring",text:"Closed"});
                if (node.child !== null) {
                    console.log("killing");
                        node.done = done;
                    node.child.stdin.write("close");
                    node.child.kill('SIGKILL');
                }
                else { done(); }
            });

        node.child.stdout.on('error', function(err) { console.log(e); });
    }
    RED.nodes.registerType("PN532",PN532);
};
