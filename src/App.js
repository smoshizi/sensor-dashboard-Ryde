import React, { useEffect, useState, useRef } from 'react';
import client from './mqttService';
import SensorPlot from './SensorPlot';
import Gauge from './Gauge';
import './App.css';

const SENSOR_KEYS = [
  // piezoA -> Sensor1:A1, Sensor2:A2, Sensor3:A3, Sensor4:A4
  'A1', 'A2', 'A3', 'A4',
  // piezoB -> Sensor1:B1, Sensor2:B2, Sensor3:B3, Sensor4:B4
  'B1', 'B2', 'B3', 'B4',
];

const makeEmptyState = () => Object.fromEntries(SENSOR_KEYS.map(k => [k, []]));

function App() {
  const [piezo, setPiezo] = useState(makeEmptyState());
  const [temp, setTemp] = useState(0);
  const [hum, setHum] = useState(0);

  const offsetRef = useRef(0);
  const offsetSamples = useRef([]);

  useEffect(() => {
    const WINDOW_MS = 20000;
    const OFFSET_SAMPLE_SIZE = 20;

    const TOPIC_MAP = {
      'iot/piezoA': ['A1', 'A2', 'A3', 'A4'],
      'iot/piezoB': ['B1', 'B2', 'B3', 'B4'],
    };

    const subscribeTopics = ['iot/piezoA', 'iot/piezoB', 'iot/tempB'];

    const handleConnect = () => {
      console.log('MQTT connected!');
      for (const t of subscribeTopics) {
        client.subscribe(t, err => {
          if (err) console.error('Subscribe error', t, err);
        });
      }
    };

    const handleMessage = (topic, message) => {
      const browserNow = Date.now();

      if (topic in TOPIC_MAP) {
        try {
          const data = JSON.parse(message.toString());

          for (let i = 0; i < 4; i++) {
            const d = data[`Sensor${i + 1}`];
            const sample = Array.isArray(d) ? d[0] : d;
            if (sample && typeof sample.ts === 'number') {
              const offsetSample = sample.ts - browserNow;
              offsetSamples.current.push(offsetSample);
              if (offsetSamples.current.length > OFFSET_SAMPLE_SIZE) {
                offsetSamples.current.shift();
              }
              const avg = offsetSamples.current.reduce((a, b) => a + b, 0) / offsetSamples.current.length;
              offsetRef.current = avg;
              break;
            }
          }

          const mapping = TOPIC_MAP[topic];
          setPiezo(prev => {
            const updated = { ...prev };
            const offset = offsetRef.current;
            const now = Date.now();

            for (let i = 0; i < mapping.length; i++) {
              const mappedKey = mapping[i];
              const raw = data[`Sensor${i + 1}`];
              const oldArr = prev[mappedKey] || [];
              const arr = Array.isArray(raw) ? raw : (raw ? [raw] : []);
              const newPoints = arr.map(obj => ({
                time: typeof obj.ts === 'number' ? (obj.ts - offset) : now,
                value: Number(obj.v) || 0
              }));
              const combined = [...oldArr, ...newPoints].filter(d => now - d.time <= WINDOW_MS);
              updated[mappedKey] = combined;
            }
            return updated;
          });
        } catch (e) {
          console.error('Error parsing piezo message for', topic, e);
        }
      } else if (topic === 'iot/tempB') {
        try {
          const data = JSON.parse(message.toString());
          setTemp(Number(data.Temperature) || 0);
          setHum(Number(data.Humidity) || 0);
        } catch (e) {
          console.error('Error parsing temp message for', topic, e);
        }
      }
    };

    client.on('connect', handleConnect);
    client.on('message', handleMessage);

    return () => {
      client.removeListener('connect', handleConnect);
      client.removeListener('message', handleMessage);
    };
  }, []);

  return (
    <div style={{ padding: 32 }}>
      <h1>IoT Sensor Dashboard</h1>

      <div className="plots-grid">
        {SENSOR_KEYS.map((key) => (
          <SensorPlot key={key} title={key} data={piezo[key] || []} />
        ))}
      </div>

      <div className="gauges-grid" role="region" aria-label="Gauges">
        <div className="gauge-card">
          <h3>Temperature</h3>
          <Gauge value={temp} label="Temperature" min={-40} max={60} hideLabel />
        </div>
        <div className="gauge-card">
          <h3>Humidity</h3>
          <Gauge value={hum} label="Humidity" min={0} max={100} hideLabel />
        </div>
      </div>
    </div>
  );
}

export default App;
