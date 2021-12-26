import { Position } from 'vscode-languageserver';
import { SourceMapConsumer } from 'source-map';
import { SourceMapDocumentMapper } from '../../lib/documents';
export declare class ConsumerDocumentMapper extends SourceMapDocumentMapper {
    private nrPrependesLines;
    constructor(consumer: SourceMapConsumer, sourceUri: string, nrPrependesLines: number);
    getOriginalPosition(generatedPosition: Position): Position;
    getGeneratedPosition(originalPosition: Position): Position;
    isInGenerated(): boolean;
}
