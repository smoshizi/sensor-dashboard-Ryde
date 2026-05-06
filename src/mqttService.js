import mqtt from 'mqtt';

const brokerUrl = 'wss://broker.hivemq.com:8884/mqtt'; // Make sure this matches your broker

const client = mqtt.connect(brokerUrl);

export default client;