import type { ReplaceResult } from '../types';
import MagicString from 'magic-string';
export default function liquivelteImportProcessor(script: string, ms: MagicString, { liquidContent, liquidImportsModule, subImportsRegistryModule }: {
    liquidContent: string;
    liquidImportsModule: [];
    subImportsRegistryModule: [];
}): ReplaceResult;
