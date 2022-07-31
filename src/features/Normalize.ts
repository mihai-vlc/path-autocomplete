import os from 'os';
const normalize = require('normalize-path');

export function normalizeForBrowser(filePath) {
    // we only need to do the normalization if we are in a browser environment
    if (os.platform().indexOf('browser') === -1) {
        return filePath;
    }

    return normalize(filePath);
}
