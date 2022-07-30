import { basename } from 'path';
export type FileType = 'dir' | 'file';

export class FileInfo {
    private type: FileType;
    name: string;
    path: string;

    /**
     * Extracts the needed information about the provider file path.
     *
     * @throws Error if the path is invalid or you don't have permissions to it
     */
    constructor(path: string, type: FileType) {
        this.name = basename(path);
        this.path = path;
        this.type = type;
    }

    get isDirectory() {
        return this.type === 'dir';
    }
}
