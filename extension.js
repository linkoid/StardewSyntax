// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(
		'sdvevent',
		new SDVEventFormattingEditProvider()
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'stardew-syntax.sdvevent.convert-to-inline',
		sdvevent_convertToInline
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'stardew-syntax.sdvevent.open-selection',
		sdvevent_openSelection
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'stardew-syntax.sdvevent.open-line',
		sdvevent_openLine
	));
}

// this method is called when your extension is deactivated
function deactivate() {}

/**
 * @extends vscode.DocumentFormattingEditProvider
 */
class SDVEventFormattingEditProvider {
	/**
	 * @param {vscode.TextDocument} document
	 */
	provideDocumentFormattingEdits(document) {
		let eol = document.eol === vscode.EndOfLine.CRLF ? "\r\n" : "\n";
		let edits = [];
		for (let i = 0; i < document.lineCount; i++) {
			let line = document.lineAt(i);
			// Add newlines
			edits.push(...regexReplace(line, String.raw`(?<!\s|^)/`, eol + "/"))
			// Unescape double quotes
			edits.push(...regexReplace(line, String.raw`(?<![^\\]\\(?:\\{2})*)\\"`, `"`))
		}
		return edits;
	}
}

async function sdvevent_openSelection() {
	let activeTextEditor = vscode.window.activeTextEditor;
	if (!activeTextEditor) return;

	let document = activeTextEditor.document;
	if (document.languageId !== 'json' && document.languageId !== 'jsonc' ) return;
	
	let lineNumber = activeTextEditor.selection.active.line;
	let line = activeTextEditor.document.lineAt(lineNumber);
	
	let match = line.text.match(String.raw`("|')\w+/-?\d+\s+-?\d+/(?:\s*\w+(?:\s+-?\d+){3}\s*)+/.*(?<![^\\](?:\\{2})*\\)\1`);
	activeTextEditor.selection.start = new vscode.Position(lineNumber, match.index);
	activeTextEditor.selection.end = new vscode.Position(lineNumber, match.index + match[0].length);

	let newUri = vscode.Uri.parse("untitled:untitled.sdvevent", true);
	let newDocument = await vscode.workspace.openTextDocument(newUri);
	let editor = await vscode.window.showTextDocument(newDocument, vscode.ViewColumn.Beside, false);
	await editor.insertSnippet(match[0].substring(1,-1));
	
	await editor.edit((e) => {
		let formatter = new SDVEventFormattingEditProvider();
		let edits = formatter.provideDocumentFormattingEdits(editor.document);
		for (let edit of edits) {
			if (edit.newEol !== null)
				e.setEndOfLine(edit.newEol);
			e.replace(edit.range, edit.newText);
		}
	});
}

function sdvevent_openSelection() {
	let activeTextEditor = vscode.window.activeTextEditor;
	if (!activeTextEditor) return;

	let content = activeTextEditor.document.getText(activeTextEditor.selection)
	return openAsSdvEvent(content)
}

function sdvevent_openLine() {
	let activeTextEditor = vscode.window.activeTextEditor;
	if (!activeTextEditor) return;

	let document = activeTextEditor.document;
	if (document.languageId !== 'json'
		&& document.languageId !== 'jsonc'
		&& document.languageId !== 'jsonl') return;
	
	let lineNumber = activeTextEditor.selection.active.line;
	let line = activeTextEditor.document.lineAt(lineNumber);
	
	let match = line.text.match(String.raw`("|')\w+/-?\d+\s+-?\d+/(?:\s*\w+(?:\s+-?\d+){3}\s*)+/.*(?<![^\\](?:\\{2})*\\)("|')`);
	activeTextEditor.selection = new vscode.Selection(
		lineNumber, match.index + 1,
		lineNumber, match.index + match[0].length - 1
	);

	return openAsSdvEvent(match[0].substring(1, match[0].length - 1))
}

/**
 * @param {string} contents 
 */
async function openAsSdvEvent(contents) {
	let newUri = vscode.Uri.parse('untitled:untitled.sdvevent', true);
	let newDocument = await vscode.workspace.openTextDocument(newUri);
	let editor = await vscode.window.showTextDocument(newDocument, vscode.ViewColumn.Beside, false);
	await editor.edit((e) => {
		e.insert(newDocument.positionAt(0), contents);
	});
	
	await editor.edit((e) => {
		let formatter = new SDVEventFormattingEditProvider();
		let edits = formatter.provideDocumentFormattingEdits(editor.document);
		for (let edit of edits) {
			if (edit.newEol != null)
				e.setEndOfLine(edit.newEol);
			e.replace(edit.range, edit.newText);
		}
	});
}

function sdvevent_convertToInline() {
	let activeTextEditor = vscode.window.activeTextEditor;
	if (!activeTextEditor) return;

	let document = activeTextEditor.document;
	if (document.languageId !== 'sdvevent') return;

	let edits = [];
	edits.push(...removeEOLs(document));

	for (let i = 0; i < document.lineCount; i++) {
		let line = document.lineAt(i);
		// escape double quotes
		edits.push(...regexReplace(line, String.raw`(?<![^\\]\\(?:\\{2})*)"`, String.raw`\"`));
		// escape backslashes
		edits.push(...regexReplace(line, String.raw`(?<![^\\]\\(?:\\{2})*)\\(?!\\|")`, String.raw`\\`));
	}

	let edit = new vscode.WorkspaceEdit();
	edit.set(document.uri, edits);
	vscode.workspace.applyEdit(edit);
}

/**
 * @param {vscode.TextDocument} document 
 * @returns {vscode.TextEdit[]}
 */
function removeEOLs(document) {
	let edits = []
	for (let i = 0; i < document.lineCount; i++) {
		let line = document.lineAt(i);
		edits.push(vscode.TextEdit.replace(
			new vscode.Range(line.range.end, line.rangeIncludingLineBreak.end),
			""
		));
	}
	return edits;
}

/**
 * @param {vscode.TextLine} line 
 * @param {RegExp} regexp
 * @param {string} newText
 * @returns {vscode.TextEdit[]}
 */
function regexReplace(line, regexp, newText) {
	let edits = []
	for (let match of line.text.matchAll(regexp)) {
		edits.push(vscode.TextEdit.replace(
			new vscode.Range(
				line.range.start.with({character: match.index}),
				line.range.start.with({character: match.index + match[0].length})
			),
			newText
		));
	}
	return edits;
}

// eslint-disable-next-line no-undef
module.exports = {
	activate,
	deactivate
}
