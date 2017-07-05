module.exports = function(RED) {
    "use strict";
    var I2C = require("i2c");

    // The Server Definition - this opens (and closes) the connection
    function I2CServerNode(n) {
        RED.nodes.createNode(this, n);
        this.device = n.device || "/dev/i2c-1";
        this.address = n.address || 0x2A;
        this.frequency = parseInt(n.frequency) || 500;
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

		setInterval(function(){        
            var address = node.serverConfig.port.address;
            var readConfigCommand = [0x92, 0x6A, 0x02, 0x00, 0x00, 0x00, 0x00, 0xFE];
			node.serverConfig.port.write(readConfigCommand, function(err){
				if (err) { 
					console.log(err); 
					return
				} else {								
					var typeOfSensor = '', maxCurrent = '', noOfChannels = '';				
					node.serverConfig.port.readBytes(0x55, 3, function(err, res){
						if (err) { console.log(err); }
						typeOfSensor = res[0];
						maxCurrent = res[1];
						noOfChannels = res[2];

						if (noOfChannels > 3 || noOfChannels == 0){
							return;
						}
						
						// get the current read
						var readCurrentCommand = [0x92, 0x6A, 0x01, 0x01, 0x0C, 0x00, 0x00, 0x0A];
						//var readCurrentCommand = [0x92, 0x6A, 0x01, 0x01, noOfChannels, 0x00, 0x00, 0x0A];
						node.serverConfig.port.write(readCurrentCommand, function(err){
							if (err) { console.log(err); }
							//# PECMAC125A address, 0x30 - updated from 0x2A
							//# Read data back from 0x55(85), No. of Channels * 3 bytes
							//# current MSB1, current MSB, current LSB
							node.serverConfig.port.readBytes(0x55, noOfChannels * 3, function(err, res){
								if (err) { console.log(err); }					
								var msb1 = 0, msb = 0, lsb = 0, current = 0;
								for (var i = 0; i < noOfChannels; i++){
									//# Convert the data	
									msb1 = res[i*3];
									msb = res[1 + i*3];
									lsb = res[2 + i*3];
									//	# Convert the data to ampere
									current = (msb1 * 65536 + msb * 256 + lsb) / 1000.0;
									// return to the node's output
									node.send({payload: {"amps":current}});
								}
							});
						});
					});
				}
						
			});

        }, parseInt(node.serverConfig.frequency));

        node.on("close", function() {
            //   node.port.free();
        });
			
	}
	RED.nodes.registerType("i2c-current-amps-pecmac125a", I2CCurrentAmpsNode);
	
}
