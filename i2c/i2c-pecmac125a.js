module.exports = function(RED) {
    "use strict";
    var I2C = require("i2c");

    // The Server Definition - this opens (and closes) the connection
    function I2CServerNode(n) {
        RED.nodes.createNode(this, n);
        this.device = n.device || "/dev/i2c-1";
        this.address = n.address || 0x2A;
        this.port = null;
        this.on("close", function() {
            if (this.port != null) {
                //     this.port.disconnect();
            }
        });
    }
    RED.nodes.registerType("i2c-device-pecmac125a", I2CServerNode);

	// Get Current in Amps Node
	function I2CCurrentAmpsNode(n) {
		// editing the device via this node is not saving 
		RED.nodes.createNode(this, n);
		this.i2cdevice = n.i2cdevice;
		this.serverConfig = RED.nodes.getNode(this.i2cdevice);
		this.address = n.address;
		this.command = n.command;
		this.count = n.count;
		var node = this;

		if (node.serverConfig.port === null) {
			node.log("CONNECT: " + node.serverConfig.device);
			node.serverConfig.port = new I2C(parseInt(this.serverConfig.address), {device: node.serverConfig.device});
		}
		node.port = node.serverConfig.port;

		//node.on("input", function(msg) {  
		setInterval(function(){        
            var address = node.serverConfig.port.address;
            var wire = new I2C(address, {device: '/dev/i2c-1', debug: false});
            var readConfigCommand = [0x92, 0x6A, 0x02, 0x00, 0x00, 0x00, 0x00, 0xFE];
			wire.write(readConfigCommand, function(err){
				if (err) { 
					console.log(err); 
				} else {								
					var typeOfSensor = '', maxCurrent = '', noOfChannels = '';				
					wire.readBytes(0x55, 3, function(err, res){
					//wire.read(3, function(err, res){
						// result contains a buffer of bytes
						if (err) { console.log(err); }
						typeOfSensor = res[0];
						maxCurrent = res[1];
						noOfChannels = res[2];
						//console.log("Type of Sensor: "+typeOfSensor);
						//console.log("Max Current: "+maxCurrent);
						//console.log("No of Channels: "+noOfChannels);
						if (noOfChannels > 3 || noOfChannels == 0){
							return;
						}
						
						// get the current read
						var readCurrentCommand = [0x92, 0x6A, 0x01, 0x01, 0x0C, 0x00, 0x00, 0x0A];
						//var readCurrentCommand = [0x92, 0x6A, 0x01, 0x01, noOfChannels, 0x00, 0x00, 0x0A];
						wire.write(readCurrentCommand, function(err){
							if (err) { console.log(err); }
							//# PECMAC125A address, 0x30 - updated from 0x2A
							//# Read data back from 0x55(85), No. of Channels * 3 bytes
							//# current MSB1, current MSB, current LSB
							wire.readBytes(0x55, noOfChannels * 3, function(err, res){
								if (err) { console.log(err); }
								//setTimeout(writeCurrent, 300);
								//function writeCurrent(){									
									var msb1 = 0, msb = 0, lsb = 0, current = 0;
									for (var i = 0; i < noOfChannels; i++){
										//# Convert the data	
										msb1 = res[i*3];
										msb = res[1 + i*3];
										lsb = res[2 + i*3];
										//	# Convert the data to ampere
										current = (msb1 * 65536 + msb * 256 + lsb) / 1000.0;
										//console.log("Channel no : "+(i+1)+" Current Value : "+current+" A");
										// return to the node's output
										node.send({payload: {"amps":current}});
									}
								//}
							});
						});
					});
				}
						
			});

        }, 1000);

        node.on("close", function() {
            //   node.port.free();
        });
			
	}
	RED.nodes.registerType("i2c-current-amps-pecmac125a", I2CCurrentAmpsNode);
	
	// The Stream Node -- no supporting documentation found -- going to utilize a timed loop on read
	/** function I2CStreamAmpsNode(n) {
		// editing the device via this node is not saving 
		RED.nodes.createNode(this, n);
		this.i2cdevice = n.i2cdevice;
		this.serverConfig = RED.nodes.getNode(this.i2cdevice);
		this.address = n.address;
		this.command = n.command;
		this.count = n.count;
		var node = this;

		if (node.serverConfig.port === null) {
			node.log("CONNECT: " + node.serverConfig.device);
			node.serverConfig.port = new I2C(parseInt(this.serverConfig.address), {device: node.serverConfig.device});
		}
		node.port = node.serverConfig.port;
		//var address = 0x30;
		var address = node.serverConfig.port.address;
		var wire = new I2C(address, {device: '/dev/i2c-1', debug: false});
		var readConfigCommand = [0x92, 0x6A, 0x02, 0x00, 0x00, 0x00, 0x00, 0xFE];
		var readCurrentCommand = [0x92, 0x6A, 0x01, 0x01, 0x0C, 0x00, 0x00, 0x0A];
		wire.stream(readConfigCommand, 3, 500);
		wire.on('data', function(data){
			console.log(data);
		});
	}
	RED.nodes.registerType("i2c-stream-amps-pecmac125a", I2CStreamAmpsNode);
	*/

    // The Input Node
    /** function I2CInNode(n) {
        RED.nodes.createNode(this, n);
        this.i2cdevice = n.i2cdevice;
        this.serverConfig = RED.nodes.getNode(this.i2cdevice);
        this.address = n.address;
        this.command = n.command;
        this.count = n.count;
        var node = this;
        if (node.serverConfig.port === null) {
            node.log("CONNECT: " + node.serverConfig.device);
            node.serverConfig.port = new I2C(parseInt(this.serverConfig.address), {
                device: node.serverConfig.device
            });
        }
        node.port = node.serverConfig.port;
        node.on("input", function(msg) {
            var address = node.address || msg.address || this.serverConfig.address;
            var command = node.command || msg.command;
            node.port.setAddress(parseInt(address));
            node.port.readBytes(parseInt(command), node.count, function(err, res) {
                if (err) {
                    node.error(err);
                } else {
                    var payload;
                    if (Buffer.isBuffer(res) && node.count == 1) {
                        payload = res[0];
                    } else {
                        payload = res;
                    }
                    // msg.address = address;
                    // msg.command = command;
                    // msg.payload = payload;

                    node.send({
                        address: address,
                        command: command,
                        payload: payload
                    });
                }
            });
        });

        node.on("close", function() {
            //   node.port.free();
        });
    }
    RED.nodes.registerType("i2c-in-pecmac125a", I2CInNode);
	*/

    // The Output Node
    /** function I2COutNode(n) {
        RED.nodes.createNode(this, n);
        this.i2cdevice = n.i2cdevice;
        this.serverConfig = RED.nodes.getNode(this.i2cdevice);
        this.address = parseInt(n.address);
        this.command = parseInt(n.command);
        this.count = parseInt(n.count);
        this.payload = n.payload;
        var node = this;
 
        if (node.serverConfig.port === null) {
            node.log("CONNECT: " + node.serverConfig.device);
   
            node.serverConfig.port = new I2C(parseInt(this.serverConfig.address), {
                device: node.serverConfig.device
            });
        }

        node.port = node.serverConfig.port;

        node.on("input", function(msg) {
            msg.address = node.address || msg.address || this.serverConfig.address;
            msg.command = node.command || msg.command;

            node.port.setAddress(msg.address);
            var payload = node.payload || msg.payload;
            if (payload == null || node.count == 0) {
				node.port.writeByte(parseInt(node.command),  function(err) {
                    if (err) node.error(err);
                });
			} else if (!isNaN(payload)) {
				var data = payload;

				payload = Buffer.allocUnsafe(node.count);
				payload.writeIntLE(data, 0, node.count, true);
				
			} else if (String.isString(payload) || Array.isArray(payload)) {
				payload = Buffer.from(payload);
			}
            if (payload.count > 32) {
                node.error("To many elements in array to write to I2C");
            } else {
                node.port.writeBytes(parseInt(node.command), payload, function(err) {
                    if (err) node.error(err);
                });
            }
        });

        node.on("close", function() {
            //     node.port.free();
        });
    }
    RED.nodes.registerType("i2c-out-pecmac125a", I2COutNode);
	*/

    // The Scan Node
    /**function I2CScanNode(n) {
        RED.nodes.createNode(this, n);
        this.i2cdevice = n.i2cdevice;
        this.serverConfig = RED.nodes.getNode(this.i2cdevice);
        var node = this;
        if (node.serverConfig.port === null) {
            node.log("CONNECT: " + node.serverConfig.device);

            node.serverConfig.port = new I2C(parseInt(this.serverConfig.address), {
                device: node.serverConfig.device
            });

        }
        node.port = node.serverConfig.port;
        node.on("input", function(msg) {
            node.port.scan(function(err, res) {
                // result contains a buffer of bytes
                if (err) {
                    node.error(errI);
                } else {
                    node.send([{
                        payload: res
                    }, null]);
                    res.forEach(function(entry) {
                        node.send([null, {
                            payload: entry,
                            address: entry
                        }]);
                    });

                }
            });
        });

        node.on("close", function() {
            //   node.port.free();
        });
    }
    RED.nodes.registerType("i2c-scan", I2CScanNode);
    */
}
