import * as fs from 'fs';
import * as vscode from 'vscode';

export enum MarkType {
    group = "group",
    file = "file",
}

export interface MarkData {
    id : string; // 唯一编号
    markType : MarkType;
    filePath : string; 
    name : string;
    comment : string; // 对该书签的详细描述
    line : number;
}

// TreeView 节点，控制树节点的外观
export class MarkTreeItem extends vscode.TreeItem {

	constructor(treeNode : MarkDataTreeNode, command?: vscode.Command) {
		super(treeNode.getName(), treeNode.getCollapsibleState());
        this.treeNode = treeNode;
	}

    treeNode : MarkDataTreeNode;

	// iconPath = {
	// 	light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
	// 	dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
	// };

	contextValue = 'dependency';
}

// 数据节点，保存mark的关键数据
export class MarkDataTreeNode {
    constructor(data : MarkData, parent : MarkDataTreeNode | null = null) {
        this.data = data;
        this.parent = parent;
        this.treeItem = null;
    }

    getTreeItem() : MarkTreeItem
    {
        if (this.treeItem) {
            return this.treeItem;
        } else {
            this.treeItem = new MarkTreeItem(this);
            return this.treeItem;
        }
    }

    getChildrenTreeItems() : MarkTreeItem[]
    {
        return this.children.map((value: MarkDataTreeNode) => value.getTreeItem());
    }

    addChild(child : MarkDataTreeNode) {
        child.parent = this;
        this.children.push(child);
    }

    getCollapsibleState() : vscode.TreeItemCollapsibleState
    {
        switch(this.data.markType) {
            case MarkType.file:
                return vscode.TreeItemCollapsibleState.None;
            case MarkType.group:
                return vscode.TreeItemCollapsibleState.Collapsed;
            default:
                return vscode.TreeItemCollapsibleState.None;
        }
    }

    getName() : string
    {
        return this.data.name;
    }

    data : MarkData;
    parent : MarkDataTreeNode | null;
    children : MarkDataTreeNode[] = [];
    treeItem : MarkTreeItem | null;

}

function markDataTreeToJson(root : MarkDataTreeNode) : string
{
    return JSON.stringify(root, (key : string, value : any)=> {
        if (key === "parent" || key === "treeItem") {
            return undefined;
        } else {
            return value;
        }
    });
}

function jsonToMarkDataTree(data : string) : MarkDataTreeNode
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

    let setParent = function(dataTree : MarkDataTreeNode) {
        dataTree.children.forEach((value: MarkDataTreeNode, index: number, array: MarkDataTreeNode[]) => {
            value.parent = dataTree;
            setParent(value);
        });
    };
    setParent(treeData);
    return treeData;
}

export function saveTreeToFile(fileName : string, root : MarkDataTreeNode)
{
    let str = markDataTreeToJson(root);
    fs.writeFileSync(fileName, str);
}

export function readTreeFromFile(fileName : string) : MarkDataTreeNode | null
{
    let str = fs.readFileSync(fileName).toString();
    if (str) {
        let tree = jsonToMarkDataTree(str);
        return tree;
    } else {
        return null;
    }
}


export class DepNodeProvider implements vscode.TreeDataProvider<MarkTreeItem> {

	private _onDidChangeTreeData: vscode.EventEmitter<MarkTreeItem | undefined | void> = new vscode.EventEmitter<MarkTreeItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<MarkTreeItem | undefined | void> = this._onDidChangeTreeData.event;

    rootNode : MarkDataTreeNode;

	constructor(rootNode: MarkDataTreeNode) {
        this.rootNode = rootNode;
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: MarkTreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: MarkTreeItem): Thenable<MarkTreeItem[]> {
		if (element) {
			return Promise.resolve(element.treeNode.getChildrenTreeItems());
		} else {
            return Promise.resolve(this.rootNode.getChildrenTreeItems());
		}
	}
}
