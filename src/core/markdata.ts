import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';

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
        let treeItem = new vscode.TreeItem(this.getName(), this.getCollapsibleState());
        let iconPath;
        if (this.markType === MarkType.group) {
            iconPath = {
                light: path.join(__filename, '..', '..', '..', 'media', 'folder.svg'),
                dark: path.join(__filename, '..', '..', '..', 'media', 'folder_dark.svg')
            };
        } else {
            iconPath = {
                light: path.join(__filename, '..', '..', '..', 'media', 'catpaw.svg'),
                dark: path.join(__filename, '..', '..', '..', 'media', 'catpaw.svg')
            };
        }
        treeItem.iconPath = iconPath;
        return treeItem;
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

function createMardDataByJSON(data : any): MarkData {
    let res = new MarkData;
    res.id = data.id;
    res.markType = data.markType;
    res.name = data.name;
    res.comment = data.comment;
    res.filePath = data.filePath;
    res.line = data.line;
    res.collapsibleState = data.collapsibleState;
    res.contextValue = data.contextValue;
    for(let child of data.children) {
        let childNode = createMardDataByJSON(child);
        res.addChild(childNode);
    }
    return res;
}




function markDataTreeToJson(root : MarkData) : string
{
    return JSON.stringify(root, (key : string, value : any)=> {
        if (key === "parent") {
            return undefined;
        } else {
            return value;
        }
    }, 4);
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
        // }
        // else if (key === "collapsibleState") {
        //     switch(value) {
        //         case "None" :
        //             return vscode.TreeItemCollapsibleState.None;
        //         case "Collapsed" :
        //             return vscode.TreeItemCollapsibleState.Collapsed;
        //         case "Expanded" :
        //             return vscode.TreeItemCollapsibleState.Expanded;
        //         default :
        //             return vscode.TreeItemCollapsibleState.None;
        //     }
        } else {
            return value;
        }
    });

    let res = createMardDataByJSON(treeData);
    return res;
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