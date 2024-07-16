// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	let formatDisposable = vscode.languages.registerDocumentFormattingEditProvider(
		'sdvevent',
		new SDVEventFormattingEditProvider()
	);

	let commandDisposable = vscode.commands.registerCommand(
		'stardew-syntax.sdvevent.convert-to-inline',
		sdvevent_convertToInline
	);

	context.subscriptions.push(formatDisposable);
	context.subscriptions.push(commandDisposable);
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
