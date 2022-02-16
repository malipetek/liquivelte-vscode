import type MagicString from 'magic-string';
import type { ReplaceResult } from '../types';
export default function rawIncludeProcessor(markup: string, ms: MagicString, { rawIncludeRegistry }: {
    rawIncludeRegistry: any[];
}): ReplaceResult;
