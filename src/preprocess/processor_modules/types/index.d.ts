import type MagicString from 'magic-string';
import { ReplaceOperation } from '../../../types/replace-operation';

export type SubImportsRegistryModuleEntry = {
  id: string;
  importStatement: string;
};

export type SubImportRegistryModule = SubImportsRegistryModuleEntry[];

export type ReplaceResult = {
  magicString: MagicString;
  subImportsRegistryModule?: SubImportRegistryModule;
  liquidImportsModule?: string[];
  replaceOperations: ReplaceOperation[];
  linesAdded: number;
};