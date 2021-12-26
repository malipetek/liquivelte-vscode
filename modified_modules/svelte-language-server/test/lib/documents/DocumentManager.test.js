"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sinon_1 = require("sinon");
const assert = require("assert");
const vscode_languageserver_types_1 = require("vscode-languageserver-types");
const documents_1 = require("../../../src/lib/documents");
describe('Document Manager', () => {
    const textDocument = {
        uri: 'file:///hello.svelte',
        version: 0,
        languageId: 'svelte',
        text: 'Hello, world!'
    };
    const createTextDocument = (textDocument) => new documents_1.Document(textDocument.uri, textDocument.text);
    it('opens documents', () => {
        const createDocument = sinon_1.default.spy();
        const manager = new documents_1.DocumentManager(createDocument);
        manager.openDocument(textDocument);
        sinon_1.default.assert.calledOnce(createDocument);
        sinon_1.default.assert.calledWith(createDocument.firstCall, textDocument);
    });
    it('updates the whole document', () => {
        const document = createTextDocument(textDocument);
        const update = sinon_1.default.spy(document, 'update');
        const createDocument = sinon_1.default.stub().returns(document);
        const manager = new documents_1.DocumentManager(createDocument);
        manager.openDocument(textDocument);
        manager.updateDocument(textDocument, [{ text: 'New content' }]);
        sinon_1.default.assert.calledOnce(update);
        sinon_1.default.assert.calledWith(update.firstCall, 'New content', 0, textDocument.text.length);
    });
    it('updates the parts of the document', () => {
        const document = createTextDocument(textDocument);
        const update = sinon_1.default.spy(document, 'update');
        const createDocument = sinon_1.default.stub().returns(document);
        const manager = new documents_1.DocumentManager(createDocument);
        manager.openDocument(textDocument);
        manager.updateDocument(textDocument, [
            {
                text: 'svelte',
                range: vscode_languageserver_types_1.Range.create(0, 7, 0, 12),
                rangeLength: 5
            },
            {
                text: 'Greetings',
                range: vscode_languageserver_types_1.Range.create(0, 0, 0, 5),
                rangeLength: 5
            }
        ]);
        sinon_1.default.assert.calledTwice(update);
        sinon_1.default.assert.calledWith(update.firstCall, 'svelte', 7, 12);
        sinon_1.default.assert.calledWith(update.secondCall, 'Greetings', 0, 5);
    });
    it("fails to update if document isn't open", () => {
        const manager = new documents_1.DocumentManager(createTextDocument);
        assert.throws(() => manager.updateDocument(textDocument, []));
    });
    it('emits a document change event on open and update', () => {
        const manager = new documents_1.DocumentManager(createTextDocument);
        const cb = sinon_1.default.spy();
        manager.on('documentChange', cb);
        manager.openDocument(textDocument);
        sinon_1.default.assert.calledOnce(cb);
        manager.updateDocument(textDocument, []);
        sinon_1.default.assert.calledTwice(cb);
    });
});
//# sourceMappingURL=DocumentManager.test.js.map