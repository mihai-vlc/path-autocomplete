import path from 'path';
import fs from 'fs';

export class FileInfo {
    private type: string;
    private name: string;
    private itemPath: string;

    /**
     * Extracts the needed information about the provider file path.
     * 
     * @throws Error if the path is invalid or you don't have permissions to it
     */
    constructor(itemPath:string) {

        this.itemPath = itemPath;
        this.type = fs.statSync(itemPath).isDirectory() ? 'dir' : 'file';
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
