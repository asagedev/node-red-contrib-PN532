This node reads the UID from an RFID card using a PN532 RFID Module and returns the value in `msg.payload`.

Requirements:
RPi.GPIO and spidev python libraries
```
sudo pip install RPi.GPIO
sudo pip install spidev
```