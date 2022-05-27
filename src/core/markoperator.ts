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

let gMDate: Date | null = null;

function getSavedModifyDate() {
    return gMDate;
}

function setSavedModifyDate(date: Date | null) {
    gMDate = date;
}

function getConfigPath(): string {
    let config = vscode.workspace.getConfiguration("yiyimark");
    return config.DataSaveFilePath;
}

function getAutoSaveConfig(): boolean {
    let config = vscode.workspace.getConfiguration("yiyimark");
    return config.AutoSave;
}

function getAutoReadConfig(): boolean {
    let config = vscode.workspace.getConfiguration("yiyimark");
    return config.AutoReadChange;
}

enum SavePathResType {
    ok,
    getProjectPathFailed,
    pathInvalid,
    pathNotExist
}

interface SavePathResult {
    result: SavePathResType,
    resPath: string,
}

function getFileModifyDate(path: string) {
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

function getSavePath(): SavePathResult {
    let path = getConfigPath();
    if (path === "") {
        let proPath = getProjectPath();
        if (proPath === "") {
            console.log(__filename, "get project path failed");
            return { result: SavePathResType.getProjectPathFailed, resPath: path };
        } else {
            return { result: SavePathResType.ok, resPath: proPath + "\\.vscode\\markData.json" };
        }
    } else {
        let exist = fs.existsSync(path);
        if (exist) {
            try {
                let stat = fs.statSync(path);
                if (stat.isDirectory()) {
                    return { result: SavePathResType.ok, resPath: path + "\\markData.json" };
                } else if (stat.isFile()) {
                    return { result: SavePathResType.ok, resPath: path };
                } else {
                    console.log(__filename, "save path is invalid type");
                    return { result: SavePathResType.pathInvalid, resPath: path };
                }
            } catch {
                console.log(__filename, "save path does not exist. catch error");
                return { result: SavePathResType.pathNotExist, resPath: path };
            }
        } else {
            console.log(__filename, "save path does not exist");
            return { result: SavePathResType.pathNotExist, resPath: path };
        }
    }
}

function saveData(root: markdata.MarkData, showInfo: boolean) {
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

export function saveRoot(showInfo: boolean) {
    if (getAutoSaveConfig()) {
        saveData(dataprovider.getDataProvider().getRootNode(), showInfo);
    }
}


/*
读文件时机：
1.插件加载时
2.焦点切换回来的时候，如果文件有变化，需要重新读取
3.打开工程时，如果保存目录是相对目录，也需要重新加载
4.修改配置的时候
5.在vscode中直接修改了数据文件 to do...
*/
function readData(showInfo: boolean): markdata.MarkData | null {
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

export function reloadData(showInfo: boolean) {
    console.log("reloadData!");
    let resNode = readData(true);
    dataprovider.getDataProvider().setRootNode(resNode);
}

export function markCurrentLine(newNode: markdata.MarkData, selectedNode: markdata.MarkData): OperResult {
    let provider = dataprovider.getDataProvider();
    let parentNode = getParentGroup(selectedNode, provider);
    parentNode.addChild(newNode);
    refreshNode(parentNode, provider);
    saveRoot(true);
    return { result: true };
}

export function deleteNode(node: markdata.MarkData) {
    if (!node) {
        return;
    }
    let provider = dataprovider.getDataProvider();
    let parent = node.getParent();
    if (parent) {
        parent.deleteChild(node);
        refreshNode(parent as markdata.MarkData, provider);
        saveRoot(true);
    }
}

export function editNode(node: markdata.MarkData) {
    if (!node) {
        return;
    }
    vscode.window.showInputBox({ title: "Please enter a mark name.", value:node.getName()}).then((value: string | undefined) => {
        if (value !== undefined) {
            node.setName(value);
            dataprovider.getDataProvider().refreshNode(node);
        }
    });
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
    saveRoot(true);
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

    let filePath = vscode.Uri.file(node.getFilePath()).fsPath;

    let proPath = getProjectPath();
    // 判断是绝对路径还是相对路径
    if (!filePath.includes(proPath)) {
        // 这里的相对路径没办法支持打开多个工程的情况
        filePath = getProjectPath() + filePath;
    }

    try {
        let textEdit = await vscode.window.showTextDocument(vscode.Uri.file(filePath));
        textEdit.selection = newSelection;
        textEdit.revealRange(newSelection, reviewType);
    } catch (error) {
        console.log("moveToNodeLoc:showTextDocument error:", error);
        return;
    }
}

export function onTreeViewSelectionChanged(node: vscode.TreeViewSelectionChangeEvent<markdata.MarkData>) {
    moveToNodeLoc(node.selection[0]);
}

async function getInputBoolean(promptStr: string): Promise<boolean> {
    let validateFun = (value: string) => {
        if (value !== 'y' && value !== 'n') {
            return "y/n";
        } else {
            return null;
        }
    };

    let value = await vscode.window.showInputBox({ placeHolder: "y/n", prompt: promptStr, validateInput: validateFun });
    if (value !== 'y') {
        return false;
    } else {
        return true;
    }
}

export async function onWindowActive(state: vscode.WindowState) {
    console.log("window state in:", state);
    let res = getSavePath();
    if (res.result !== SavePathResType.ok) {
        console.log("onWindowActive", "get save path failed.");
        return;
    }
    let mDate = getFileModifyDate(res.resPath);
    if (!mDate) {
        return;
    }

    let savedMDate = getSavedModifyDate();
    if (!savedMDate) {
        console.log("onWindowActive ", "error : get save date failed.");
        return;
    }
    // 数据文件比现有数据更新，需要考虑重新读取数据
    if (mDate > savedMDate) {
        let newRoot = readData(true);
        // 新旧数据不一致时，才需要更新
        if (newRoot && !markdata.isMarkDataEqual(newRoot, dataprovider.getDataProvider().getRootNode())) {
            let promptStr = `File "${res.resPath} has bend modified, reload now?(y/n)`;
            if (getAutoReadConfig() || await getInputBoolean(promptStr)) {
                if (newRoot) {
                    dataprovider.getDataProvider().setRootNode(newRoot);
                }
            }
        }
    }
}

export function onChangeWorkspaceFolders(event: vscode.WorkspaceFoldersChangeEvent) {
    console.log("workspace changed:", event);
    let root = readData(true);
    dataprovider.getDataProvider().setRootNode(root);
}

export function onChangeConfiguration(event: vscode.ConfigurationChangeEvent) {
    if (event.affectsConfiguration("yiyimark")) {
        console.log("configuration changed:", event);
        let root = readData(true);
        dataprovider.getDataProvider().setRootNode(root);
    }
}

class DragAndDropController implements vscode.TreeDragAndDropController<markdata.MarkData> {
    readonly dropMimeTypes: readonly string[] = ["markdatatype"];
    readonly dragMimeTypes: readonly string[] = ["markdatatype"];
    handleDrag(source: readonly markdata.MarkData[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Thenable<void> | void {
        console.log("darg in");
        if (source.length >= 1) {
            dataTransfer.set("MarkDataType", new vscode.DataTransferItem(source[0].getName()));
            this.dragData = source[0];
        }
        // dataTransfer.set("MarkDataType", new vscode.DataTransferItem(source[0]));
    }

    handleDrop(target: markdata.MarkData | undefined, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Thenable<void> | void {
        console.log("drop in");
        let mimeData = dataTransfer.get("MarkDataType")?.value;
        if (mimeData && this.dragData && this.dragData.getName() === mimeData) {
            if (target) {
                let oldParent = this.dragData.getParent();
                if (oldParent) {
                    if (target.getMarkType() === markdata.MarkType.group) {
                        oldParent.deleteChild(this.dragData);
                        target.addChild(this.dragData);
                        dataprovider.getDataProvider().refresh();
                        this.dragData = null;
                        saveRoot(true);
                    } else {
                        let newParent = target.getParent();
                        if (newParent) {
                            let tarIndex = target.indexOf();
                            if (tarIndex === -1) {
                                return;
                            }
                            oldParent.deleteChild(this.dragData);
                            newParent.insertChild(this.dragData, target.indexOf());
                            dataprovider.getDataProvider().refresh();
                            this.dragData = null;
                            saveRoot(true);
                        }
                    }
                }
            } else { // root
                let oldParent = this.dragData.getParent();
                // 根节点下的子节点移动到根节点，不做处理
                if (oldParent && !oldParent.isRootNode()) {
                    oldParent.deleteChild(this.dragData);
                    let root = dataprovider.getDataProvider().getRootNode();
                    root.addChild(this.dragData);
                    dataprovider.getDataProvider().refresh();
                    this.dragData = null;
                    saveRoot(true);
                }
            }
        }
    }

    dragData : markdata.MarkData | null = null;
}

let dragController = new DragAndDropController;
export function getDragController() {
    return dragController;
}