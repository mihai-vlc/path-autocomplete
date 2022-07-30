import vs from 'vscode';

export async function pathExists(localPath: string): Promise<boolean> {
    try {
        await vs.workspace.fs.stat(vs.Uri.file(localPath));
        return true;
    } catch (e) {
        return false;
    }
}

export async function isDirectory(filePath: string): Promise<boolean> {
    try {
        const stat = await vs.workspace.fs.stat(vs.Uri.file(filePath));
        return stat.type === vs.FileType.Directory;
    } catch (e) {
        return false;
    }
}

export async function readDirectory(filePath: string) {
    return vs.workspace.fs.readDirectory(vs.Uri.file(filePath));
}
