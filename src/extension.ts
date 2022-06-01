// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as dataprovider from './core/dataprovider';
import * as markoperator from './core/markoperator';
import * as markdata from './core/markdata';
import * as fzfsearch from './core/fzfSearch';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "yiyimark" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json

    // 注册焦点切换事件
    vscode.window.onDidChangeWindowState(markoperator.onWindowActive);
    // 注册工程切换事件
    vscode.workspace.onDidChangeWorkspaceFolders(markoperator.onChangeWorkspaceFolders);
    // 注册配置更改事件
    vscode.workspace.onDidChangeConfiguration(markoperator.onChangeConfiguration);

    let treeView = vscode.window.createTreeView('yiyi-markview', {
        treeDataProvider: dataprovider.getDataProvider(),
        showCollapseAll: true,
        dragAndDropController: markoperator.getDragController()
    });

    treeView.onDidChangeSelection(markoperator.onTreeViewSelectionChanged);

    context.subscriptions.push(vscode.commands.registerCommand('yiyimark.markCurrentLine', (uri: vscode.Uri) => {
        let select = vscode.window.activeTextEditor?.selection;
        if (select === undefined) {
            console.log("[yiyimark] markCurrentLine : undefined select");
            return;
        }
        let currentline = select.active.line;
        uri = uri || vscode.window.activeTextEditor?.document.uri;
        if (!uri) {
            console.log("[yiyimark] markCurrentLine : undefinded uri");
            return;
        }

        let relativePath = vscode.workspace.asRelativePath(uri);

        vscode.window.showInputBox({ title: "Please enter a mark name." }).then((value: string | undefined) => {
            if (value !== undefined) {
                let newNode = markdata.createFileMarkData(value, "null", relativePath, currentline);
                markoperator.markCurrentLine(newNode, treeView.selection[0]);
            }
        });
    }));


    context.subscriptions.push(vscode.commands.registerCommand('yiyimark.deleteNode', (node: markdata.MarkData) => {
        node = node || treeView.selection[0];
        if (!node) {
            vscode.window.showInformationMessage(`Please select a node first.`);
            return;
        }
        if (node.getMarkType() === markdata.MarkType.group) {
            markoperator.getInputBoolean("This is a group. Are you sure want to delete?").then((value : boolean) => {
                if (value) {
                    markoperator.deleteNode(node);
                }
            });
        } else {
            markoperator.deleteNode(node);
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('yiyimark.editNode', (node: markdata.MarkData) => {
        node = node || treeView.selection[0];
        if (!node) {
            vscode.window.showInformationMessage(`Please select a node first.`);
            return;
        }
        markoperator.editNode(node);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('yiyimark.moveup', (node: markdata.MarkData) => {
        node = node || treeView.selection[0];
        if (!node) {
            vscode.window.showInformationMessage(`Please select a node first.`);
            return;
        }
        markoperator.moveUpNode(node);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('yiyimark.movedown', (node: markdata.MarkData) => {
        node = node || treeView.selection[0];
        if (!node) {
            vscode.window.showInformationMessage(`Please select a node first.`);
            return;
        }
        markoperator.moveDownNode(node);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('yiyimark.moveleft', (node: markdata.MarkData) => {
        node = node || treeView.selection[0];
        if (!node) {
            vscode.window.showInformationMessage(`Please select a node first.`);
            return;
        }
        markoperator.moveLeftNode(node);
    }));


    context.subscriptions.push(vscode.commands.registerCommand('yiyimark.moveright', (node: markdata.MarkData) => {
        node = node || treeView.selection[0];
        if (!node) {
            vscode.window.showInformationMessage(`Please select a node first.`);
            return;
        }
        markoperator.moveRightNode(node);
    }));


    context.subscriptions.push(vscode.commands.registerCommand('yiyimark.createGroup', (node: markdata.MarkData) => {
        vscode.window.showInputBox({ title: "Please enter a group name." }).then((value: string | undefined) => {
            if (value) {
                markoperator.createGroup(node, value);
            }
        });
    }));

    context.subscriptions.push(vscode.commands.registerCommand('yiyimark.refresh', () => {
        markoperator.reloadData(true);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('yiyimark.nextNode', () => {
        let selectedNode = treeView.selection[0];
        if (selectedNode) {
            treeView.reveal(markoperator.getNextNodeInGroup(selectedNode) , {select : true, focus : true});
        } else {
            let rootChildren = dataprovider.getDataProvider().getRootNode().getChildren();
            if (rootChildren.length > 0) {
                treeView.reveal(markoperator.getNextNodeInGroup(rootChildren[0] as markdata.MarkData) , {select : true, focus : true});
            }
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('yiyimark.previousNode', () => {
        let selectedNode = treeView.selection[0];
        if (selectedNode) {
            treeView.reveal(markoperator.getPreivousNodeInGroup(selectedNode) , {select : true, focus : true});
        } else {
            let rootChildren = dataprovider.getDataProvider().getRootNode().getChildren();
            if (rootChildren.length > 0) {
                treeView.reveal(markoperator.getPreivousNodeInGroup(rootChildren[0] as markdata.MarkData) , {select : true, focus : true});
            }
        }
    }));

    let fzfUI = new fzfsearch.FzfSearch((e: vscode.QuickPickItem) => {
        let realE = e as fzfsearch.MarkDataPickItem;
        treeView.reveal(realE.markdata, {select : true, focus : true});
    });

    context.subscriptions.push(vscode.commands.registerCommand('yiyimark.search', () => {
        vscode.commands.executeCommand("workbench.view.extension.yiyi-mark").then(()=>{
            fzfUI.fzfInit(dataprovider.getDataProvider().getNodeList());
            fzfUI.getSearchResFormUI();
        });
    }));

    markoperator.reloadData(true);
}


// this method is called when your extension is deactivated
export function deactivate() { }
