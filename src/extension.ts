// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as testdata from './core/testdata';
import * as markoperator from './core/markoperator';
import * as markdata from './core/markdata';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "catmark" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    context.subscriptions.push(vscode.commands.registerCommand('catmark.helloWorld', () => {
        // The code you place here will be executed every time your command is executed
    }));

    let treeView = vscode.window.createTreeView('cat-markview', {
        treeDataProvider: testdata.provider,
        showCollapseAll: true
    });

    treeView.onDidChangeSelection(markoperator.onTreeViewSelectionChanged);

    context.subscriptions.push(vscode.commands.registerCommand('catmark.markCurrentLine', (uri: vscode.Uri) => {
        vscode.window.showInformationMessage(`当前文件(夹)路径是：${uri ? uri.path : '空'}`);

        let select = vscode.window.activeTextEditor?.selection;
        if (select === undefined) {
            return;
        }
        let currentline = select.active.line;

        vscode.window.showInputBox({ title: "Please enter a mark name." }).then((value: string | undefined) => {
            if (value !== undefined) {
                let newNode = markdata.createFileMarkData(value, "null", uri.path, currentline);
                markoperator.markCurrentLine(newNode, treeView.selection[0], testdata.provider);
            }
        });
    }));


    context.subscriptions.push(vscode.commands.registerCommand('catmark.deleteNode', (node: markdata.MarkData) => {
        markoperator.deleteNode(node, testdata.provider);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('catmark.createGroup', (node: markdata.MarkData) => {
        vscode.window.showInputBox({ title: "Please enter a group name." }).then((value: string | undefined) => {
            if (value) {
                markoperator.createGroup(node, testdata.provider, value);
            }
        });
    }));

    // Display a message box to the user	});

}


// this method is called when your extension is deactivated
export function deactivate() { }