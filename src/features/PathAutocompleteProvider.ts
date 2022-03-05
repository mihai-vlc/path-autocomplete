import fsAsync from 'fs/promises';
import path from 'path';

import vs from 'vscode';
import minimatch from 'minimatch';
import { FileInfo } from './FileInfo';
import PathConfiguration from './PathConfiguration';
import { isDirectory, pathExists } from './FsUtils';

interface MappingItem {
    currentDir: string;
    insertedPath: string;
}

const configuration = PathConfiguration.configuration;

export class PathAutocomplete implements vs.CompletionItemProvider {
    private currentFile: string;
    private currentLine: string;
    private currentPosition: number;
    private namePrefix: string;

    async provideCompletionItems(
        document: vs.TextDocument,
        position: vs.Position,
        _token: vs.CancellationToken,
    ): Promise<vs.CompletionItem[]> {
        configuration.update(document.uri);

        this.currentFile = document.fileName;
        const currentLine = document.getText(document.lineAt(position).range);
        this.currentLine = currentLine;
        this.currentPosition = position.character;
        this.namePrefix = this.getNamePrefix();

        if (!this.shouldProvide()) {
            return [];
        }

        const foldersPath = await this.getFoldersPath(
            document.fileName,
            currentLine,
            position.character,
        );

        if (foldersPath.length === 0) {
            return [];
        }

        const folderItems = await this.getFolderItems(foldersPath);

        // build the list of the completion items
        const result = folderItems.filter(this.filter, this).map((file) => {
            const completion = new vs.CompletionItem(file.name);

            // correct suggestion Item icon, ref issue#100
            completion.detail = file.path;
            completion.insertText = this.getInsertText(file);

            // show folders before files
            if (file.isDirectory) {
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

        return result;
    }

    /**
     * Gets the name prefix for the completion item.
     * This is used when the path that the user typed so far
     * contains part of the file/folder name
     * Examples:
     *      /folder/Fi => complete path is /folder/File => will return Fi
     *      /folder/subfo => complete path is /folder/subfolder => will return subfo
     */
    getNamePrefix(): string {
        const userPath = this.getUserPath(this.currentLine, this.currentPosition);
        if (userPath.endsWith('/') || userPath.endsWith('\\')) {
            return '';
        }

        return path.basename(userPath);
    }

    /**
     * Determines if the file extension should be included in the selected options when
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

        if (this.isExtensionEnabled() || file.isDirectory) {
            insertText = path.basename(file.name);
        } else {
            // remove the extension
            insertText = path.basename(file.name, path.extname(file.name));
        }

        if (configuration.data.useBackslash && this.isInsideQuotes()) {
            // determine if we should insert an additional backslash
            if (this.currentLine[this.currentPosition - 2] !== '\\') {
                insertText = '\\' + insertText;
            }
        }

        // apply the transformations
        configuration.data.transformations.forEach((transform) => {
            const fileNameRegex =
                transform.when && transform.when.fileName && new RegExp(transform.when.fileName);
            if (fileNameRegex && !file.name.match(fileNameRegex)) {
                return;
            }

            const parameters = transform.parameters || [];
            if (transform.type === 'replace' && parameters[0]) {
                insertText = String.prototype.replace.call(
                    insertText,
                    new RegExp(parameters[0]),
                    parameters[1],
                );
            }
        });

        if (this.namePrefix) {
            insertText = insertText.substring(this.namePrefix.length);
        }

        return insertText;
    }

    /**
     * Builds a list of the available files and folders from the provided path.
     */
    async getFolderItems(foldersPath: string[]): Promise<FileInfo[]> {
        const getFileInfoPromises = foldersPath.map(async (folderPath) => {
            const filenames = await fsAsync.readdir(folderPath);
            return Promise.all(
                filenames.map(async (filename) => {
                    const filePath = path.join(folderPath, filename);
                    try {
                        const fileType = (await isDirectory(filePath)) ? 'dir' : 'file';
                        return new FileInfo(filePath, fileType);
                    } catch (err) {
                        // silently ignore permissions errors
                        console.error(err);
                    }
                }),
            );
        });
        const fileInfosArray = await Promise.all(getFileInfoPromises);
        return fileInfosArray.flat().filter((record) => {
            // in case of a file permission error we need to keep only valid
            // FileInfo objects in the result
            return Boolean(record);
        });
    }

    /**
     * Builds the current folder path based on the current file and the path from
     * the current line.
     *
     */
    async getFoldersPath(
        fileName: string,
        currentLine: string,
        currentPosition: number,
    ): Promise<string[]> {
        const userPath = this.getUserPath(currentLine, currentPosition);
        const mappingResult = this.applyMapping(userPath);
        const promises = mappingResult.items
            .map((item) => {
                const insertedPath = item.insertedPath;
                const currentDir =
                    item.currentDir || this.getCurrentDirectory(fileName, insertedPath);

                // relative to the disk
                if (insertedPath.match(/^[a-z]:/i)) {
                    return [insertedPath];
                }

                // user folder
                if (insertedPath.startsWith('~')) {
                    return [path.join(configuration.data.homeDirectory, insertedPath.substring(1))];
                }

                return [path.join(currentDir, insertedPath)];
            })
            // merge the resulted path
            .flat()
            // keep only folders
            .map(async (folderPath) => {
                const item = {
                    folderPath,
                    valid: true,
                };

                if (!(folderPath.endsWith('/') || folderPath.endsWith('\\'))) {
                    item.folderPath = path.dirname(folderPath);
                }

                if (!(await pathExists(folderPath)) || !(await isDirectory(folderPath))) {
                    item.valid = false;
                }

                return item;
            });

        const items = await Promise.all(promises);
        const foldersPath = [];
        for (const item of items) {
            if (item.valid) {
                foldersPath.push(item.folderPath);
            }
        }
        return foldersPath;
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
        const pathSeparators = configuration.data.pathSeparators.split('');

        for (let i = 0; i < currentPosition; i++) {
            const c = currentLine[i];

            // skip next character if escaped
            if (c === '\\') {
                i++;
                continue;
            }

            // handle separators for support outside strings
            if (pathSeparators.indexOf(c) > -1) {
                lastSeparator = i;
                continue;
            }

            // handle quotes
            if (c === "'" || c === '"' || c === '`') {
                lastQuote = i;
            }
        }

        const startPosition = lastQuote !== -1 ? lastQuote : lastSeparator;

        return currentLine.substring(startPosition + 1, currentPosition);
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
    applyMapping(insertedPath: string): { items: MappingItem[] } {
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
        const ignoredPrefixes = configuration.data.ignoredPrefixes;

        if (!ignoredPrefixes || ignoredPrefixes.length === 0) {
            return false;
        }

        return ignoredPrefixes.some((prefix) => {
            const currentLine = this.currentLine;
            const position = this.currentPosition;

            if (prefix.length > currentLine.length) {
                return false;
            }

            const candidate = currentLine.substring(position - prefix.length, position);

            if (prefix === candidate) {
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
            if (currentLine.charAt(i) === "'" && currentLine.charAt(i - 1) !== '\\') {
                quotes.single += quotes.single > 0 ? -1 : 1;
            }

            if (currentLine.charAt(i) === '"' && currentLine.charAt(i - 1) !== '\\') {
                quotes.double += quotes.double > 0 ? -1 : 1;
            }

            if (currentLine.charAt(i) === '`' && currentLine.charAt(i - 1) !== '\\') {
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
        if (this.namePrefix && suggestionFile.name.indexOf(this.namePrefix) !== 0) {
            return false;
        }

        const currentFile = this.currentFile;
        const currentLine = this.currentLine;

        return Object.entries(configuration.data.excludedItems).every(([item, exclusion]) => {
            // check the local file name pattern
            if (!minimatch(currentFile, exclusion.when)) {
                return true;
            }

            if (!minimatch(suggestionFile.path, item)) {
                return true;
            }

            // check the local line context
            if (exclusion.context) {
                const contextRegex = new RegExp(exclusion.context);
                if (!contextRegex.test(currentLine)) {
                    return true;
                }
            }

            // exclude folders from the results
            if (exclusion.isDir && !suggestionFile.isDirectory) {
                return true;
            }

            return false;
        });
    }
}
