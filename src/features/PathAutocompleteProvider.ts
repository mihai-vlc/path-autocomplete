import vs from 'vscode';
import { FileInfo } from './FileInfo';
import minimatch from 'minimatch';
import PathConfiguration from './PathConfiguration';

// node modules
import fs from 'fs';
import path from 'path';

const configuration = new PathConfiguration();

// load the initial configurations
configuration.update();

export class PathAutocomplete implements vs.CompletionItemProvider {
    private currentFile: string;
    private currentLine: string;
    private currentPosition: number;
    private namePrefix: string;

    provideCompletionItems(
        document: vs.TextDocument,
        position: vs.Position,
        _token: vs.CancellationToken,
    ): Thenable<vs.CompletionItem[]> {
        const currentLine = document.getText(document.lineAt(position).range);

        configuration.update(document.uri);

        this.currentFile = document.fileName;
        this.currentLine = currentLine;
        this.currentPosition = position.character;
        this.namePrefix = this.getNamePrefix();

        if (!this.shouldProvide()) {
            return Promise.resolve([]);
        }

        const foldersPath = this.getFoldersPath(document.fileName, currentLine, position.character);

        if (foldersPath.length == 0) {
            return Promise.resolve([]);
        }

        const folderItems = this.getFolderItems(foldersPath).then((items: FileInfo[]) => {
            // build the list of the completion items
            const result = items.filter(this.filter, this).map((file) => {
                const completion = new vs.CompletionItem(file.getName());

                completion.insertText = this.getInsertText(file);

                // show folders before files
                if (file.isDirectory()) {
                    if (configuration.data.useBackslash) {
                        completion.label += '\\';
                    } else {
                        completion.label += '/';
                    }

                    if (configuration.data.enableFolderTrailingSlash) {
                        let commandText = '/';

                        if (configuration.data.useBackslash) {
                            commandText = this.isInsideQuotes() ? '\\\\' : '\\';
                        }

                        completion.command = {
                            command: 'default:type',
                            title: 'triggerSuggest',
                            arguments: [
                                {
                                    text: commandText,
                                },
                            ],
                        };
                    }

                    completion.sortText = 'd';
                    completion.kind = vs.CompletionItemKind.Folder;
                } else {
                    completion.sortText = 'f';
                    completion.kind = vs.CompletionItemKind.File;
                }

                // this is deprecated but still needed for the completion to work
                // in json files
                completion.textEdit = new vs.TextEdit(
                    new vs.Range(position, position),
                    completion.insertText,
                );

                return completion;
            });

            // add the `up one folder` item
            if (!configuration.data.disableUpOneFolder) {
                result.unshift(new vs.CompletionItem('..'));
            }

            return Promise.resolve(result);
        });

        return folderItems;
    }

    /**
     * Gets the name prefix for the completion item.
     * This is used when the path that the user user typed so far
     * contains part of the file/folder name
     * Examples:
     *      /folder/Fi
     *      /folder/subfo
     */
    getNamePrefix(): string {
        const userPath = this.getUserPath(this.currentLine, this.currentPosition);
        if (userPath.endsWith('/') || userPath.endsWith('\\')) {
            return '';
        }

        return path.basename(userPath);
    }

    /**
     * Detemines if the file extension should be included in the selected options when
     * the selection is made.
     */
    isExtensionEnabled(): boolean {
        if (this.currentLine.match(/require|import/)) {
            return configuration.data.withExtensionOnImport;
        }

        return configuration.data.withExtension;
    }

    getInsertText(file: FileInfo): string {
        let insertText = '';

        if (this.isExtensionEnabled() || file.isDirectory()) {
            insertText = path.basename(file.getName());
        } else {
            // remove the extension
            insertText = path.basename(file.getName(), path.extname(file.getName()));
        }

        if (configuration.data.useBackslash && this.isInsideQuotes()) {
            // determine if we should insert an additional backslash
            if (this.currentLine[this.currentPosition - 2] != '\\') {
                insertText = '\\' + insertText;
            }
        }

        // apply the transformations
        configuration.data.transformations.forEach((transform) => {
            const fileNameRegex =
                transform.when && transform.when.fileName && new RegExp(transform.when.fileName);
            if (fileNameRegex && !file.getName().match(fileNameRegex)) {
                return;
            }

            const parameters = transform.parameters || [];
            if (transform.type == 'replace' && parameters[0]) {
                insertText = String.prototype.replace.call(
                    insertText,
                    new RegExp(parameters[0]),
                    parameters[1],
                );
            }
        });

        if (this.namePrefix) {
            insertText = insertText.substr(this.namePrefix.length);
        }

        return insertText;
    }

    /**
     * Builds a list of the available files and folders from the provided path.
     */
    getFolderItems(foldersPath: string[]) {
        const results = foldersPath.map((folderPath) => {
            return new Promise(function (resolve, reject) {
                fs.readdir(folderPath, function (err, items) {
                    if (err) {
                        return reject(err);
                    }
                    const fileResults = [];

                    items.forEach((item) => {
                        try {
                            fileResults.push(new FileInfo(path.join(folderPath, item)));
                        } catch (err) {
                            // silently ignore permissions errors
                        }
                    });

                    resolve(fileResults);
                });
            });
        });

        return Promise.all(results).then((allResults) => {
            return allResults.reduce((all: string[], currentResults: string[]) => {
                return all.concat(currentResults);
            }, []);
        });
    }

    /**
     * Builds the current folder path based on the current file and the path from
     * the current line.
     *
     */
    getFoldersPath(fileName: string, currentLine: string, currentPosition: number): string[] {
        const userPath = this.getUserPath(currentLine, currentPosition);
        const mappingResult = this.applyMapping(userPath);

        return (
            mappingResult.items
                .map((item) => {
                    const insertedPath = item.insertedPath;
                    const currentDir =
                        item.currentDir || this.getCurrentDirectory(fileName, insertedPath);

                    // relative to the disk
                    if (insertedPath.match(/^[a-z]:/i)) {
                        let resolved = path.resolve(insertedPath);
                        // restore trailing slashes if they were removed
                        if (resolved.slice(-1) != insertedPath.slice(-1)) {
                            resolved += insertedPath.substr(-1);
                        }
                        return [resolved];
                    }

                    // user folder
                    if (insertedPath.startsWith('~')) {
                        return [
                            path.join(configuration.data.homeDirectory, insertedPath.substring(1)),
                        ];
                    }

                    // npm package
                    if (this.isNodePackage(insertedPath, currentLine)) {
                        return [
                            path.join(this.getNodeModulesPath(currentDir), insertedPath),
                            path.join(currentDir, insertedPath),
                        ];
                    }

                    return [path.join(currentDir, insertedPath)];
                })
                // merge the resulted path
                .reduce((flat, toFlatten) => {
                    return flat.concat(toFlatten);
                }, [])
                // keep only folders
                .map((folderPath: string) => {
                    if (folderPath.endsWith('/') || folderPath.endsWith('\\')) {
                        return folderPath;
                    }
                    return path.dirname(folderPath);
                })
                // keep only valid paths
                .filter((folderPath) => {
                    if (!fs.existsSync(folderPath) || !fs.lstatSync(folderPath).isDirectory()) {
                        return false;
                    }

                    return true;
                })
        );
    }

    /**
     * Retrieves the path inserted by the user. This is taken based on the last quote or last white space character.
     *
     * @param currentLine The current line of the cursor.
     * @param currentPosition The current position of the cursor.
     */
    getUserPath(currentLine: string, currentPosition: number): string {
        let lastQuote = -1;
        let lastSeparator = -1;
        const pathSepartors = configuration.data.pathSeparators.split('');

        for (let i = 0; i < currentPosition; i++) {
            const c = currentLine[i];

            // skip next character if escaped
            if (c == '\\') {
                i++;
                continue;
            }

            // handle separators for support outside strings
            if (pathSepartors.indexOf(c) > -1) {
                lastSeparator = i;
                continue;
            }

            // handle quotes
            if (c == "'" || c == '"' || c == '`') {
                lastQuote = i;
            }
        }

        const startPosition = lastQuote != -1 ? lastQuote : lastSeparator;

        return currentLine.substring(startPosition + 1, currentPosition);
    }

    /**
     * Searches for the node_modules folder in the parent folders of the current directory.
     *
     * @param currentDir The current directory
     */
    getNodeModulesPath(currentDir: string): string {
        const rootPath = configuration.data.workspaceFolderPath;

        while (currentDir != path.dirname(currentDir)) {
            const candidatePath = path.join(currentDir, 'node_modules');
            if (fs.existsSync(candidatePath)) {
                return candidatePath;
            }

            currentDir = path.dirname(currentDir);
        }

        return path.join(rootPath, 'node_modules');
    }

    /**
     * Returns the current working directory
     */
    getCurrentDirectory(fileName: string, insertedPath: string): string {
        let currentDir = path.parse(fileName).dir || '/';
        const workspacePath = configuration.data.workspaceFolderPath;

        // based on the project root
        if (insertedPath.startsWith('/') && workspacePath) {
            currentDir = workspacePath;
        }

        return path.resolve(currentDir);
    }

    /**
     * Applies the folder mappings based on the user configurations
     */
    applyMapping(insertedPath: string): { items } {
        const currentDir = '';
        const workspaceFolderPath = configuration.data.workspaceFolderPath;
        const workspaceRootPath = configuration.data.workspaceRootPath;
        const items = [];

        Object.keys(configuration.data.pathMappings || {})
            // if insertedPath is '@view/'
            // and mappings is [{key: '@', ...}, {key: '@view', ...}]
            // and it will match '@' and return wrong items { currentDir: 'xxx',  insertedPath: 'view/'}
            // solution : Sort keys by matching longest prefix, and it will match key(@view) first
            .sort((key1, key2) => {
                const f1 = insertedPath.startsWith(key1) ? key1.length : 0;
                const f2 = insertedPath.startsWith(key2) ? key2.length : 0;
                return f2 - f1;
            })
            .map((key) => {
                let candidatePaths = configuration.data.pathMappings[key];

                if (typeof candidatePaths == 'string') {
                    candidatePaths = [candidatePaths];
                }

                return candidatePaths.map((candidatePath) => {
                    if (workspaceRootPath) {
                        candidatePath = candidatePath.replace('${workspace}', workspaceRootPath);
                    }

                    if (workspaceFolderPath) {
                        candidatePath = candidatePath.replace('${folder}', workspaceFolderPath);
                    }

                    candidatePath = candidatePath.replace(
                        '${home}',
                        configuration.data.homeDirectory,
                    );

                    return {
                        key: key,
                        path: candidatePath,
                    };
                });
            })
            .some((mappings) => {
                let found = false;

                mappings.forEach((mapping) => {
                    if (
                        insertedPath.startsWith(mapping.key) ||
                        (mapping.key === '$root' && !insertedPath.startsWith('.'))
                    ) {
                        items.push({
                            currentDir: mapping.path,
                            insertedPath: insertedPath.replace(mapping.key, ''),
                        });
                        found = true;
                    }
                });

                // stop after the first mapping found
                return found;
            });

        // no mapping was found, use the raw path inserted by the user
        if (items.length === 0) {
            items.push({
                currentDir: '',
                insertedPath,
            });
        }
        return { items };
    }

    /**
     * Determine if the current path matches the pattern for a node module
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
    shouldProvide() {
        if (
            configuration.data.ignoredFilesPattern &&
            minimatch(this.currentFile, configuration.data.ignoredFilesPattern)
        ) {
            return false;
        }

        if (this.isIgnoredPrefix()) {
            return false;
        }

        if (configuration.data.triggerOutsideStrings) {
            return true;
        }

        return this.isInsideQuotes();
    }

    /**
     * Determines if the prefix of the path is in the ignored list
     */
    isIgnoredPrefix() {
        const igoredPrefixes = configuration.data.ignoredPrefixes;

        if (!igoredPrefixes || igoredPrefixes.length == 0) {
            return false;
        }

        return igoredPrefixes.some((prefix) => {
            const currentLine = this.currentLine;
            const position = this.currentPosition;

            if (prefix.length > currentLine.length) {
                return false;
            }

            const candidate = currentLine.substring(position - prefix.length, position);

            if (prefix == candidate) {
                return true;
            }

            return false;
        });
    }

    /**
     * Determines if the cursor is inside quotes.
     */
    isInsideQuotes(): boolean {
        const currentLine = this.currentLine;
        const position = this.currentPosition;
        const quotes = {
            single: 0,
            double: 0,
            backtick: 0,
        };

        // check if we are inside quotes
        for (let i = 0; i < position; i++) {
            if (currentLine.charAt(i) == "'" && currentLine.charAt(i - 1) != '\\') {
                quotes.single += quotes.single > 0 ? -1 : 1;
            }

            if (currentLine.charAt(i) == '"' && currentLine.charAt(i - 1) != '\\') {
                quotes.double += quotes.double > 0 ? -1 : 1;
            }

            if (currentLine.charAt(i) == '`' && currentLine.charAt(i - 1) != '\\') {
                quotes.backtick += quotes.backtick > 0 ? -1 : 1;
            }
        }

        return !!(quotes.single || quotes.double || quotes.backtick);
    }

    /**
     * Filter for the suggested items
     */
    filter(suggestionFile: FileInfo) {
        // no options configured
        if (
            !configuration.data.excludedItems ||
            typeof configuration.data.excludedItems != 'object'
        ) {
            return true;
        }

        // keep only the records that match the name prefix inserted by the user
        if (this.namePrefix && suggestionFile.getName().indexOf(this.namePrefix) != 0) {
            return false;
        }

        const currentFile = this.currentFile;
        const currentLine = this.currentLine;
        let valid = true;

        Object.keys(configuration.data.excludedItems).forEach(function (item) {
            const exclusion = configuration.data.excludedItems[item];

            // check the local file name pattern
            if (!minimatch(currentFile, exclusion.when)) {
                return;
            }

            if (!minimatch(suggestionFile.getPath(), item)) {
                return;
            }

            // check the local line context
            if (exclusion.context) {
                const contextRegex = new RegExp(exclusion.context);
                if (!contextRegex.test(currentLine)) {
                    return;
                }
            }

            // exclude folders from the results
            if (exclusion.isDir && !suggestionFile.isDirectory()) {
                return;
            }

            valid = false;
        });

        return valid;
    }
}
