import type MagicString from 'magic-string';
import type { ReplaceResult } from '../types';
export default function ifStatementProcessor(markup: string, ms: MagicString, { liquidContent }: {
    liquidContent: any;
}): ReplaceResult;
