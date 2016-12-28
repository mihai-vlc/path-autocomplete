import * as vs from 'vscode';
import {FileInfo} from './FileInfo';
import * as minimatch from 'minimatch';

// node modules
import * as fs from 'fs';
import * as path from 'path';

const withExtension = vs.workspace.getConfiguration('path-autocomplete')['extensionOnImport'];
const excludedItems = vs.workspace.getConfiguration('path-autocomplete')['excludedItems'];
const pathMappings = vs.workspace.getConfiguration('path-autocomplete')['pathMappings'];
const transformations = vs.workspace.getConfiguration('path-autocomplete')['transformations'];
const homeDirectory = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];

export class PathAutocomplete implements vs.CompletionItemProvider {

    currentFile: string;

    provideCompletionItems(document: vs.TextDocument, position: vs.Position, token: vs.CancellationToken): Thenable<vs.CompletionItem[]> {

        var currentLine = document.getText(document.lineAt(position).range);
        var self = this;

        this.currentFile = document.fileName;

        if (!this.shouldProvide(currentLine, position.character)) {
            return Promise.resolve([]);
        }

        var folderPath = this.getFolderPath(document.fileName, currentLine, position.character);

        return this.getFolderItems(folderPath).then((items: FileInfo[]) => {
            // build the list of the completion items
            var result = items.filter(self.filter, self).map((file) => {
                var completion = new vs.CompletionItem(file.getName());

                completion.insertText = this.getInsertText(file);

                // show folders before files
                if (file.isDirectory()) {
                    completion.label += '/';
                    completion.command = {
                        command: 'default:type',
                        title: 'triggerSuggest',
                        arguments: [{
                            text: '/'
                        }]
                    };
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


    getInsertText(file: FileInfo): string {
        var insertText = '';
        if (withExtension || file.isDirectory()) {
            insertText = path.basename(file.getName());
        } else {
            // remove the extension
            insertText = path.basename(file.getName(), path.extname(file.getName()));
        }

        // apply the transformations
        transformations.forEach((transform) => {
            var fileNameRegex = transform.when && transform.when.fileName && new RegExp(transform.when.fileName);
            if (fileNameRegex && !file.getName().match(fileNameRegex)) {
                return;
            }

            var parameters = transform.parameters || [];
            if (transform.type == 'replace' && parameters[0]) {
                insertText = String.prototype.replace.call(insertText, new RegExp(parameters[0]), parameters[1]);
            }

        });

        return insertText;
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
                        // silently ignore permissions errors
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

        // extract the inserted text from the quote to the cursor to obtain the inserted path
        var text = currentLine.substring(0, currentPosition);
        var startPosition = Math.max(text.lastIndexOf('"'), text.lastIndexOf("'"), text.lastIndexOf("`"));
        var mappingResult = this.applyMapping(startPosition != -1 ? text.substring(startPosition + 1) : '');
        var insertedPath = mappingResult.insertedPath;
        var currentDir = mappingResult.currentDir || this.getCurrentDirectory(fileName, insertedPath);

        // relative to the disk
        if (insertedPath.match(/^[a-z]:/i)) {
            return path.resolve(insertedPath);
        }

        // user folder
        if (insertedPath.startsWith('~')) {
            return path.join(homeDirectory, insertedPath.substring(1));
        }

        // npm package
        if (this.isNodePackage(insertedPath, currentLine)) {
            return path.join(vs.workspace.rootPath, 'node_modules', insertedPath);
        }

        return path.join(currentDir, insertedPath);
    }

    /**
     * Returns the current working directory
     */
    getCurrentDirectory(fileName: string, insertedPath: string): string {
        var currentDir = path.parse(fileName).dir || '/';
        var workspacePath = vs.workspace.rootPath;

        // based on the project root
        if (insertedPath.startsWith('/') && workspacePath) {
            currentDir = vs.workspace.rootPath;
        }

        return path.resolve(currentDir);
    }

    /**
     * Applies the folder mappings based on the user configurations
     */
    applyMapping(insertedPath: string): { currentDir: string, insertedPath: string } {
        var currentDir = '';
        var workspacePath = vs.workspace.rootPath;

        Object.keys(pathMappings || {})
            .map((key) => {
                var candidatePath = pathMappings[key];

                if (workspacePath) {
                    candidatePath = candidatePath.replace('${workspace}', workspacePath);
                }

                candidatePath = candidatePath.replace('${home}', homeDirectory);

                return {
                    key: key,
                    path: candidatePath
                };
            })
            .some((mapping) => {
                if (insertedPath.startsWith(mapping.key)) {
                    currentDir = mapping.path;
                    insertedPath = insertedPath.replace(mapping.key, '');
                    return true;
                }

                return false;
            });

        return { currentDir, insertedPath };
    }

    /**
     * Determine if the current path
     */
    isNodePackage(insertedPath: string, currentLine: string) {
        if (!currentLine.match(/require|import/)) {
            return false;
        }

        if (!insertedPath.match(/^[a-z]/i)) {
            return false;
        }

        return true;
    }

    /**
     * Determine if we should provide path completion.
     */
    shouldProvide(currentLine: string, position: number) {
        var quotes = {
            single: 0,
            double: 0,
            backtick: 0
        };

        // check if we are inside quotes
        for (var i = 0; i < position; i++) {
            if (currentLine.charAt(i) == "'" && currentLine.charAt(i-1) != '\\') {
                quotes.single += quotes.single > 0 ? -1 : 1;
            }

            if (currentLine.charAt(i) == '"' && currentLine.charAt(i-1) != '\\') {
                quotes.double += quotes.double > 0 ? -1 : 1;
            }

            if (currentLine.charAt(i) == '`' && currentLine.charAt(i-1) != '\\') {
                quotes.backtick += quotes.backtick > 0 ? -1 : 1;
            }
        }

        return !!(quotes.single || quotes.double || quotes.backtick);
    }

    /**
     * Filter for the suggested items
     */
    filter(file: FileInfo) {
        // no options configured
        if (!excludedItems || typeof excludedItems != 'object') {
            return true;
        }

        var currentFile = this.currentFile;
        var valid = true;

        Object.keys(excludedItems).forEach(function(item) {
            var rule = excludedItems[item].when;

            if (minimatch(currentFile, rule) && minimatch(file.getPath(), item)) {
                valid = false;
            }
        });

        return valid;
    }
}
