# Path Autocomplete for Visual Studio Code
Provides path completion for visual studio code.  

<img src="https://raw.githubusercontent.com/ionutvmi/path-autocomplete/master/demo/path-autocomplete.gif" alt="demo gif" />

## Features
- it supports relative paths (starting with ./)
- it supports absolute path to the workspace (starting with /)
- it supports absolute path to the file system (starts with: C:)
- it supports paths relative to the user folder (starts with ~)
- it supports items exclusions via the `path-autocomplete.excludedItems` option
- it supports npm packages (starting with a-z and not relative to disk)
- it supports automatic suggestion after selecting a folder
- it supports custom mappings via the `path-autocomplete.pathMappings` option
- it supports custom transformations to the inserted text via the `path-autocomplete.transformations`
- it supports windows paths with the `path-autocomplete.useBackslash`

## Installation
You can install it from the [marketplace](https://marketplace.visualstudio.com/items?itemName=ionutvmi.path-autocomplete).
`ext install path-autocomplete`

## Options
- `path-autocomplete.extensionOnImport` - boolean If true it will append the extension as well when inserting the file name on `import` or `require` statements.
- `path-autocomplete.includeExtension` - boolean If true it will append the extension as well when inserting the file name.
- `path-autocomplete.excludedItems`  
    This option allows you to exclude certain files from the suggestions.  
    ```
    "path-autocomplete.excludedItems": {
        "**/*.js": { "when": "**/*.ts" }, // ignore js files if i'm inside a ts file
        "**/*.map": { "when": "**" }, // always ignore *.map files
        "**/{.git,node_modules}": { "when": "**" } // always ignore .git and node_modules folders
    }
    ```
    
    [minimatch](https://www.npmjs.com/package/minimatch) is used to check if the files match the pattern.
- `path-autocomplete.pathMappings`  
    Useful for defining aliases for absolute or relative paths.
    ```
    "path-autocomplete.pathMappings": {
        "/test": "${folder}/src/Actions/test", // alias for /test
        "/": "${folder}/src", // the absolute root folder is now /src,
        "$root": ${folder}/src // the relative root folder is now /src
        // or multiple folders for one mapping
        "$root": ["${folder}/p1/src", "${folder}/p2/src"] // the root is now relative to both p1/src and p2/src
    }
    ```

- `path-autocomplete.pathSeparators` - string Lists the separators used for extracting the inserted path when used outside strings.
The default value is: ` \t({[`

- `path-autocomplete.transformations`
    List of custom transformation applied to the inserted text.  
    Example: replace `_` with an empty string when selecting a SCSS partial file. 
    ```
    "path-autocomplete.transformations": [{
        "type": "replace",
        "parameters": ["^_", ""],
        "when": {
            "fileName": "\\.scss$"
        }
    }],
    ```

    Supported transformation:
    - `replace` - Performs a string replace on the selected item text.  
        Parameters:  
        - `regex` - a regex pattern
        - `replaceString` - the replacement string
- `path-autocomplete.triggerOutsideStrings` boolean - if true it will trigger the autocomplete outside of quotes
- `path-autocomplete.enableFolderTrailingSlash` boolean - if true it will add a slash after the insertion of a folder path that will trigger the autocompletion.
- `path-autocomplete.useBackslash` boolean - if true it will use `\\` when iserting the paths.
- `path-autocomplete.ignoredFilesPattern` - string - Glob patterns for disabling the path completion in the specified file types. Example: "**/*.{css,scss}"

## Configure VSCode to recognize path aliases

VSCode doesn't automatically recognize path aliases so you cannot <kbd>alt</kbd>+<kbd>click</kbd> to open files. To fix this you need to create `jsconfig.json` or `tsconfig.json` to the root of your project and define your alises. An example configuration:

```
{
  "compilerOptions": {
    "target": "esnext", // define to your liking
    "baseUrl": "./",
    "paths": {
      "test/*": ["src/actions/test"],
      "assets/*" ["src/assets"]
    }
  },
  "exclude": ["node_modules"] // Optional
}
```

## Tips
- if you want to use this in markdown or simple text files you need to enable `path-autocomplete.triggerOutsideStrings`

- `./` for relative paths
> If `./` doesn't work properly, add this to `keybindings.json`: `{ "key": ".", "command": "" }`. Refer to https://github.com/ChristianKohler/PathIntellisense/issues/9

- When I use aliases I can't jump to imported file on Ctrl + Click
> This is controlled by the compiler options in jsconfig.json. You can create the JSON file in your project root and add paths for your aliases.  
> jsconfig.json Reference  
> https://code.visualstudio.com/docs/languages/jsconfig#_using-webpack-aliases
- if you have issues with duplicate suggestions please use the `path-autocomplete.ignoredFilesPatter` option to disable the path autocomplete in certain file types

## Release notes

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

## Author
Mihai Ionut Vilcu
 
+ [github/ionutvmi](https://github.com/ionutvmi)
+ [twitter/ionutvmi](http://twitter.com/ionutvmi)

## Credits
This extension is based on [path-intellisense](https://marketplace.visualstudio.com/items?itemName=christian-kohler.path-intellisense)
