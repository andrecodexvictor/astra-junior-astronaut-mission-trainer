import configuration from '../../source.config.json';
/** Public provenance only. No remote request or authentication is needed to play. */
const requested = import.meta.env.VITE_SOURCE_REPOSITORY_URL || configuration.repository;
const allowed = /^https:\/\/github\.com\/andrecodexvictor\/(astra-lunar-frontier|astra-junior-astronaut-mission-trainer)$/;
export const SOURCE_REPOSITORY_URL = allowed.test(requested) ? requested : configuration.repository;
export const RELEASE_LABEL = SOURCE_REPOSITORY_URL.endsWith('/astra-junior-astronaut-mission-trainer')
  ? 'Entrega candidata • proveniência pública'
  : 'Protótipo independente • código público';
