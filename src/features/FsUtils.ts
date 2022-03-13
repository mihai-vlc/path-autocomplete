import fs from 'fs';
import fsAsync from 'fs/promises';

export function pathExists(localPath: string) {
    return fsAsync
        .access(localPath, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);
}

const originalFs = getFsModule();

export async function isDirectory(filePath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        originalFs.stat(filePath, (err, statInfo) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(statInfo.isDirectory());
        });
    });
}

function getFsModule() {
    try {
        // throws an error if module is not found (remote ssh environment)
        require.resolve("original-fs");

        // using original-fs rather than fs to deal with .asar file
        // ref: https://github.com/microsoft/vscode/issues/143393#issuecomment-1047518447
        return require('original-fs') as typeof fs;
    } catch (e) {
        console.log("original-fs not found, falling back to the default fs module");
        return fs;
    }
}
