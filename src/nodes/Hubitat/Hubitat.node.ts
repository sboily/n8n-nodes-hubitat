import {
  IExecuteFunctions,
  ILoadOptionsFunctions,
  INodeExecutionData,
  INodePropertyOptions,
  INodeType,
  INodeTypeDescription,
  NodeConnectionType,
} from 'n8n-workflow';
import axios from 'axios';

export class Hubitat implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Hubitat',
    name: 'hubitat',
    icon: 'file:hubitat.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Interact with Hubitat devices',
    defaults: {
      name: 'Hubitat',
      color: '#39ac8d',
    },
    usableAsTool: true,
    inputs: [
      {
        type: NodeConnectionType.Main,
        displayName: 'Input',
      },
    ],
    outputs: [
      {
        type: NodeConnectionType.Main,
        displayName: 'Output',
      },
    ],
    credentials: [
      {
        name: 'hubitatApi',
        required: true,
      },
    ],
    properties: [
      // Global AI Mode Option - Placed at the very top
      {
        displayName: 'AI Tool Mode',
        name: 'aiToolMode',
        type: 'boolean',
        default: false,
        description: 'Enable this when used as a tool by AI agents. Allows direct input of parameters without selection lists.',
        noDataExpression: true,
      },
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Device',
            value: 'device',
          },
        ],
        default: 'device',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: [
              'device',
            ],
          },
        },
        options: [
          {
            name: 'Get All',
            value: 'getAll',
            description: 'Get all devices',
            action: 'Get all devices',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get a device',
            action: 'Get a device',
          },
          {
            name: 'Get Attribute',
            value: 'getAttribute',
            description: 'Get a specific device attribute',
            action: 'Get a device attribute',
          },
          {
            name: 'Send Command',
            value: 'sendCommand',
            description: 'Send command to a device',
            action: 'Send command to a device',
          },
        ],
        default: 'getAll',
      },
      
      // Device ID selection with dropdown (for normal mode)
      {
        displayName: 'Device',
        name: 'deviceId',
        type: 'options',
        typeOptions: {
          loadOptionsMethod: 'loadDeviceOptions'
        },
        displayOptions: {
          show: {
            resource: [
              'device',
            ],
            operation: [
              'get',
              'sendCommand',
              'getAttribute',
            ],
            aiToolMode: [
              false,
            ],
          },
        },
        default: "",
        required: true,
        description: 'Select a device',
      },
      
      // Device ID with text input (for AI mode)
      {
        displayName: 'Device ID',
        name: 'deviceId',
        type: 'string',
        displayOptions: {
          show: {
            resource: [
              'device',
            ],
            operation: [
              'get',
              'sendCommand',
              'getAttribute',
            ],
            aiToolMode: [
              true,
            ],
          },
        },
        default: "",
        required: true,
        description: 'ID of the device. Can be found using the Get All Devices operation.',
        hint: 'Can be provided directly or via AI agent input',
      },
      
      // Attribute selection with dropdown (for normal mode)
      {
        displayName: 'Attribute',
        name: 'attribute',
        type: 'options',
        typeOptions: {
          loadOptionsMethod: 'loadAttributeOptions',
          loadOptionsDependsOn: ['deviceId'],
        },
        required: true,
        default: "",
        displayOptions: {
          show: {
            resource: [
              'device',
            ],
            operation: [
              'getAttribute',
            ],
            aiToolMode: [
              false,
            ],
          },
        },
        description: 'The attribute to retrieve from the device',
      },
      
      // Attribute with text input (for AI mode)
      {
        displayName: 'Attribute',
        name: 'attribute',
        type: 'string',
        required: true,
        default: "",
        displayOptions: {
          show: {
            resource: [
              'device',
            ],
            operation: [
              'getAttribute',
            ],
            aiToolMode: [
              true,
            ],
          },
        },
        description: 'Name of the attribute to retrieve (e.g. switch, level, motion, temperature)',
      },
      
      // Command selection with dropdown (for normal mode)
      {
        displayName: 'Command',
        name: 'command',
        type: 'options',
        typeOptions: {
          loadOptionsMethod: 'loadCommandOptions',
          loadOptionsDependsOn: ['deviceId']
        },
        required: true,
        default: "",
        displayOptions: {
          show: {
            resource: [
              'device',
            ],
            operation: [
              'sendCommand',
            ],
            aiToolMode: [
              false,
            ],
          },
        },
        description: 'Select a command to send to the device',
      },
      
      // Command with text input (for AI mode)
      {
        displayName: 'Command',
        name: 'command',
        type: 'string',
        required: true,
        default: "",
        displayOptions: {
          show: {
            resource: [
              'device',
            ],
            operation: [
              'sendCommand',
            ],
            aiToolMode: [
              true,
            ],
          },
        },
        description: 'Name of the command to send (e.g. on, off, setLevel, setColor)',
      },
      
      // Arguments field (for both modes)
      {
        displayName: 'Arguments',
        name: 'arguments',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            resource: [
              'device',
            ],
            operation: [
              'sendCommand',
            ],
          },
        },
        description: 'Command arguments separated by commas (e.g. level=100,color=green)',
      },
    ],
  };

  methods = {
    loadOptions: {
      // Load device options
      async loadDeviceOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        // Get credentials
        const credentials = await this.getCredentials('hubitatApi');
        const authToken = credentials.accessToken as string;
        const baseUrl = credentials.hubitatHost as string;
        const appId = credentials.appId as string;
        const query = this.getCurrentNodeParameter('query') as string | undefined;
        
        try {
          const url = `${baseUrl}/apps/api/${appId}/devices/all?access_token=${authToken}`;
          const response = await axios.get(url, { headers: { Accept: 'application/json' } });
          const data = response.data;
          
          let devices = data;
          
          if (query) {
            const lowerCaseQuery = query.toLowerCase();
            devices = devices.filter((device: any) => 
              device.name.toLowerCase().includes(lowerCaseQuery) || 
              (device.label && device.label.toLowerCase().includes(lowerCaseQuery))
            );
          }
          
          return devices.map((device: any) => ({
            name: device.label || device.name,
            value: device.id.toString(),
            description: `Type: ${device.type}`,
          }));
        } catch (error) {
          console.error('Error retrieving devices from Hubitat:', error);
          throw new Error(`Unable to load devices: ${error instanceof Error ? error.message : String(error)}`);
        }
      },

      // Load attribute options for a specific device
      async loadAttributeOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const credentials = await this.getCredentials('hubitatApi');
        const authToken = credentials.accessToken as string;
        const baseUrl = credentials.hubitatHost as string;
        const appId = credentials.appId as string;
        
        // Get the currently selected device ID
        const deviceId = this.getCurrentNodeParameter('deviceId') as string;
        
        if (!deviceId) {
          return [{ name: 'Please select a device first', value: '' }];
        }
        
        try {
          // Get device information which includes attributes
          const url = `${baseUrl}/apps/api/${appId}/devices/${deviceId}?access_token=${authToken}`;
          const response = await axios.get(url, { headers: { Accept: 'application/json' } });
          const data = response.data;
          
          if (!data || !data.attributes) {
            throw new Error('Device attributes not found in the response');
          }
          
          return data.attributes.map((attribute: any) => ({
            name: attribute.name,
            value: attribute.name,
            description: `Current value: ${attribute.currentValue}${attribute.dataType ? ` (${attribute.dataType})` : ''}`,
          }));
        } catch (error) {
          console.error('Error retrieving attributes from Hubitat:', error);
          throw new Error(`Unable to load attributes: ${error instanceof Error ? error.message : String(error)}`);
        }
      },

      // Load command options for a specific device
      async loadCommandOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const credentials = await this.getCredentials('hubitatApi');
        const authToken = credentials.accessToken as string;
        const baseUrl = credentials.hubitatHost as string;
        const appId = credentials.appId as string;
        
        // Get the currently selected device ID
        const deviceId = this.getCurrentNodeParameter('deviceId') as string;
        
        if (!deviceId) {
          return [{ name: 'Please select a device first', value: '' }];
        }
        
        try {
          // Get device commands
          const url = `${baseUrl}/apps/api/${appId}/devices/${deviceId}/commands?access_token=${authToken}`;
          const response = await axios.get(url, { headers: { Accept: 'application/json' } });
          const data = response.data;
          
          if (!Array.isArray(data)) {
            throw new Error('Invalid response format from Hubitat API');
          }
          
          return data.map((command: any) => ({
            name: command.command,
            value: command.command,
            description: command.parameters && command.parameters.length > 0 
              ? `Parameters: ${command.parameters.join(', ')}` 
              : 'No parameters'
          }));
        } catch (error) {
          console.error('Error retrieving commands from Hubitat:', error);
          throw new Error(`Unable to load commands: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    
    const credentials = await this.getCredentials('hubitatApi');
    const baseUrl = credentials.hubitatHost as string;
    const appId = credentials.appId as string;
    const token = credentials.accessToken as string;
    
    const makerApiUrl = `${baseUrl}/apps/api/${appId}`;
    
    for (let i = 0; i < items.length; i++) {
      const resource = this.getNodeParameter('resource', i) as string;
      const operation = this.getNodeParameter('operation', i) as string;
      
      try {
        if (resource === 'device') {
          if (operation === 'getAll') {
            // Get all devices
            const response = await axios.get(`${makerApiUrl}/devices/all?access_token=${token}`);
            returnData.push({
              json: response.data,
              pairedItem: {
                item: i,
              },
            });
          } else if (operation === 'get') {
            // Get a single device
            const deviceId = this.getNodeParameter('deviceId', i) as string;
            const response = await axios.get(`${makerApiUrl}/devices/${deviceId}?access_token=${token}`);
            returnData.push({
              json: response.data,
              pairedItem: {
                item: i,
              },
            });
          } else if (operation === 'getAttribute') {
            // Get a specific attribute from a device
            const deviceId = this.getNodeParameter('deviceId', i) as string;
            const attribute = this.getNodeParameter('attribute', i) as string;
            
            const url = `${makerApiUrl}/devices/${deviceId}/attribute/${attribute}?access_token=${token}`;
            const response = await axios.get(url);
            
            returnData.push({
              json: response.data,
              pairedItem: {
                item: i,
              },
            });
          } else if (operation === 'sendCommand') {
            // Send a command to a device
            const deviceId = this.getNodeParameter('deviceId', i) as string;
            const command = this.getNodeParameter('command', i) as string;
            const argString = this.getNodeParameter('arguments', i) as string;
            
            let url = `${makerApiUrl}/devices/${deviceId}/${command}?access_token=${token}`;
            
            // Add arguments if provided
            if (argString) {
              const args = argString.split(',').map(arg => arg.trim());
              args.forEach(arg => {
                url += `&${arg}`;
              });
            }
            
            const response = await axios.get(url);
            returnData.push({
              json: response.data,
              pairedItem: {
                item: i,
              },
            });
          }
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: error.message,
            },
            pairedItem: {
              item: i,
            },
          });
          continue;
        }
        throw error;
      }
    }
    
    return [returnData];
  }
}
