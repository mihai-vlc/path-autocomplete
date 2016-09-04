'use strict';
import * as vscode from 'vscode';
import {PathAutocomplete} from './features/PathAutoCompleteProvider';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('*', new PathAutocomplete(), '/'));
}

// this method is called when your extension is deactivated
export function deactivate() {
}