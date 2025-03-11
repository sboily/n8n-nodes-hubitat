import { mockDeep } from 'jest-mock-extended';
import { 
  IWebhookFunctions, 
  IHookFunctions,
  IDataObject,
  INodeExecutionData 
} from 'n8n-workflow';
import { HubitatTrigger } from '../../../src/nodes/Hubitat/HubitatTrigger.node';
import { testWebhookEvents } from '../../mocks/test-data';

// Création d'un type d'utilitaire pour les mocks
type DeepMockProxy<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? jest.Mock<R, A>
    : DeepMockProxy<T[K]>;
};

describe('HubitatTrigger', () => {
  let hubitatTriggerNode: HubitatTrigger;
  let mockWebhook: DeepMockProxy<IWebhookFunctions>;
  let mockHook: DeepMockProxy<IHookFunctions>;
  
  beforeEach(() => {
    hubitatTriggerNode = new HubitatTrigger();
    mockWebhook = mockDeep<IWebhookFunctions>() as DeepMockProxy<IWebhookFunctions>;
    mockHook = mockDeep<IHookFunctions>() as DeepMockProxy<IHookFunctions>;

    // Setup des mocks communs
    mockWebhook.getNodeParameter.mockImplementation((name: string) => {
      if (name === 'eventType') return 'allEvents';
      if (name === 'filterByDevice') return false;
      return undefined;
    });

    mockWebhook.helpers.returnJsonArray.mockImplementation((items: IDataObject[]) => {
      return items.map(item => ({ json: item })) as INodeExecutionData[];
    });
  });
  
  afterEach(() => {
    jest.resetAllMocks();
  });
  
  describe('webhook()', () => {
    it('should process device events when event type is deviceEvent', async () => {
      // Setup - Device event
      const mockRequest = {
        body: testWebhookEvents.deviceEvent
      } as any;
      
      mockWebhook.getRequestObject.mockReturnValue(mockRequest);
      mockWebhook.getNodeParameter.mockImplementation((name: string) => {
        if (name === 'eventType') return 'deviceEvent';
        if (name === 'filterByDevice') return false;
        return undefined;
      });
      
      // Execute
      const result = await hubitatTriggerNode.webhook.call(mockWebhook as any);
      
      // Assert
      expect(result.webhookResponse).toEqual({ status: 'success' });
      expect(result.workflowData).toBeDefined();
      expect(result.workflowData?.[0][0].json).toMatchObject({
        ...testWebhookEvents.deviceEvent,
        webhookTime: expect.any(String)
      });
    });
    
    it('should process mode events when event type is modeEvent', async () => {
      // Setup - Mode event
      const mockRequest = {
        body: testWebhookEvents.modeEvent
      } as any;
      
      mockWebhook.getRequestObject.mockReturnValue(mockRequest);
      mockWebhook.getNodeParameter.mockImplementation((name: string) => {
        if (name === 'eventType') return 'modeEvent';
        return undefined;
      });
      
      // Execute
      const result = await hubitatTriggerNode.webhook.call(mockWebhook as any);
      
      // Assert
      expect(result.webhookResponse).toEqual({ status: 'success' });
      expect(result.workflowData).toBeDefined();
      expect(result.workflowData?.[0][0].json).toMatchObject({
        ...testWebhookEvents.modeEvent,
        webhookTime: expect.any(String)
      });
    });
    
    it('should filter events based on device ID', async () => {
      // Setup - Device event with different device ID
      const event = { 
        ...testWebhookEvents.deviceEvent,
        deviceId: 999 // Different ID than our test data
      };
      
      const mockRequest = {
        body: event
      } as any;
      
      mockWebhook.getRequestObject.mockReturnValue(mockRequest);
      mockWebhook.getNodeParameter.mockImplementation((name: string) => {
        if (name === 'eventType') return 'deviceEvent';
        if (name === 'filterByDevice') return true;
        if (name === 'deviceIds') return ['1', '2']; // Not including 999
        return undefined;
      });
      
      // Execute
      const result = await hubitatTriggerNode.webhook.call(mockWebhook as any);
      
      // Assert - Should be skipped due to device ID filter
      expect(result.webhookResponse).toEqual({ status: 'skipped' });
    });
    
    it('should handle invalid data format', async () => {
      // Setup - Invalid data
      const mockRequest = {
        body: null
      } as any;
      
      mockWebhook.getRequestObject.mockReturnValue(mockRequest);
      
      // Execute
      const result = await hubitatTriggerNode.webhook.call(mockWebhook as any);
      
      // Assert
      expect(result.webhookResponse).toEqual({ 
        status: 'error',
        message: 'Invalid webhook data received'
      });
    });
  });
  
  describe('webhookMethods', () => {
    it('checkExists should return true', async () => {
      const result = await hubitatTriggerNode.webhookMethods.default.checkExists.call(mockHook as any);
      expect(result).toBe(true);
    });
    
    it('create should return true', async () => {
      const result = await hubitatTriggerNode.webhookMethods.default.create.call(mockHook as any);
      expect(result).toBe(true);
    });
    
    it('delete should return true', async () => {
      const result = await hubitatTriggerNode.webhookMethods.default.delete.call(mockHook as any);
      expect(result).toBe(true);
    });
  });
});
