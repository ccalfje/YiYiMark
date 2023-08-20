import * as markdata from './markdata';
import * as vscode from 'vscode';

export class MarkDataProvider implements vscode.TreeDataProvider<markdata.MarkData> {
    // interface
    private _onDidChangeTreeData: vscode.EventEmitter<markdata.MarkData | undefined | void> = new vscode.EventEmitter<markdata.MarkData | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<markdata.MarkData | undefined | void> = this._onDidChangeTreeData.event;

    // 以下是私有实现
    private _onDidAddNode: vscode.EventEmitter<markdata.MarkData> = new vscode.EventEmitter<markdata.MarkData>();
    readonly onDidAddNode: vscode.Event<markdata.MarkData> = this._onDidAddNode.event;

    private _onDidRemoveNode: vscode.EventEmitter<markdata.MarkData> = new vscode.EventEmitter<markdata.MarkData>();
    readonly onDidRemoveNode: vscode.Event<markdata.MarkData> = this._onDidRemoveNode.event;

    private _onDidEditNode: vscode.EventEmitter<markdata.MarkData> = new vscode.EventEmitter<markdata.MarkData>();
    readonly onDidEditNode: vscode.Event<markdata.MarkData> = this._onDidEditNode.event;

    constructor(rootNode: markdata.MarkData) {
        this.rootNode = rootNode;
        this.fileViewProvider = new MarkDataProviderToFileView(this.fileNodeMap);
    }

    getFileProvider() {
        return this.fileViewProvider;
    }

    getRootNode() {
        return this.rootNode;
    }

    setRootNode(root: markdata.MarkData | null) {
        if (root) {
            this.rootNode = root;
        } else {
            this.rootNode = markdata.createRootMarkData();
        }
        this.refresh();
        this.updateFileNodeMap(root);
    }

    notifyAddNode(newNode: markdata.MarkData) {
        this.nodeListNeedUpdate = true;
        let parentNode = newNode.getParent();
        this.refreshNode(parentNode as markdata.MarkData);
        this.addFileNodeMap(newNode);
        this._onDidAddNode.fire(newNode);
        this.fileViewProvider.refresh();
    }

    notifyRemoveNode(node: markdata.MarkData, parentNode: markdata.MarkData) {
        this.nodeListNeedUpdate = true;
        this.refreshNode(parentNode as markdata.MarkData);
        this.removeFileNodeMap(node);
        this._onDidRemoveNode.fire(node);
        this.fileViewProvider.refresh();
    }

    notifyEditNode(node: markdata.MarkData) {
        this.nodeListNeedUpdate = true;
        this.refreshNode(node);
        this._onDidEditNode.fire(node);
        this.fileViewProvider.refresh();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
        this.fileViewProvider.refresh();
    }

    refreshNode(node: markdata.MarkData) {
        if (!node || node.isRootNode()) {
            this._onDidChangeTreeData.fire();
        } else {
            this._onDidChangeTreeData.fire(node);
        }
        this.fileViewProvider.refresh();
    }

    // interface
    getTreeItem(element: markdata.MarkData): vscode.TreeItem {
        let treeItem = element.createTreeItem();
        return treeItem;
    }

    // interface
    getChildren(element?: markdata.MarkData): Thenable<markdata.MarkData[]> {
        if (element) {
            let children = element.getChildren() as markdata.MarkData[];
            return Promise.resolve(children);
        } else {
            let children = this.rootNode.getChildren() as markdata.MarkData[];
            return Promise.resolve(children);
        }
    }

    // interface
    getParent(element: markdata.MarkData): vscode.ProviderResult<markdata.MarkData> {
        return element.getParent() as markdata.MarkData;
    }

    // fzf搜索节点列表
    getNodeList(): markdata.MarkData[] {
        if (this.nodeListNeedUpdate) {
            this.nodeList.length = 0;
            let updateFun = (node: markdata.TreeNode) => {
                let marknode = node as markdata.MarkData;
                if (marknode.getMarkType() !== markdata.MarkType.group) {
                    this.nodeList.push(marknode);
                }
            };
            this.rootNode.traverseNode(updateFun);
            this.nodeListNeedUpdate = false;
        }
        return this.nodeList;
    }

    private getFileNodeMap(): Map<string, markdata.MarkData[]> {
        return this.fileNodeMap;
    }

    getFileNodeList(path : string) : readonly markdata.MarkData[] | undefined {
        let res = this.fileNodeMap.get(path);
        return res;
    }

    private updateFileNodeMap(root: markdata.MarkData | null) {
        this.fileNodeMap.clear();
        let updateFun = (node: markdata.TreeNode) => {
            let marknode = node as markdata.MarkData;
            if (marknode.getMarkType() === markdata.MarkType.file) {
                let dataArr = this.fileNodeMap.get(marknode.getFilePath());
                if (!dataArr) {
                    dataArr = [];
                    this.fileNodeMap.set(marknode.getFilePath(), dataArr);
                }
                dataArr.push(marknode);
            }
        };
        if (root) {
            root.traverseNode(updateFun);
        }
    }

    private addFileNodeMap(node: markdata.MarkData) {
        if (node.getMarkType() === markdata.MarkType.file) {
            let dataArr = this.fileNodeMap.get(node.getFilePath());
            if (!dataArr) {
                dataArr = [];
                this.fileNodeMap.set(node.getFilePath(), dataArr);
            }
            dataArr.push(node);
        }
    }

    private removeFileNodeMap(node: markdata.MarkData) {
        if (node.getMarkType() === markdata.MarkType.file) {
            let dataArr = this.fileNodeMap.get(node.getFilePath());
            if (!dataArr) {
                return;
            }
            for(let i = 0; i <= dataArr.length; ++i) {
                if (dataArr[i] === node) {
                    dataArr.splice(i, 1);
                    return;
                }
            }
        }
    }


    private rootNode: markdata.MarkData;
    // 用于fzf
    private nodeList: markdata.MarkData[] = [];
    private nodeListNeedUpdate: boolean = true;

    // 用于渲染行标记
    private fileNodeMap: Map<string, markdata.MarkData[]> = new Map();

    private fileViewProvider: MarkDataProviderToFileView;
}

export class MarkDataProviderToFileView implements vscode.TreeDataProvider<markdata.MarkData> {
    // interface
    private _onDidChangeTreeData: vscode.EventEmitter<markdata.MarkData | undefined | void> = new vscode.EventEmitter<markdata.MarkData | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<markdata.MarkData | undefined | void> = this._onDidChangeTreeData.event;

    constructor(fileNodeMap: Map<string, markdata.MarkData[]>) {
        this.fileNodeMap = fileNodeMap;
        // root节点永远不变
        this.rootNode = markdata.createRootMarkData();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    // interface
    getTreeItem(element: markdata.MarkData): vscode.TreeItem {
        let treeItem = element.createTreeItem();
        return treeItem;
    }

    // interface
    getChildren(element?: markdata.MarkData): Thenable<markdata.MarkData[]> {
        // 仅展示一层结构
        if (element) {
            return Promise.resolve([]);
        } else {
            let uri = vscode.window.activeTextEditor?.document.uri;
            if (uri) {
                let relativePath = vscode.workspace.asRelativePath(uri);
                let nodes = this.getFileNodeList(relativePath);
                if (nodes){
                    return Promise.resolve(nodes);
                } 
                return Promise.resolve([]);
            }
            return Promise.resolve([]);
        }
    }

    // interface
    getParent(element: markdata.MarkData): vscode.ProviderResult<markdata.MarkData> {
        return this.rootNode;
    }

    getFileNodeList(path : string) : markdata.MarkData[] | undefined {
        let res = this.fileNodeMap.get(path);
        return res;
    }

    private rootNode: markdata.MarkData;
    // 用于渲染行标记
    private fileNodeMap: Map<string, markdata.MarkData[]> = new Map();
}

// let testFileStr =  "D:\soft\vs code\gymark\yiyimark\src\core\testdata.ts";
// let child1 = markdata.createFileMarkData("testFile1", "this is test file1", testFileStr, 10);
// let child2 = markdata.createFileMarkData("testFile2", "this is test file2", testFileStr, 10);
// let group1 = markdata.createGroupMarkData("testGroup1");
// let child11 = markdata.createFileMarkData("testChild1_1", "this is test testChild1_1", testFileStr, 10);
// let child12 = markdata.createFileMarkData("testChild2_2", "this is test testChild2_2", testFileStr, 10);

// group1.addChild(child11);
// group1.addChild(child12);

// root.addChild(child1);
// root.addChild(child2);
// root.addChild(group1);

let root = markdata.createRootMarkData();
let provider = new MarkDataProvider(root);

export function getDataProvider() {
    return provider;
}