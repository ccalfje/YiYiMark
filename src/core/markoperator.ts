import * as markdata from './markdata';
import * as vscode from 'vscode';
import { pathToFileURL } from 'url';
import * as fs from 'fs';
import * as dataprovider from './dataprovider';

export enum OperErrorType {
    reduplicateName,
    noCurrentLine
}

export interface OperResult {
    result: boolean,
    errorType?: OperErrorType
}

function refreshNode(parentNode: markdata.MarkData, provider: dataprovider.MarkDataProvider) {
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

function getParentGroup(node: markdata.MarkData, provider: dataprovider.MarkDataProvider): markdata.MarkData {
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

function getProjectPath() {
    if (typeof (vscode.workspace.workspaceFolders) === 'undefined') {
        return "";
    }

    let workspaceFolders = vscode.workspace.workspaceFolders.map(item => item.uri.fsPath);
    if (workspaceFolders.length === 1) {
        return workspaceFolders[0];
    } else {
        return "";
    }
}

let gMDate : Date | null = null;

function getSavedModifyDate() {
    return gMDate;
}

function setSavedModifyDate(date : Date | null) {
    gMDate = date;
}

function getConfigPath() : string {
    let config = vscode.workspace.getConfiguration("catmark");
    return config.DataSaveFilePath;
}

function getAutoSaveConfig() : boolean {
    let config = vscode.workspace.getConfiguration("catmark");
    return config.AutoSave;
}

function getAutoReadConfig() : boolean {
    let config = vscode.workspace.getConfiguration("catmark");
    return config.AutoReadChange;
}

enum SavePathResType {
    ok,
    getProjectPathFailed,
    pathInvalid,
    pathNotExist
}

interface SavePathResult {
    result : SavePathResType,
    resPath : string,
}

function getFileModifyDate(path : string) {
    try {
        let stat = fs.statSync(path);
        if (stat.isFile()) {
            return stat.mtime;
        }
    } catch {
        console.log(__filename, "getFileModifyData", "save path does not exist. catch error");
        return null;
    }
    return null;
}

function getSavePath() : SavePathResult {
    let path = getConfigPath();
    if (path === "") {
        let proPath = getProjectPath();
        if (proPath === "") {
            console.log(__filename, "get project path failed");
            return { result : SavePathResType.getProjectPathFailed, resPath: path};
        } else {
            return { result : SavePathResType.ok, resPath: proPath + "\\.vscode\\markData.json"};
        }
    } else {
        let exist = fs.existsSync(path);
        if (exist) {
            try {
                let stat = fs.statSync(path);
                if (stat.isDirectory()) {
                    return { result : SavePathResType.ok, resPath: path + "\\markData.json"};
                } else if (stat.isFile()) {
                    return { result : SavePathResType.ok, resPath: path };
                } else {
                    console.log(__filename, "save path is invalid type");
                    return { result : SavePathResType.pathInvalid, resPath: path };
                }
            } catch {
                console.log(__filename, "save path does not exist. catch error");
                return { result : SavePathResType.pathNotExist, resPath: path };
            }
        } else {
            console.log(__filename, "save path does not exist");
            return { result : SavePathResType.pathNotExist, resPath: path };
        }
    }
}

function saveData(root: markdata.MarkData, showInfo : boolean) {
    let savePathRes = getSavePath();
    if (savePathRes.result === SavePathResType.ok) {
        // 更新时间戳
        setSavedModifyDate(getFileModifyDate(savePathRes.resPath));
        markdata.saveTreeToFile(savePathRes.resPath, root);
        return;
    } else {
        if (showInfo) {
            switch (savePathRes.result) {
                case SavePathResType.getProjectPathFailed:
                    vscode.window.showInformationMessage(`Save data failed : Can not get this project path!`);
                    break;
                case SavePathResType.pathInvalid:
                    vscode.window.showInformationMessage(`Save data failed : The path "${savePathRes.resPath}" is invalid.`);
                    break;
                case SavePathResType.pathNotExist:
                    vscode.window.showInformationMessage(`Save data failed : The path "${savePathRes.resPath}" does not exist.`);
                    break;
            }
        }
    }
}

/*
读文件时机：
1.插件加载时
2.焦点切换回来的时候，如果文件有变化，需要重新读取
3.打开工程时，如果保存目录是相对目录，也需要重新加载
*/
export function readData(showInfo : boolean) : markdata.MarkData | null {
    let savePathRes = getSavePath();
    if (savePathRes.result === SavePathResType.ok) {
        // 更新时间戳
        setSavedModifyDate(getFileModifyDate(savePathRes.resPath));
        return markdata.readTreeFromFile(savePathRes.resPath);
    } else {
        if (showInfo) {
            switch (savePathRes.result) {
                case SavePathResType.getProjectPathFailed:
                    vscode.window.showInformationMessage(`Read data failed : Can not get this project path!`);
                    break;
                case SavePathResType.pathInvalid:
                    vscode.window.showInformationMessage(`Read data failed : The path "${savePathRes.resPath}" is invalid.`);
                    break;
                case SavePathResType.pathNotExist:
                    vscode.window.showInformationMessage(`Read data failed : The path "${savePathRes.resPath}" does not exist.`);
                    break;
            }
        }
        return null;
    }
}

export function markCurrentLine(newNode: markdata.MarkData, selectedNode: markdata.MarkData): OperResult {
    let provider = dataprovider.getDataProvider();
    let parentNode = getParentGroup(selectedNode, provider);
    parentNode.addChild(newNode);
    refreshNode(parentNode, provider);
    if (getAutoSaveConfig()) {
        saveData(provider.getRootNode(), true);
    }
    return { result: true };
}

export function deleteNode(node: markdata.MarkData) {
    let provider = dataprovider.getDataProvider();
    if (!node) {
        return;
    }
    let parent = node.getParent();
    if (parent) {
        parent.deleteChild(node);
        refreshNode(parent as markdata.MarkData, provider);
        if (getAutoSaveConfig()) {
            saveData(provider.getRootNode(), true);
        }
    }
}

export function createGroup(node: markdata.MarkData, groupName: string): OperResult {
    let provider = dataprovider.getDataProvider();
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

    let parentNode = getParentGroup(node, provider);
    if (!checkName(parentNode, groupName)) {
        return { result: false, errorType: OperErrorType.reduplicateName };
    }

    let newGroupNode = markdata.createGroupMarkData(groupName);
    parentNode.addChild(newGroupNode);

    refreshNode(parentNode, provider);
    if (getAutoSaveConfig()) {
        saveData(provider.getRootNode(), true);
    }
    return { result: true };
}

// 跳转到书签记录的位置
export async function moveToNodeLoc(node: markdata.MarkData) {
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
    moveToNodeLoc(node.selection[0]);
}

async function getInputBoolean(promptStr : string) : Promise<boolean> {
    let validateFun = (value : string)=> {
        if (value !== 'y' && value !== 'n') {
            return "y/n";
        } else {
            return null;
        }
    };

    let value = await vscode.window.showInputBox({placeHolder: "y/n", prompt: promptStr , validateInput : validateFun});
    if (value !== 'y') {
        return false;
    } else {
        return true;
    }
}

export async function onWindowActive(state: vscode.WindowState) {
    console.log("state in:", state);
    let res = getSavePath();
    if (res.result !== SavePathResType.ok) {
        console.log("onWindowActive", "get save path failed.");
        return;
    }
    let mDate = getFileModifyDate(res.resPath);
    if (mDate) {
        let savedMDate = getSavedModifyDate();
        if (!savedMDate) {
            console.log("onWindowActive ", "error : get save date failed.");
            return;
        }
        // 数据文件比现有数据更新，需要考虑重新读取数据
        if (mDate > savedMDate) {
            let promptStr = `File "${res.resPath} has bend modified, reload now?(y/n)`;
            if (getAutoReadConfig() || await getInputBoolean(promptStr)) {
                let root = readData(true);
                if (root) {
                    dataprovider.getDataProvider().setRootNode(root);
                }
            } 
        }
    }
}

export function onChangeWorkspaceFolders(event : vscode.WorkspaceFoldersChangeEvent) {
    let root = readData(true);
    dataprovider.getDataProvider().setRootNode(root);
    console.log("workspace changed:", event);
}
