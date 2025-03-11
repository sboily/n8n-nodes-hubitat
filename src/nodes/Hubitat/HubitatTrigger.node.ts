import {
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	IHookFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	NodeConnectionType,
} from 'n8n-workflow';
import axios from 'axios';

export class HubitatTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hubitat Trigger',
		name: 'hubitatTrigger',
		icon: 'file:hubitat.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["eventType"]}}',
		description: 'Handle incoming Hubitat events',
		defaults: {
			name: 'Hubitat Trigger',
			color: '#39ac8d',
		},
		inputs: [],
		outputs: [
			{
				type: NodeConnectionType.Main,
				displayName: 'Output',
			},
		],
		credentials: [
			{
				name: 'hubitatApi',
				required: false,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Event Type',
				name: 'eventType',
				type: 'options',
				options: [
					{
						name: 'All Events',
						value: 'allEvents',
						description: 'Trigger on any event from Hubitat',
					},
					{
						name: 'Device Event',
						value: 'deviceEvent',
						description: 'Trigger on device events',
					},
					{
						name: 'Mode Event',
						value: 'modeEvent',
						description: 'Trigger on mode changes',
					},
					{
						name: 'Location Event',
						value: 'locationEvent',
						description: 'Trigger on location events',
					},
					{
						name: 'Custom',
						value: 'custom',
						description: 'Trigger on a custom event type',
					},
				],
				default: 'allEvents',
				required: true,
			},
			{
				displayName: 'Custom Event Type',
				name: 'customEventType',
				type: 'string',
				displayOptions: {
					show: {
						eventType: [
							'custom',
						],
					},
				},
				default: '',
				description: 'The custom event type to listen for',
				placeholder: 'e.g., custom event type',
				required: true,
			},
			{
				displayName: 'Filter by Device',
				name: 'filterByDevice',
				type: 'boolean',
				default: false,
				description: 'Filter events by specific Hubitat devices',
				displayOptions: {
					show: {
						eventType: [
							'deviceEvent',
							'allEvents',
						],
					},
				},
			},
			{
				displayName: 'Devices',
				name: 'deviceIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getDevices',
				},
				default: [],
				description: 'Select the devices to filter events by',
				displayOptions: {
					show: {
						eventType: [
							'deviceEvent',
							'allEvents',
						],
						filterByDevice: [
							true,
						],
					},
				},
			},
			{
				displayName: 'Webhook Setup Instructions',
				name: 'webhookInstructions',
				type: 'options',
				default: 'instructions',
				options: [
					{
						name: 'Copy the webhook URL below and configure it in Hubitat',
						value: 'instructions',
						description: '<strong>How to set up the Hubitat webhook:</strong><br><br>1. In your Hubitat hub, go to "Apps" > "Add User App" > "Maker API"<br>2. Configure the Maker API app and select the devices you want to subscribe to<br>3. In the Maker API settings, add a new "URL to send device events to:" with the following URL:<br><code>{{$node["Hubitat Trigger"].webhookUrl}}</code><br>4. Save the configuration<br><br>The node will now trigger your workflow when events occur on your Hubitat hub.'
					},
				],
				noDataExpression: true,
			},
		],
	};

	methods = {
		loadOptions: {
			/**
			 * Load all devices from Hubitat hub for selection in the UI
			 */
			async getDevices(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					const credentials = await this.getCredentials('hubitatApi');
					
					if (!credentials) {
						throw new Error('Please provide credentials for Hubitat API');
					}
					
					const baseUrl = credentials.hubitatHost as string;
					const appId = credentials.appId as string;
					const token = credentials.accessToken as string;
					
					const makerApiUrl = `${baseUrl}/apps/api/${appId}`;
					
					const response = await axios.get(`${makerApiUrl}/devices/all?access_token=${token}`);
					
					const devices = response.data;
					
					if (!Array.isArray(devices)) {
						throw new Error('Invalid response from Hubitat API');
					}
					
					const options: INodePropertyOptions[] = devices.map((device: { id: number, label: string, name: string }) => ({
						name: device.label || device.name || `Device ${device.id}`,
						value: device.id.toString(),
						description: `ID: ${device.id}`,
					}));
					
					return options;
				} catch (error) {
					if (error.response) {
						throw new Error(`Error getting devices: ${error.response.data?.message || error.response.statusText}`);
					}
					throw error;
				}
			},
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				// No specific check required as this is a user-configured webhook
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				// No creation needed, user will manually set up the webhook in Hubitat
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				// No delete needed, user will manually remove the webhook in Hubitat
				return true;
			},
		},
	};

	/**
	 * Handle incoming webhooks from Hubitat
	 */
	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const bodyData = req.body as IDataObject;
		const eventType = this.getNodeParameter('eventType') as string;
		
		// Ensure we have valid data
		if (!bodyData || typeof bodyData !== 'object') {
			return {
				webhookResponse: { 
					status: 'error',
					message: 'Invalid webhook data received'
				},
			};
		}

		// Check if we should filter by event type
		if (eventType !== 'allEvents' && bodyData.source) {
			if (eventType === 'deviceEvent' && bodyData.source !== 'DEVICE') {
				return { webhookResponse: { status: 'skipped' } };
			}
			
			if (eventType === 'modeEvent' && bodyData.source !== 'MODE') {
				return { webhookResponse: { status: 'skipped' } };
			}
			
			if (eventType === 'locationEvent' && bodyData.source !== 'LOCATION') {
				return { webhookResponse: { status: 'skipped' } };
			}
			
			if (eventType === 'custom') {
				const customEventType = this.getNodeParameter('customEventType') as string;
				if (bodyData.source !== customEventType) {
					return { webhookResponse: { status: 'skipped' } };
				}
			}
		}
		
		// Check if we should filter by device ID
		if ((['deviceEvent', 'allEvents'].includes(eventType)) && bodyData.deviceId) {
			const filterByDevice = this.getNodeParameter('filterByDevice', false) as boolean;
			
			if (filterByDevice) {
				const deviceIds = this.getNodeParameter('deviceIds', []) as string[];
				
				if (deviceIds.length > 0 && !deviceIds.includes(bodyData.deviceId.toString())) {
					return { webhookResponse: { status: 'skipped' } };
				}
			}
		}
		
		// Process valid event data
		const returnItem = {
			...bodyData,
			webhookTime: new Date().toISOString(),
		};
		
		return {
			workflowData: [
				this.helpers.returnJsonArray([returnItem]),
			],
			webhookResponse: { status: 'success' },
		};
	}
}
