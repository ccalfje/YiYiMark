// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as dataprovider from './core/dataprovider';
import * as markoperator from './core/markoperator';
import * as markdata from './core/markdata';
import * as fzfsearch from './core/fzfSearch';
import * as yiyiview from './core/yiyiview';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "yiyimark" is now active!');

    let view = new yiyiview.YiYiView();
    let treeView = view.getTreeView(); 

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

    context.subscriptions.push(vscode.commands.registerCommand('yiyimark.opengroup', (node: markdata.MarkData) => {
        node = node || treeView.selection[0];
        if (!node) {
            vscode.window.showInformationMessage(`Please select a node first.`);
            return;
        }
        markoperator.openGroup(node);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('yiyimark.export', (node: markdata.MarkData) => {
        node = node || treeView.selection[0] || dataprovider.getDataProvider().getRootNode();
        if (!node) {
            return;
        }
        markoperator.exportNode(node);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('yiyimark.import', (node: markdata.MarkData) => {
        node = node || treeView.selection[0] || dataprovider.getDataProvider().getRootNode();
        if (!node) {
            return;
        }
        markoperator.importNode(node);
    }));

    markoperator.reloadData(true);
    view.renderAllNodeLines();
}


// this method is called when your extension is deactivated
export function deactivate() { }
