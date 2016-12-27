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
        "/": "${workspace}/src" // the root folder is now /src
    }
    ```

    Available variables:
    - `${workspace}` - the vscode workspace root folder
    - `${home}` - the user home directory

## Release notes

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
