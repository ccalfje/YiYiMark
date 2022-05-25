import * as markdata from './markdata';
import * as vscode from 'vscode';

export enum OperErrorType {
    reduplicateName,
    noCurrentLine
}

export interface OperResult {
    result: boolean,
    errorType?: OperErrorType
}

function refreshNode(parentNode: markdata.MarkData, provider: markdata.MarkDataProvider) {
    if (parentNode) {
        let grandParent = parentNode.getParent();
        if (grandParent) {
            provider.refreshNode(parentNode);
        } else {
            // 根节点
            provider.refresh();
        }
    }
}

function getParenGroup(node: markdata.MarkData, provider: markdata.MarkDataProvider): markdata.MarkData {
    let parentNode: markdata.MarkData;
    if (!node) {
        parentNode = provider.getRootNode();
    } else if (node.getMarkType() === markdata.MarkType.group) {
        parentNode = node;
    } else {
        parentNode = node.getParent() as markdata.MarkData;
    }
    return parentNode;
}

export function markCurrentLine(newNode: markdata.MarkData, selectedNode: markdata.MarkData, provider: markdata.MarkDataProvider): OperResult {
    let parentNode = getParenGroup(selectedNode, provider);
    parentNode.addChild(newNode);
    refreshNode(parentNode, provider);
    return { result: true };
}

export function deleteNode(node: markdata.MarkData, provider: markdata.MarkDataProvider) {
    if (!node) {
        return;
    }
    let parent = node.getParent();
    if (parent) {
        parent.deleteChild(node);
        refreshNode(parent as markdata.MarkData, provider);
    }
}

export function createGroup(node: markdata.MarkData, provider: markdata.MarkDataProvider, groupName: string): OperResult {
    let checkName = function (node: markdata.MarkData, name: string) {
        let children = node.getChildren();
        if (children.length === 0) {
            return true;
        }
        for (const child of children) {
            let childNode = child as markdata.MarkData;
            if (childNode.getMarkType() === markdata.MarkType.group && childNode.getName() === name) {
                return false;
            }
        }
        return true;

    };

    let parentNode = getParenGroup(node, provider);
    if (!checkName(parentNode, groupName)) {
        return { result: false, errorType: OperErrorType.reduplicateName };
    }

    let newGroupNode = markdata.createGroupMarkData(groupName);
    parentNode.addChild(newGroupNode);

    refreshNode(parentNode, provider);
    return { result: true };
}

export async function moveToNode(node: markdata.MarkData) {
    if (!node) {
        return;
    }
    if (node.getMarkType() !== markdata.MarkType.file) {
        return;
    }
    let reviewType: vscode.TextEditorRevealType = vscode.TextEditorRevealType.InCenterIfOutsideViewport;

    let line = node.getLineNum();
    const newSelection = new vscode.Selection(line, 0, line, 0);

    let textEdit = await vscode.window.showTextDocument(vscode.Uri.file(node.getFilePath()));

    textEdit.selection = newSelection;
    textEdit.revealRange(newSelection, reviewType);
}

export function onTreeViewSelectionChanged(node: vscode.TreeViewSelectionChangeEvent<markdata.MarkData>) {
    moveToNode(node.selection[0]);
}
