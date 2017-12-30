import * as vs from 'vscode';

interface PathConfigurationValues {
    withExtension?: boolean,
    excludedItems?: [{
        [key: string]: {
            when: string
        }
    }],
    pathMappings?: [{
        [key: string]: string
    }],
    transformations?: [{
        type: string,
        parameters?: Array<any>,
        when?: {
            fileName?: string
        }
    }],
    triggerOutsideStrings?: boolean,
    enableFolderTrailingSlash?: boolean,
    homeDirectory?: string,
    workspaceFolderPath?: string,
    workspaceRootPath?: string
}

export default class PathConfiguration {
    readonly data: PathConfigurationValues;

    constructor() {
        this.data = {};
    }

    update(fileUri?: vs.Uri) {
        var codeConfiguration = vs.workspace.getConfiguration('path-autocomplete', fileUri || null);

        this.data.withExtension = codeConfiguration.get('extensionOnImport');
        this.data.excludedItems = codeConfiguration.get('excludedItems');
        this.data.pathMappings = codeConfiguration.get('pathMappings');
        this.data.transformations = codeConfiguration.get('transformations');
        this.data.triggerOutsideStrings = codeConfiguration.get('triggerOutsideStrings');
        this.data.enableFolderTrailingSlash = codeConfiguration.get('enableFolderTrailingSlash');
        this.data.homeDirectory = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];

        var workspaceRootFolder = vs.workspace.workspaceFolders ? vs.workspace.workspaceFolders[0] : null;
        var workspaceFolder = workspaceRootFolder;

        if (fileUri) {
            workspaceFolder = vs.workspace.getWorkspaceFolder(fileUri);
        }

        this.data.workspaceFolderPath = workspaceFolder && workspaceFolder.uri.fsPath;
        this.data.workspaceRootPath = workspaceRootFolder && workspaceRootFolder.uri.fsPath;
    }
}

