import fs from 'fs';
import fsAsync from 'fs/promises';
import path from 'path';

export function pathExists(localPath: string) {
    return fsAsync
        .access(localPath, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);
}

// using original-fs rather than fs to deal with .asar file
// ref: https://github.com/microsoft/vscode/issues/143393#issuecomment-1047518447
const originalFs = require('original-fs') as typeof fs;
export async function isDirectory(filePath: string): Promise<boolean> {
    const ext = path.extname(filePath);
    return new Promise((resolve, reject) => {
        originalFs.stat(filePath, (err, statInfo) => {
            if (err) reject(err);
            resolve(statInfo.isDirectory());
        });
    });
}
