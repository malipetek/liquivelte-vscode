import type { ReplaceResult, SubImportRegistryModule } from '../types';
import MagicString from 'magic-string';
export default function themeImportProcessor(script: string, ms: MagicString, { liquidImportsModule, subImportsRegistryModule }: {
    liquidImportsModule?: string[];
    subImportsRegistryModule?: SubImportRegistryModule;
}): ReplaceResult;
