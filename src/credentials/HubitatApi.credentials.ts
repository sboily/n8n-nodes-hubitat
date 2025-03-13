import {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class HubitatApi implements ICredentialType {
  name = 'hubitatApi';
  displayName = 'Hubitat API';
  documentationUrl = 'https://docs.hubitat.com/index.php?title=Maker_API';
  properties: INodeProperties[] = [
    {
      displayName: 'Hubitat Host',
      name: 'hubitatHost',
      type: 'string',
      default: 'http://192.168.0.100',
      placeholder: 'http://192.168.0.100',
      description: 'The IP address or hostname of your Hubitat hub',
    },
    {
      displayName: 'App ID',
      name: 'appId',
      type: 'string',
      default: '',
      description: 'The Maker API App ID',
    },
    {
      displayName: 'Access Token',
      name: 'accessToken',
      type: 'string',
      default: '',
      description: 'The access token for the Maker API',
    },
  ];
}
