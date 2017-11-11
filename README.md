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

## Installation
You can install it from the [marketplace](https://marketplace.visualstudio.com/items?itemName=ionutvmi.path-autocomplete).
`ext install path-autocomplete`

## Options
- `path-autocomplete.extensionOnImport` - boolean If true it will append the extension as well when inserting the file name
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
        "/test": "${workspace}/src/Actions/test", // alias for /test
        "/": "${workspace}/src", // the absolute root folder is now /src,
        "$root": ${workspace}/src // the relative root folder is now /src
    }
    ```

    Available variables:
    - `${workspace}` - the vscode workspace root folder
    - `${home}` - the user home directory
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

## Tips

- `./` for relative paths

    If `./` doesn't work properly, add this to `keybindings.json`: `{ "key": ".", "command": "" }`. Refer to https://github.com/ChristianKohler/PathIntellisense/issues/9


## Release notes

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
