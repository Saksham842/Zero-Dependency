import data from './data.json' with { type: 'json' };

export function getJsonInfo() {
  const { name, version, features, settings } = data;
  return {
    defaultName: data.name,
    namedName: name,
    version,
    featureCount: features.length,
    port: settings.port,
    matches: data.name === name
  };
}
