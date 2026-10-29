import engineCatalog from './engine-catalog.json';
import { filterKeyvoVisibleEntries } from './keyvo-model-visibility';

const visibleEngineCatalog = filterKeyvoVisibleEntries(engineCatalog) as typeof engineCatalog;

export default visibleEngineCatalog;
