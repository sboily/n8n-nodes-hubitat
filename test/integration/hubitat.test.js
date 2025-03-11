import { IExecuteFunctions } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';
import { Hubitat } from '../../src/nodes/Hubitat/Hubitat.node';
import { HubitatTrigger } from '../../src/nodes/Hubitat/HubitatTrigger.node';
import nock from 'nock';
import { mockCredentials, testDevices, testWebhookEvents } from '../mocks/test-data';
import { mockHubitatApi } from '../mocks/hubitat-api.mock';

// This is an integration test to ensure the Hubitat nodes work together correctly
describe('Hubitat Integration', () => {
  let hubitat: Hubitat;
  let hubitatTrigger: HubitatTrigger;
  
  beforeAll(() => {
    // Disable actual HTTP requests
    nock.disableNetConnect();
  });
  
  it('should handle API errors gracefully', async () => {
    // Mock execute functions
    const mockExecuteFunctions = mockDeep<IExecuteFunctions>();
    mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
    mockExecuteFunctions.getInputData.mockReturnValue([{}]);
    mockExecuteFunctions.getNodeParameter.mockImplementation((parameterName, itemIndex) => {
      if (parameterName === 'resource') return 'device';
      if (parameterName === 'operation') return 'getAll';
      return undefined;
    });
    mockExecuteFunctions.continueOnFail.mockReturnValue(true);
    
    // Mock a failed API request
    nock(mockCredentials.hubitatHost)
      .get(`/apps/api/${mockCredentials.appId}/devices/all`)
      .query({ access_token: mockCredentials.accessToken })
      .reply(500, { error: 'Internal server error' });
    
    // Execute the node
    const result = await hubitat.execute.call(mockExecuteFunctions);
    
    // Assert error handling
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(1);
    expect(result[0][0].json.error).toBeDefined();
    
    // Mock a network failure
    nock.cleanAll();
    nock(mockCredentials.hubitatHost)
      .get(`/apps/api/${mockCredentials.appId}/devices/all`)
      .query({ access_token: mockCredentials.accessToken })
      .replyWithError('Network error');
    
    // Execute the node again
    const result2 = await hubitat.execute.call(mockExecuteFunctions);
    
    // Assert error handling for network errors
    expect(result2).toHaveLength(1);
    expect(result2[0]).toHaveLength(1);
    expect(result2[0][0].json.error).toBeDefined();
  });
});
  
  it('should handle webhook filtering by device IDs correctly', async () => {
    // Mock trigger functions
    const mockTriggerFunctions = mockDeep<IExecuteFunctions>();
    
    // Create a device event
    const filteredDeviceEvent = {
      ...testWebhookEvents.deviceEvent,
      deviceId: 2 // Using a different device ID for testing filtering
    };
    
    mockTriggerFunctions.getRequestObject.mockReturnValue({
      body: filteredDeviceEvent
    });
    
    // Setup for filtering specific devices
    mockTriggerFunctions.getNodeParameter.mockImplementation((parameterName) => {
      if (parameterName === 'eventType') return 'deviceEvent';
      if (parameterName === 'filterByDevice') return true;
      if (parameterName === 'deviceIds') return ['1', '3']; // Not including device ID 2
      return undefined;
    });
    
    // Execute the trigger
    const triggerResult = await hubitatTrigger.webhook.call(mockTriggerFunctions as any);
    
    // Should be skipped due to device filter
    expect(triggerResult.webhookResponse).toEqual({ status: 'skipped' });
    expect(triggerResult.workflowData).toBeUndefined();
    
    // Now test with a matching device ID
    mockTriggerFunctions.getNodeParameter.mockImplementation((parameterName) => {
      if (parameterName === 'eventType') return 'deviceEvent';
      if (parameterName === 'filterByDevice') return true;
      if (parameterName === 'deviceIds') return ['1', '2', '3']; // Including device ID 2
      return undefined;
    });
    
    // Execute the trigger again
    const secondTriggerResult = await hubitatTrigger.webhook.call(mockTriggerFunctions as any);
    
    // Should be processed this time
    expect(secondTriggerResult.webhookResponse).toEqual({ status: 'success' });
    expect(secondTriggerResult.workflowData).toBeDefined();
    expect(secondTriggerResult.workflowData?.[0][0]).toMatchObject({
      ...filteredDeviceEvent,
      webhookTime: expect.any(String)
    });
  });
  
  it('should load device options from API correctly', async () => {
    // Setup mocks for loadOptions function
    const { mockGetAllDevices } = mockHubitatApi(
      mockCredentials.hubitatHost,
      mockCredentials.appId,
      mockCredentials.accessToken
    );
    
    // Mock API response
    mockGetAllDevices();
    
    // Create a mock implementation for loadOptions
    const mockLoadOptions = mockDeep<any>();
    mockLoadOptions.getCredentials.mockResolvedValue(mockCredentials);
    
    // Call the loadOptions method
    const options = await hubitatTrigger.methods.loadOptions.getDevices.call(mockLoadOptions);
    
    // Verify the options were loaded correctly
    expect(options).toHaveLength(testDevices.length);
    expect(options[0].value).toBe(testDevices[0].id.toString());
    expect(options[0].name).toBe(testDevices[0].label || testDevices[0].name);
    
    // Verify the API was called
    expect(nock.isDone()).toBe(true);
  });
  
  afterAll(() => {
    nock.enableNetConnect();
  });
  
  beforeEach(() => {
    hubitat = new Hubitat();
    hubitatTrigger = new HubitatTrigger();
    
    // Clean up any previous mocks
    nock.cleanAll();
  });
  
  afterEach(() => {
    jest.resetAllMocks();
  });
  
  it('should work with an end-to-end scenario', async () => {
    // 1. Setup mocks for a complete scenario:
    // - Trigger receives a device event
    // - Node gets device details
    // - Node sends a command back to the device
    
    // Mock the webhook trigger function
    const mockTriggerFunctions = mockDeep<IExecuteFunctions>();
    mockTriggerFunctions.getRequestObject.mockReturnValue({
      body: testWebhookEvents.deviceEvent
    });
    mockTriggerFunctions.getNodeParameter.mockImplementation((parameterName) => {
      if (parameterName === 'eventType') return 'deviceEvent';
      if (parameterName === 'filterByDevice') return false;
      return undefined;
    });
    mockTriggerFunctions.helpers.returnJsonArray.mockImplementation((items) => items);
    
    // Mock the node execute function
    const mockExecuteFunctions = mockDeep<IExecuteFunctions>();
    mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
    mockExecuteFunctions.getInputData.mockReturnValue([{ json: testWebhookEvents.deviceEvent }]);
    mockExecuteFunctions.getNodeParameter.mockImplementation((parameterName, itemIndex) => {
      if (parameterName === 'resource') return 'device';
      if (parameterName === 'operation') return 'sendCommand';
      if (parameterName === 'deviceId') return testWebhookEvents.deviceEvent.deviceId.toString();
      if (parameterName === 'command') return 'off'; // Toggle the device off
      if (parameterName === 'arguments') return '';
      return undefined;
    });
    mockExecuteFunctions.helpers.returnJsonArray.mockImplementation((items) => items);
    
    // 2. Setup API mocks
    const { mockGetDevice, mockSendCommand } = mockHubitatApi(
      mockCredentials.hubitatHost,
      mockCredentials.appId,
      mockCredentials.accessToken
    );
    
    // Mock the API calls that would happen in this workflow
    mockGetDevice(testWebhookEvents.deviceEvent.deviceId.toString());
    mockSendCommand(testWebhookEvents.deviceEvent.deviceId.toString(), 'off');
    
    // 3. Execute the trigger
    const triggerResult = await hubitatTrigger.webhook.call(mockTriggerFunctions as any);
    
    // 4. Assert trigger results
    expect(triggerResult.webhookResponse).toEqual({ status: 'success' });
    expect(triggerResult.workflowData).toBeDefined();
    expect(triggerResult.workflowData?.[0][0]).toMatchObject({
      ...testWebhookEvents.deviceEvent,
      webhookTime: expect.any(String)
    });
    
    // 5. Execute the node with the trigger output
    const nodeResult = await hubitat.execute.call(mockExecuteFunctions);
    
    // 6. Assert node results
    expect(nodeResult).toHaveLength(1);
    expect(nodeResult[0]).toHaveLength(1);
    expect(nodeResult[0][0].json).toEqual({ 
      success: true, 
      command: 'off', 
      deviceId: testWebhookEvents.deviceEvent.deviceId.toString() 
    });
    
    // 7. Verify all API mocks were called
    expect(nock.isDone()).toBe(true);
  });
