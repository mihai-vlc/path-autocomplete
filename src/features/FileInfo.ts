import path from 'path';
import fs from 'fs';

type FileType = 'dir' | 'file';

export class FileInfo {
    private type: FileType;
    private name: string;
    private itemPath: string;

    /**
     * Extracts the needed information about the provider file path.
     *
     * @throws Error if the path is invalid or you don't have permissions to it
     */
    constructor(itemPath: string, type?: FileType) {
        this.itemPath = itemPath;
        this.type = type ?? (fs.statSync(itemPath).isDirectory() ? 'dir' : 'file');
        this.name = path.basename(itemPath);
    }

    isDirectory(): boolean {
        return this.type == 'dir';
    }

    getPath() {
        return this.itemPath;
    }

    getName() {
        return this.name;
    }
}
