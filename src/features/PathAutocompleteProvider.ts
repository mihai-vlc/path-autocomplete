import * as vs from 'vscode';
import {FileInfo} from './FileInfo';
import * as minimatch from 'minimatch';

// node modules
import * as fs from 'fs';
import * as path from 'path';

const withExtension = vs.workspace.getConfiguration('path-autocomplete')['extensionOnImport'];
const excludedItems = vs.workspace.getConfiguration('path-autocomplete')['excludedItems'];
const homeDir = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];

export class PathAutocomplete implements vs.CompletionItemProvider {

    currentFile: string;

    provideCompletionItems(document: vs.TextDocument, position: vs.Position, token: vs.CancellationToken): Thenable<vs.CompletionItem[]> {

        var currentLine = document.getText(document.lineAt(position).range);
        var folderPath = this.getFolderPath(document.fileName, currentLine, position.character);
        var self = this;

        this.currentFile = document.fileName;

        if (!this.shouldProvide(currentLine, position.character)) {
            return Promise.resolve([]);
        }

        return this.getFolderItems(folderPath).then(function(items: FileInfo[]) {
            // build the list of the completion items
            var result = items.filter(self.filter, self).map(function(file) {
                var completion = new vs.CompletionItem(file.getName());

                if (withExtension) {
                    completion.insertText = path.basename(file.getName());
                } else {
                    // remove the extension
                    completion.insertText = path.basename(file.getName(), path.extname(file.getName()));
                }

                // show folders before files
                if (file.isDirectory()) {
                    completion.label += '/';
                    completion.sortText = 'd';
                } else {
                    completion.sortText = 'f';
                }

                completion.kind = vs.CompletionItemKind.File;

                return completion;
            });

            // add up one folder item
            result.unshift(new vs.CompletionItem('..'))

            return Promise.resolve(result);
        });
    }


    /**
     * Builds a list of the available files and folders from the provided path.
     */
    getFolderItems(folderPath: string) {
        return new Promise(function(resolve, reject) {
            fs.readdir(folderPath, function(err, items) {
                if (err) {
                    return reject(err);
                }
                var results = [];

                items.forEach(item => {
                    try {
                        results.push(new FileInfo(path.join(folderPath, item)));
                    } catch (err) {
                        // silenty ignore permissions errors
                    }
                });

                resolve(results);
            });
        });
    }

    /**
     * Builds the current folder path based on the current file and the path from
     * the current line.
     * 
     */
    getFolderPath(fileName: string, currentLine: string, currentPosition: number): string {
        var fileInfo = path.parse(fileName);
        var currentDir = fileInfo.dir || '/';

        // try to build a path from the current position
        var text = currentLine.substring(0, currentPosition);
        var startPosition = Math.max(text.lastIndexOf('"'), text.lastIndexOf("'"));
        var insertedPath = startPosition != -1 ? text.substring(startPosition + 1) : '';

        // based on the project root
        if (insertedPath.startsWith('/') && vs.workspace.rootPath) {
            currentDir = vs.workspace.rootPath;
        }

        // relative to the disk
        if (insertedPath.match(/^[a-z]:/i)) {
            return path.resolve(insertedPath);
        }

        // user folder
        if (insertedPath.startsWith('~')) {
            return path.join(homeDir, insertedPath.substring(1));
        }

        return path.join(currentDir, insertedPath);
    }

    /**
     * Deterimine if we should provide path completion.
     */
    shouldProvide(currentLine: string, position: number) {
        var quotes = {
            single: 0,
            double: 0
        };

        // check if we are inside quotes
        for (var i = 0; i < position; i++) {
            if (currentLine.charAt(i) == "'" && currentLine.charAt(i-1) != '\\') {
                quotes.single += quotes.single > 0 ? -1 : 1;
            }

            if (currentLine.charAt(i) == '"' && currentLine.charAt(i-1) != '\\') {
                quotes.double += quotes.double > 0 ? -1 : 1;
            }
        }

        return !!(quotes.single || quotes.double);
    }

    /**
     * Filter for the suggested items
     */
    filter(file : FileInfo) {
        // no options configured
        if (!excludedItems || typeof excludedItems != 'object') {
            return true;
        }

        var currenFile = this.currentFile;
        var valid = true;

        Object.keys(excludedItems).forEach(function(item) {
            var rule = excludedItems[item].when;

            if (minimatch(currenFile, rule) && minimatch(file.getPath(), item)) {
                valid = false;
            }
        });

        return valid;
    }
}
