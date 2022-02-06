// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as testdata from './core/testdata';
import * as markoperator from  './core/markoperator';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "catmark" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('catmark.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
    });

    context.subscriptions.push(vscode.commands.registerCommand('catmark.markCurrentLine', (uri : vscode.Uri) => {
        vscode.window.showInformationMessage(`当前文件(夹)路径是：${uri ? uri.path : '空'}`);
        let res = markoperator.markCurrentLine(uri);
        if (res) {
            testdata.root.addChild(res);
            testdata.provider.refresh();
        }
    }));
    
    vscode.window.createTreeView('cat-markview', {
        treeDataProvider: testdata.provider
    });

		// Display a message box to the user	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

type Bookmarks = {
  [bookmarkKey: string]: {
    line: number
  }
};

let bookmarksManager = {
  bookmarks: {} as { [key: string]: any | Bookmarks },
  filePath: '' as string | undefined,

  getBookmarks(key: string | null = null) {
    if (this.filePath) {
      if (!this.bookmarks[this.filePath]) {
        this.bookmarks[this.filePath] = {};
      }
      return key ? this.bookmarks[this.filePath][key] : this.bookmarks[this.filePath];
    }
  },
  setBookmarks(key: string | null = null, value: Bookmarks | null = null, deleteKey: boolean = false) {
    if (this.filePath) {
      if (!this.bookmarks[this.filePath]) {
        this.bookmarks[this.filePath] = {};
      }

      if (key) {
        this.bookmarks[this.filePath][key] = value;
      } else {
        this.bookmarks[this.filePath] = {};
      }
    }
  },

};