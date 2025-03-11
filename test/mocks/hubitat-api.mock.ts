import nock from 'nock';
import { testDevices, testDeviceCommands } from './test-data';

export function mockHubitatApi(baseUrl: string, appId: string, token: string) {
  // Mock for getting all devices
  const mockGetAllDevices = () => {
    return nock(baseUrl)
      .get(`/apps/api/${appId}/devices/all`)
      .query({ access_token: token })
      .reply(200, testDevices);
  };

  // Mock for getting a single device
  const mockGetDevice = (deviceId: string) => {
    const device = testDevices.find(d => d.id.toString() === deviceId);
    
    return nock(baseUrl)
      .get(`/apps/api/${appId}/devices/${deviceId}`)
      .query({ access_token: token })
      .reply(200, device || { error: 'Device not found' });
  };

  // Mock for getting device commands
  const mockGetDeviceCommands = (deviceId: string) => {
    return nock(baseUrl)
      .get(`/apps/api/${appId}/devices/${deviceId}/commands`)
      .query({ access_token: token })
      .reply(200, testDeviceCommands);
  };

  // Mock for sending a command to a device
  const mockSendCommand = (deviceId: string, command: string) => {
    return nock(baseUrl)
      .get(new RegExp(`/apps/api/${appId}/devices/${deviceId}/${command}`))
      .query(true) // Accept any query parameters
      .reply(200, { success: true, command, deviceId });
  };

  return {
    mockGetAllDevices,
    mockGetDevice,
    mockGetDeviceCommands,
    mockSendCommand,
  };
}
