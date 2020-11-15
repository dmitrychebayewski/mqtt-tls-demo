'use strict';

const {readFileSync} = require('fs');
const jwt = require('jsonwebtoken');
const mqtt = require('mqtt');

let client = undefined; 

let publishChainInProgress = false;

console.log('Google Cloud IoT Core MQTT demo.');

const createJwt = (projectId, privateKeyFile, algorithm) => {
  // Create a JWT to authenticate this device. The device will be disconnected
  // after the token expires, and will have to reconnect with a new token. The
  // audience field should always be set to the GCP project id.
  const token = {
    iat: parseInt(Date.now() / 1000),
    exp: parseInt(Date.now() / 1000) + 20 * 60, // 20 minutes
    aud: projectId,
  };
  const privateKey = readFileSync(privateKeyFile);
  return jwt.sign(token, privateKey, {algorithm: algorithm});
};

const fetchData = () => {
  const temp = 22; //readout.temperature.toFixed(2); 
  const humd = 50; //readout.humidity.toFixed(2); 
 
  return { 
    'temp': temp, 
    'humd': humd, 
    'time': new Date().toISOString().slice(0, 19).replace('T', ' ') // https://stackoverflow.com/a/11150727/1015046 
  }; 
};

const sendData = (deviceId) => {
  const mqttTopic = `/devices/${deviceId}/state`; 
  const payload = JSON.stringify(fetchData());
  console.log(mqttTopic, ': Publishing message:', payload); 
  client.publish(mqttTopic, payload, { qos: 1 }); 
 
  console.log('Transmitting in 30 seconds'); 
  setTimeout(sendData, 30000); 
};

const mqttDemo = (
  deviceId,
  registryId,
  projectId,
  region,
  algorithm,
  privateKeyFile,
  mqttBridgeHostname,
  mqttBridgePort,
  // eslint-disable-next-line no-unused-vars
  messageType,
  // eslint-disable-next-line no-unused-vars
  numMessages
) => {
  // [START iot_mqtt_run]

  // const deviceId = `myDevice`;
  // const registryId = `myRegistry`;
  // const region = `us-central1`;
  // const algorithm = `RS256`;
  // const privateKeyFile = `./rsa_private.pem`;
  // const mqttBridgeHostname = `mqtt.googleapis.com`;
  // const mqttBridgePort = 8883;
  // const messageType = `events`;
  // const numMessages = 5;

  // The mqttClientId is a unique string that identifies this device. For Google
  // Cloud IoT Core, it must be in the format below.
  const mqttClientId = `projects/${projectId}/locations/${region}/registries/${registryId}/devices/${deviceId}`;

  // With Google Cloud IoT Core, the username field is ignored, however it must be
  // non-empty. The password field is used to transmit a JWT to authorize the
  // device. The "mqtts" protocol causes the library to connect using SSL, which
  // is required for Cloud IoT Core.
  const connectionArgs = {
    host: mqttBridgeHostname,
    port: mqttBridgePort,
    clientId: mqttClientId,
    username: 'unused',
    password: createJwt(projectId, privateKeyFile, algorithm),
    protocol: 'mqtts',
    secureProtocol: 'TLSv1_2_method',
  };

  // Create a client, and connect to the Google MQTT bridge.
  client = mqtt.connect(connectionArgs);

  // Subscribe to the /devices/{device-id}/config topic to receive config updates.
  // Config updates are recommended to use QoS 1 (at least once delivery)
  client.subscribe(`/devices/${deviceId}/config`, {qos: 1});

  // Subscribe to the /devices/{device-id}/commands/# topic to receive all
  // commands or to the /devices/{device-id}/commands/<subfolder> to just receive
  // messages published to a specific commands folder; we recommend you use
  // QoS 0 (at most once delivery)
  client.subscribe(`/devices/${deviceId}/commands/#`, {qos: 0});

  client.on('connect', success => {
    console.log('connect');
    if (!success) {
      console.log('Client not connected...');
    } else if (!publishChainInProgress) {
      sendData(deviceId);
    }
  });

  client.on('close', () => {
    console.log('close');
  });

  client.on('error', err => {
    console.log('error', err);
  });

  client.on('message', (topic, message) => {
    let messageStr = 'Message received: ';
    if (topic === `/devices/${deviceId}/config`) {
      messageStr = 'Config message received: ';
    } else if (topic.startsWith(`/devices/${deviceId}/commands`)) {
      messageStr = 'Command message received: ';
    }

    messageStr += Buffer.from(message, 'base64').toString('ascii');
    console.log(messageStr);
  });

  client.on('packetsend', () => {
    // Note: logging packet send is very verbose
  });

  // Once all of the messages have been published, the connection to Google Cloud
  // IoT will be closed and the process will exit. See the publishAsync method.
  // [END iot_mqtt_run]
};

// eslint-disable-next-line no-unused-vars
const {argv} = require('yargs')
  .options({
    projectId: {
      default: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT,
      description:
        'The Project ID to use. Defaults to the value of the GCLOUD_PROJECT or GOOGLE_CLOUD_PROJECT environment variables.',
      requiresArg: true,
      type: 'string',
    },
    cloudRegion: {
      default: 'us-central1',
      description: 'GCP cloud region.',
      requiresArg: true,
      type: 'string',
    },
    registryId: {
      description: 'Cloud IoT registry ID.',
      requiresArg: true,
      demandOption: true,
      type: 'string',
    },
    deviceId: {
      description: 'Cloud IoT device ID.',
      requiresArg: true,
      demandOption: true,
      type: 'string',
    },
    privateKeyFile: {
      description: 'Path to private key file.',
      requiresArg: true,
      demandOption: true,
      type: 'string',
    },
    algorithm: {
      description: 'Encryption algorithm to generate the JWT.',
      requiresArg: true,
      demandOption: true,
      choices: ['RS256', 'ES256'],
      type: 'string',
    },
    tokenExpMins: {
      default: 20,
      description: 'Minutes to JWT token expiration.',
      requiresArg: true,
      type: 'number',
    },
    mqttBridgeHostname: {
      default: 'mqtt.googleapis.com',
      description: 'MQTT bridge hostname.',
      requiresArg: true,
      type: 'string',
    },
    mqttBridgePort: {
      default: 8883,
      description: 'MQTT bridge port.',
      requiresArg: true,
      type: 'number',
    },
  })
  .command(
    'mqttDemo',
    'Connects a device, sends data, and receives data',
    {
      messageType: {
        default: 'events',
        description: 'Message type to publish.',
        requiresArg: true,
        choices: ['events', 'state'],
        type: 'string',
      },
      numMessages: {
        default: 10,
        description: 'Number of messages to publish.',
        demandOption: true,
        type: 'number',
      },
    },
    opts => {
      mqttDemo(
        opts.deviceId,
        opts.registryId,
        opts.projectId,
        opts.cloudRegion,
        opts.algorithm,
        opts.privateKeyFile,
        opts.mqttBridgeHostname,
        opts.mqttBridgePort,
        opts.messageType,
        opts.numMessages
      );
    }
  )
  .example(
    'node $0 mqttDemo --projectId=demo-123 \\\n\t--registryId=my-registry --deviceId=my-node-device \\\n\t--privateKeyFile=./rsa_private.pem --algorithm=RS256 \\\n\t--cloudRegion=us-central1 \\\n'
  )
  .wrap(120)
  .recommendCommands()
  .epilogue('For more information, see https://cloud.google.com/iot-core/docs')
  .help()
  .strict();