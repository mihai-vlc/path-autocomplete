# Path Autocomplete Change Log

#### 1.22.0

- Removes the need for the trailing slash in the path mappings folders. Fixes #111
- Removes dependency on the native path and process node modules
- Adds support for the relativeFileDirname variable in the path mappings. Fixes #94

#### 1.21.0

- Adds support for the `useSingleBackslash` preference. Fixes #57
- Implements the auto detection of the `useBackslash` flag, fixes #112
- Updates the activation events to use `onStartupFinished`, fixes #114

#### 1.20.1

- Normalizes the path when using the VS Code for Web from Windows

#### 1.20.0

- Adds support for VS Code for Web

#### 1.19.1

- Fixes the extension loading on remote ssh #108

#### 1.19.0

- Updates the completion label to be consistent with insertText
- Fix: asar file is recogonized as directory
- Upgrade dependencies

#### 1.18.0

1. integrate some useful front end tools: eslint, prettier
2. optimize dotfiles, settings.json, launch.json
3. fix #100
4. remove npm package suggestion because VSCode has builtin support
5. code style and performance optimizations

#### 1.17.0

Adds support for partial paths.
Previously the completions were only generated if the path inserted by the user
was a valid folder on the disk.  
Starting with this version partial paths are suppored as well.
Examples:

```
./tmp/folder1/   -- generates suggetions
./tmp/fol        -- generates suggetions for ./tmp/ and filters out items that don't start with fol
```

This feature fixes: #87

#### 1.16.0

Added new option `path-autocomplete.disableUpOneFolder`. Fixes #89
By default it's set to `true`.

#### 1.15.0

Added new rules for the excludedItems option.
Stating with this version we can now do things like:

```
"path-autocomplete.excludedItems": {
    "**": { "when": "**", "isDir": true }, // always ignore `folder` suggestions
    "**/*.js": { "when": "**", "context": "import.*" }, // ignore .js file suggestions in all files when the current line matches the regex from the `context`
}
```

#### 1.14.0

Added new option `path-autocomplete.ignoredPrefixes`. Fixes #81

#### 1.13.6

Moved the change log from the readme file to the `CHANGELOG.md` file.

#### 1.13.5

resolve #72 - include `require` in the "extensionOnImport" preference

#### 1.13.3

Fixes the completion items for json files. Fixes #47

#### 1.13.2

Fixes the mapping conflict with the node modules. Fixes #30.

#### 1.13.1

Fixes the mapping of keys with the same prefix.

#### 1.13.0

Adds the `path-autocomplete.ignoredFilesPattern` option to disable the extension on certain file types.  
Example configuration:

```
    "path-autocomplete.ignoredFilesPattern": "**/*.{css,scss}"
```

#### 1.12.0

Adds the `path-autocomplete.useBackslash` option to enable the use of `\\` for windows paths.

#### 1.11.0

Adds the `path-autocomplete.pathSeparators` option to control the separators when
inserting the path outside strings.

#### 1.10.0

- Updates the behavior of `extensionOnImport` to be taken into account only on import statements line.
- Adds the `path-autocomplete.includeExtension` option to control the extension on standard paths. (#45)
- Fixes the completion kind for folders and files (#43)
- Adds support for merging multiple folders in the path mappings configuration

```
"path-autocomplete.pathMappings": {
    "$root": ["${folder}/p1/src", "${folder}/p2/src"]
}
```

#### 1.9.0

- Adds `{` and `[` as separators for the current path

#### 1.8.1

- Fixes the handing of the path outside strings for markdown links `[](./)`

#### 1.8.0

- Added support for multi root vscode folders via the `${folder}` variable in pathMappings

#### 1.7.0

- Adds support for redefining the root folder via the pathMappings with the `$root`
  special key.

#### 1.6.0

- Adds the `path-autocomplete.enableFolderTrailingSlash` option

#### 1.5.0

- Adds support for path autocomplete outside strings.
  Available via `path-autocomplete.triggerOutsideStrings`
- Improves the support for node_modules lookup. #15

#### 1.4.0

- Adds support for custom transformation

#### 1.3.0

- Adds support for custom user mappings

#### 1.2.1

- Fixes the extension trimming for folders. Fixes #6

#### 1.2.0

- Adds support for the trailing slash functionality. Fixes #5
- Adds support for path autocomplete inside backticks. Fixes #3

#### 1.1.0

- Added option to exclude files

#### 1.0.2

- Initial release
