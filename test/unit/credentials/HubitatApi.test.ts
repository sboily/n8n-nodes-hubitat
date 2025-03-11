import { HubitatApi } from '../../../src/credentials/HubitatApi.credentials';

describe('HubitatApi Credentials', () => {
  let credentials: HubitatApi;
  
  beforeEach(() => {
    credentials = new HubitatApi();
  });
  
  it('should have the correct name and displayName', () => {
    expect(credentials.name).toBe('hubitatApi');
    expect(credentials.displayName).toBe('Hubitat API');
  });
  
  it('should have documentationUrl defined', () => {
    expect(credentials.documentationUrl).toBeDefined();
    expect(typeof credentials.documentationUrl).toBe('string');
  });
  
  it('should define required properties', () => {
    expect(credentials.properties).toHaveLength(3);
    
    // Check hubitatHost property
    const hostProp = credentials.properties.find(p => p.name === 'hubitatHost');
    expect(hostProp).toBeDefined();
    expect(hostProp?.type).toBe('string');
    
    // Check appId property
    const appIdProp = credentials.properties.find(p => p.name === 'appId');
    expect(appIdProp).toBeDefined();
    expect(appIdProp?.type).toBe('string');
    
    // Check accessToken property
    const tokenProp = credentials.properties.find(p => p.name === 'accessToken');
    expect(tokenProp).toBeDefined();
    expect(tokenProp?.type).toBe('string');
    
    // Vérifier si typeOptions et password existent, sans exiger de valeur spécifique
    if (tokenProp?.typeOptions) {
      expect(typeof tokenProp.typeOptions.password).toBe('boolean');
    }
  });
});
