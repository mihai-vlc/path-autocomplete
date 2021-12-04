import vs from 'vscode';

interface PathConfigurationValues {
    withExtension?: boolean;
    withExtensionOnImport?: boolean;
    excludedItems?: [
        {
            [key: string]: {
                when: string;
                isDir?: boolean;
                context?: string;
            };
        },
    ];
    pathMappings?: [
        {
            [key: string]: string;
        },
    ];
    transformations?: [
        {
            type: string;
            parameters?: Array<any>;
            when?: {
                fileName?: string;
            };
        },
    ];
    triggerOutsideStrings?: boolean;
    disableUpOneFolder?: boolean;
    enableFolderTrailingSlash?: boolean;
    pathSeparators?: string;
    homeDirectory?: string;
    workspaceFolderPath?: string;
    workspaceRootPath?: string;
    useBackslash?: boolean;
    ignoredFilesPattern?: string;
    ignoredPrefixes?: Array<string>;
}

export default class PathConfiguration {
    readonly data: PathConfigurationValues;

    constructor() {
        this.data = {};
    }

    update(fileUri?: vs.Uri) {
        const codeConfiguration = vs.workspace.getConfiguration(
            'path-autocomplete',
            fileUri || null,
        );

        this.data.withExtension = codeConfiguration.get('includeExtension');
        this.data.withExtensionOnImport = codeConfiguration.get('extensionOnImport');
        this.data.excludedItems = codeConfiguration.get('excludedItems');
        this.data.pathMappings = codeConfiguration.get('pathMappings');
        this.data.pathSeparators = codeConfiguration.get('pathSeparators');
        this.data.transformations = codeConfiguration.get('transformations');
        this.data.triggerOutsideStrings = codeConfiguration.get('triggerOutsideStrings');
        this.data.disableUpOneFolder = codeConfiguration.get('disableUpOneFolder');
        this.data.useBackslash = codeConfiguration.get('useBackslash');
        this.data.enableFolderTrailingSlash = codeConfiguration.get('enableFolderTrailingSlash');
        this.data.ignoredFilesPattern = codeConfiguration.get('ignoredFilesPattern');
        this.data.ignoredPrefixes = codeConfiguration.get('ignoredPrefixes');
        this.data.homeDirectory = process.env[process.platform == 'win32' ? 'USERPROFILE' : 'HOME'];

        const workspaceRootFolder = vs.workspace.workspaceFolders
            ? vs.workspace.workspaceFolders[0]
            : null;
        let workspaceFolder = workspaceRootFolder;

        if (fileUri) {
            workspaceFolder = vs.workspace.getWorkspaceFolder(fileUri);
        }

        this.data.workspaceFolderPath = workspaceFolder && workspaceFolder.uri.fsPath;
        this.data.workspaceRootPath = workspaceRootFolder && workspaceRootFolder.uri.fsPath;
    }
}
