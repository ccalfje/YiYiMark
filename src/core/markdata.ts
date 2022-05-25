import * as fs from 'fs';
import * as vscode from 'vscode';

export enum MarkType {
    group = "group",
    file = "file",
}

export class TreeNode {
    getParent() {
        return this.parent;
    }

    getChildren() {
        return this.children;
    }

    addChild(child : TreeNode) {
        this.children.push(child);
        child.parent = this;
    }

    insertChild(child : TreeNode, index : number) {
        if (index <= this.children.length) {
            this.children.splice(index, 0, child);
            child.parent = this;
        }
    }

    deleteChildByIndex(index : number) {
        if (index < this.children.length) {
            let child = this.children[index];
            this.children.splice(index, 1);
            child.parent = null;
        }
    }

    deleteChild(node : TreeNode) {
        for (let i = 0; i <= this.children.length; ++i) {
            if (node === this.children[i]) {
                this.children.splice(i, 1);
                return;
            }
        }
    }

    getIndex(node : TreeNode) {

    }

    traverseNode(opfun : (node : TreeNode) => any) {
        opfun(this);
        this.children.forEach(element => {
            element.traverseNode(opfun);
        });
    }

    // 由子类实现
    isEqual(node : TreeNode) : boolean {
        return this.parent === node.parent;
    }


    parent : TreeNode | null = null;
    children : TreeNode[] = [];
}

export class MarkData extends TreeNode {
    isEqual(node: MarkData): boolean {
        return this.id === node.id && super.isEqual(node);
    }

    createTreeItem() {
        return new vscode.TreeItem(this.getName(), this.getCollapsibleState());
    }

    getName() {
        return this.name;
    }
    setName(name : string) {
        this.name = name;
    }

    getFilePath() {
        return this.filePath;
    }
    setFilePath(filePath : string) {
        this.filePath = filePath;
    }

    getComment() {
        return this.comment;
    }
    setComment(comment : string) {
        this.comment = comment;
    }

    getLineNum() {
        return this.line;
    }
    setLineNum(line : number) {
        this.line = line;
    }

    getMarkType() {
        return this.markType;
    }
    setMarkType(type : MarkType) {
        this.markType = type;
    }

    getCollapsibleState() : vscode.TreeItemCollapsibleState
    {
        return this.collapsibleState;
    }
    setCollapsibleState(state : vscode.TreeItemCollapsibleState) {
        if (this.markType === MarkType.file) {
            return;
        } else if (this.markType === MarkType.group) {
            if (state === vscode.TreeItemCollapsibleState.None) {
                return;
            } else {
                this.collapsibleState = state;
            }
        }
    }

    id : string = ""; // 唯一编号
    markType : MarkType = MarkType.file;
    name : string = "";
    comment : string = ""; // 对该书签的详细描述
    filePath : string = ""; 
    line : number = 0;
    collapsibleState : vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None;

    contextValue = 'dependency';
}

export function createFileMarkData(name : string, comment : string, filePath : string, line : number) : MarkData
{
    let data = new MarkData;
    data.setName(name);
    data.setComment(comment);
    data.setFilePath(filePath);
    data.setLineNum(line);
    data.setMarkType(MarkType.file);
    data.setCollapsibleState(vscode.TreeItemCollapsibleState.None);
    return data;
}

export function createGroupMarkData(name : string): MarkData
{
    let data = new MarkData;
    data.setName(name);
    data.setMarkType(MarkType.group);
    data.setCollapsibleState(vscode.TreeItemCollapsibleState.Expanded);
    return data;
}


export class MarkDataProvider implements vscode.TreeDataProvider<MarkData> {

    private _onDidChangeTreeData: vscode.EventEmitter<MarkData | undefined | void> = new vscode.EventEmitter<MarkData | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<MarkData | undefined | void> = this._onDidChangeTreeData.event;

    rootNode: MarkData;

    constructor(rootNode: MarkData) {
        this.rootNode = rootNode;
    }

    getRootNode() {
        return this.rootNode;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    refreshNode(element : MarkData) {
        this._onDidChangeTreeData.fire(element);
    }

    getTreeItem(element: MarkData): vscode.TreeItem {
        let treeItem = element.createTreeItem();
        return treeItem;
    }

    getChildren(element?: MarkData): Thenable<MarkData[]> {
        if (element) {
            let children  = element.getChildren() as MarkData[];
            return Promise.resolve(children);
        } else {
            let children  = this.rootNode.getChildren() as MarkData[];
            return Promise.resolve(children);
        }
    }
}


function markDataTreeToJson(root : MarkData) : string
{
    return JSON.stringify(root, (key : string, value : any)=> {
        if (key === "parent" || key === "treeItem") {
            return undefined;
        } else {
            return value;
        }
    });
}

function jsonToMarkDataTree(data : string) : MarkData
{
    let treeData = JSON.parse(data, (key : string, value : any) => {
        if (key === "markType") {
            switch(value) {
                case "group" :
                    return MarkType.group;
                case "file" :
                    return MarkType.file;
                default :
                    return MarkType.group;
            }
        } else {
            return value;
        }
    });

    // let setParent = function(dataTree : MarkData) {
    //     dataTree.children.forEach((value: MarkData, index: number, array: MarkData[]) => {
    //         value.parent = dataTree;
    //         setParent(value);
    //     });
    // };
    // setParent(treeData);
    return treeData;
}

export function saveTreeToFile(fileName : string, root : MarkData)
{
    let str = markDataTreeToJson(root);
    fs.writeFileSync(fileName, str);
}

export function readTreeFromFile(fileName : string) : MarkData | null
{
    let str = fs.readFileSync(fileName).toString();
    if (str) {
        let tree = jsonToMarkDataTree(str);
        return tree;
    } else {
        return null;
    }
}