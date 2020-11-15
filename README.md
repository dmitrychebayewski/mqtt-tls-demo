# mqtt-tls-demo
## Purpose
Demonstrate how to connect the client to Google Cloud IoT and transmit sample data to IoT device.

## Software Stack
This project uses Node.js

## IDE 
This project has been created in Microsoft Visual Studio Code, but it will go in WebStorm as well.

## Work with Project

* Create IoT Registry, IoT device, pub/sub topics as described in the [Cloud IoT Core Quickstart](https://cloud.google.com/iot/docs/quickstart)
* Copy generated rsa_private.pem file to project folder
* Run npm install

Then, if your cloud region is europe-west1, your project ID, registry Id and device Id are my_project, my_registry, my_device respectively, your service account credentials are stored in your home folder in creds.json and you have generated your credentials as described in QuickStart, you can run the following example:

```
$node mqtt_demo.js mqttDemo --projectId=my_project --cloudRegion=europe-west1 --registryId=my_registry --deviceId=my_device --privateKeyFile=rsa_private.pem --algorithm=RS256
```

## Seeing the Expected Results
If you see this output on the screen:

```
Google Cloud IoT Core MQTT demo.
connect
/devices/mqtt-dev/state : Publishing message: {"temp":22,"humd":50,"time":"2020-11-15 21:36:07"}
Transmitting in 30 seconds
Config message received: 
```
you have successfully testsd just created device!


