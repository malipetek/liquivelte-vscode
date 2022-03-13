import vscode from 'vscode';
import state from './state';
import { ReplaceOperation } from '../types/replace-operation';

let timeout: NodeJS.Timer | undefined = undefined;


const deco = vscode.window.createTextEditorDecorationType({
  isWholeLine: false,
  backgroundColor: 'rgba(60, 255, 0, 0.06)'
});

const activeDeco = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  border: "1px solid #34b46e9c",
  borderSpacing: "5px",
  borderRadius: "3px"
});

function updateDecorations (operations: ReplaceOperation[])
{

  const decorations = operations.filter(op => !op.active).map((operation: ReplaceOperation) =>
  {
    const position1 = new vscode.Position(operation.was.lines[0] - 1, operation.was.start);
    const position2 = new vscode.Position(operation.was.lines[operation.was.lines.length - 1] - 1, operation.was.end);

    return {
      range: new vscode.Range(position1, position2),
      renderOptions: {
        // after: { contentText: `  ${operation.explanation}` }
      },
      hoverMessage: `  ${operation.explanation}`
    };
  });

  const activeDecorations = operations.filter(op => op.active).map((operation: ReplaceOperation) =>
  {
    const lineAdditionsBefore = operations.filter(op => op.was.lines[0] < operation.was.lines[0] && op.linesAdded).reduce((acc, op) => acc + op.linesAdded, 0);
    const position1 = new vscode.Position(operation.operation.lines[0] - 1 + lineAdditionsBefore, operation.operation.start);
    const position2 = new vscode.Position(operation.operation.lines[operation.operation.lines.length - 1] - 1 + lineAdditionsBefore, operation.operation.end);
    return {
      range: new vscode.Range(position1, position2),
      renderOptions: {
        after: { contentText: `  ${operation.explanation}` }
      },
      hoverMessage: `  ${operation.explanation}`
    };
  });

  // editor.setDecorations(deco, decorations);
  state['openPreview'].setDecorations(activeDeco, activeDecorations);
}

export function triggerUpdateDecorations (operations: ReplaceOperation[], activeOperations: ReplaceOperation[] = [])
{
  if (timeout) {
    clearTimeout(timeout);
    timeout = undefined;
  }
  if (state['openPreview']) {
    state['openPreview'].setDecorations(deco, []);
    state['openPreview'].setDecorations(activeDeco, []);
  }

  timeout = setTimeout(() => updateDecorations(operations), 500);
}