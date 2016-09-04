import * as path from 'path';
import * as fs from 'fs';

const loc = '';

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

    getName() {
        return this.name;
    }
}
