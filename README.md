# node-red-i2c-pecmac125a
NodeRED - Node to read current from a Control Everything PECMAC125A current sensor board connected via I2C.

Board is available at : https://www.controleverything.com

Install for NodeRED with NPM : npm install node-red-i2c-pecmac125a

This has been written for the Raspberry Pi 3 Model B. To enable i2c on your Raspberry Pi see the tutorial at : https://learn.sparkfun.com/tutorials/raspberry-pi-spi-and-i2c-tutorial

Once enabled, confirm the PECMAC125A board is visible with cli command : i2cdetect -y 1

The default connection port is 0x2A (42).

## Command for reading device identification data
0x6A(106), 0x02(2), 0x00(0), 0x00(0), 0x00(0), 0x00(0), 0xFE(254)
Header byte-2, command-2, byte 3, 4, 5 and 6 are reserved, checksum

## Read data back from 0x55(85), 3 bytes
Type of Sensor, Maximum Current, Number of Channels
i2c.read(0x55, 3)

## Command for reading current
0x6a(106), 0x01(1), 0x01(1), 0x0c(12), 0x00(0), 0x00(0), 0x0A(10)
Header byte-2, command-1, start channel-1, stop channel-12, byte 5 and 6 reserved, checksum
