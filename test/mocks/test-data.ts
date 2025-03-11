// Sample devices for testing
export const testDevices = [
  {
    id: 1,
    name: 'Living Room Light',
    label: 'Living Room Light',
    type: 'Switch',
    capabilities: ['Switch', 'SwitchLevel'],
    attributes: [
      { name: 'switch', currentValue: 'on', dataType: 'ENUM' },
      { name: 'level', currentValue: 75, dataType: 'NUMBER' }
    ]
  },
  {
    id: 2,
    name: 'Motion Sensor',
    label: 'Front Door Motion',
    type: 'MotionSensor',
    capabilities: ['MotionSensor', 'Battery'],
    attributes: [
      { name: 'motion', currentValue: 'inactive', dataType: 'ENUM' },
      { name: 'battery', currentValue: 88, dataType: 'NUMBER' }
    ]
  },
  {
    id: 3,
    name: 'Thermostat',
    label: 'HVAC System',
    type: 'Thermostat',
    capabilities: ['Thermostat', 'ThermostatSetpoint'],
    attributes: [
      { name: 'temperature', currentValue: 72, dataType: 'NUMBER' },
      { name: 'thermostatMode', currentValue: 'auto', dataType: 'ENUM' },
      { name: 'thermostatSetpoint', currentValue: 70, dataType: 'NUMBER' }
    ]
  }
];

// Sample commands for testing
export const testDeviceCommands = [
  { command: 'on' },
  { command: 'off' },
  { command: 'setLevel' },
  { command: 'refresh' }
];

// Sample webhook events for testing
export const testWebhookEvents = {
  deviceEvent: {
    source: 'DEVICE',
    deviceId: 1,
    name: 'switch',
    value: 'on',
    displayName: 'Living Room Light',
    unit: null,
    timestamp: Date.now()
  },
  modeEvent: {
    source: 'MODE',
    name: 'mode',
    value: 'Home',
    displayName: 'Mode',
    descriptionText: 'Mode changed to Home',
    timestamp: Date.now()
  },
  locationEvent: {
    source: 'LOCATION',
    name: 'sunrise',
    value: 'true',
    displayName: 'Sunrise',
    descriptionText: 'Sunrise has occurred',
    timestamp: Date.now()
  }
};

// Mock credentials for testing
export const mockCredentials = {
  hubitatHost: 'http://192.168.1.100',
  appId: '12345',
  accessToken: 'abcdef123456'
};
