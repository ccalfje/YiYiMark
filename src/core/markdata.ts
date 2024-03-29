import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';
import exp = require('constants');
import { isArray } from 'util';

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

    addChild(child: TreeNode) {
        this.children.push(child);
        child.parent = this;
    }

    setChild(child: TreeNode, index: number) {
        if (index >= 0 && index < this.children.length) {
            this.children[index] = child;
        }
    }

    insertChild(child: TreeNode, index: number) {
        if (index <= this.children.length && index >= 0) {
            this.children.splice(index, 0, child);
            child.parent = this;
        }
    }

    deleteChildByIndex(index: number) {
        if (index < this.children.length) {
            let child = this.children[index];
            this.children.splice(index, 1);
            child.parent = null;
        }
    }

    deleteChild(node: TreeNode) {
        for (let i = 0; i <= this.children.length; ++i) {
            if (node === this.children[i]) {
                this.children.splice(i, 1);
                return;
            }
        }
    }

    isRootNode(): boolean {
        return this.parent === null;
    }

    indexOf() {
        if (!this.parent) {
            return -1;
        }
        for (let i = 0; i <= this.parent.children.length; ++i) {
            if (this === this.parent.children[i]) {
                return i;
            }
        }
        return -1;
    }

    traverseNode(opfun: (node: TreeNode) => any) {
        opfun(this);
        this.children.forEach(element => {
            element.traverseNode(opfun);
        });
    }

    // 由子类实现
    isEqual(node: TreeNode): boolean {
        return this.parent === node.parent;
    }


    parent: TreeNode | null = null;
    children: TreeNode[] = [];
}

export class MarkData extends TreeNode {
    isEqual(node: MarkData): boolean {
        return this.id === node.id && super.isEqual(node);
    }

    createTreeItem() {
        let treeItem = new vscode.TreeItem(this.getName(), this.getCollapsibleState());

        if (this.markType === MarkType.group) {
            treeItem.iconPath = {
                light: path.join(__filename, '..', '..', '..', 'media', 'folder.svg'),
                dark: path.join(__filename, '..', '..', '..', 'media', 'folder_dark.svg')
            };
            treeItem.tooltip = `Comment : ${this.getComment() || ''}\n
Date: ${this.getCreateDate() || ''}`;
        } else {
            treeItem.iconPath = {
                light: path.join(__filename, '..', '..', '..', 'media', 'catpaw.svg'),
                dark: path.join(__filename, '..', '..', '..', 'media', 'catpaw_dark.svg')
            };
            treeItem.tooltip = new vscode.MarkdownString(
                `Loc : ${this.getFilePath() + ":" + (this.getDisplayLineNum())}\n
Comment : ${this.getComment() || ''}\n
Date : ${this.getCreateDate() || ''}`);
        }
        treeItem.command = {title: "Jump", command: "yiyimark.jump", arguments:[this]};
        return treeItem;
    }

    getId() {
        return this.id;
    }

    getName() {
        return this.name;
    }
    setName(name: string) {
        this.name = name;
    }

    getFilePath() {
        return this.filePath;
    }
    setFilePath(filePath: string) {
        this.filePath = filePath;
    }

    getComment() {
        return this.comment;
    }
    setComment(comment: string) {
        this.comment = comment;
    }
    // zero based line num
    getLineNum() {
        return this.line;
    }
    getDisplayLineNum() {
        return this.line + 1;
    }
    setLineNum(line: number) {
        if (isNaN(line)) {
            console.log(`Error, Invalid line num: ${line}`);
            return;
        }
        this.line = line;
    }

    getMarkType() {
        return this.markType;
    }
    setMarkType(type: MarkType) {
        this.markType = type;
    }

    getCollapsibleState(): vscode.TreeItemCollapsibleState {
        return this.collapsibleState;
    }
    setCollapsibleState(state: vscode.TreeItemCollapsibleState) {
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

    getCreateDate(): string {
        return this.createDate;
    }
    updateCreateDate() {
        let date = new Date();
        let time = date.toLocaleString( );  //获取日期与时间
        this.createDate = time;
    }

    id: string = ""; // 唯一编号
    markType: MarkType = MarkType.file;
    name: string = "";
    comment: string = ""; // 对该书签的详细描述
    filePath: string = "";
    line: number = 0;
    collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None;

    contextValue = 'dependency';
    createDate: string = "";
}

export function isMarkDataEqual(root1: MarkData, root2: MarkData) {
    //1.如果是比较对象===，返回true
    if (root1 === root2) {
        return true;
    }

    if (isDataEqual(root1, root2)) {
        if (root1.getChildren().length !== root2.getChildren().length) {
            return false;
        } else {
            for (let i = 0; i <= root1.getChildren().length; ++i) {
                if (!isMarkDataEqual(root1.getChildren()[i] as MarkData, root2.getChildren()[i] as MarkData)) {
                    return false;
                }
            }
        }
    } else {
        return false;
    }
    return true;
}

function isDataEqual(root1: MarkData, root2: MarkData) {
    const obj1Props = Object.getOwnPropertyNames(root1);
    const obj2Props = Object.getOwnPropertyNames(root2);
    if (obj1Props.length !== obj2Props.length) {
        return false;
    }
    return (obj1Props.every((prop) => {
        if (prop === "children" || prop === "parent") {
            return true;
        }
        let prop0 = prop as keyof MarkData;
        let value = root1[prop0];
        if (typeof value !== "function") {
            return value === root2[prop0];
        } else {
            return true;
        }
    }));
}

export function createFileMarkData(name: string, comment: string, filePath: string, line: number): MarkData {
    let data = new MarkData;
    data.setName(name);
    data.setComment(comment);
    data.setFilePath(filePath);
    data.setLineNum(line);
    data.setMarkType(MarkType.file);
    data.setCollapsibleState(vscode.TreeItemCollapsibleState.None);
    data.updateCreateDate();
    return data;
}

export function createGroupMarkData(name: string): MarkData {
    let data = new MarkData;
    data.setName(name);
    data.setMarkType(MarkType.group);
    data.setCollapsibleState(vscode.TreeItemCollapsibleState.Expanded);
    data.updateCreateDate();
    return data;
}

export function createRootMarkData(): MarkData {
    let data = new MarkData;
    data.setName("root");
    data.setMarkType(MarkType.group);
    data.setCollapsibleState(vscode.TreeItemCollapsibleState.Expanded);
    data.updateCreateDate();
    return data;
}

function markDataToObj(data: MarkData) : any {
    let obj = {
        "id": data.getId(),
        "markType": data.getMarkType(),
        "name": data.getName(),
        "comment": data.getComment(),
        "filePath": data.getFilePath(),
        "line": data.getLineNum(),
        "collapsibleState": data.getCollapsibleState(),
        "createDate": data.getCreateDate(),
        "children": data.getChildren().map(value=> markDataToObj(value as MarkData))
    };
    return obj;
}

function createMarkDataByJSON(data: any): MarkData {
    let res = new MarkData;
    res.id = data.id;
    res.markType = data.markType;
    res.name = data.name;
    res.comment = data.comment;
    res.filePath = data.filePath;
    res.line = data.line;
    res.collapsibleState = data.collapsibleState;
    res.contextValue = data.contextValue;
    res.createDate = data.createDate || '';
    for (let child of data.children) {
        let childNode = createMarkDataByJSON(child);
        res.addChild(childNode);
    }
    // 修复数据被错误修改的情况
    if (Array.isArray(data.children) && data.children.length !== 0) {
        res.markType = MarkType.group;
        res.collapsibleState = res.collapsibleState === vscode.TreeItemCollapsibleState.None ? vscode.TreeItemCollapsibleState.Expanded : res.collapsibleState;
    }
    return res;
}

function markDataTreeToJson(root: MarkData): string {
    return JSON.stringify(markDataToObj(root), (key: string, value: any) => {
        if (key === "parent") {
            return undefined;
        } else {
            return value;
        }
    }, 4);
}

function jsonToMarkDataTree(data: string): MarkData {
    let treeData = JSON.parse(data, (key: string, value: any) => {
        if (key === "markType") {
            switch (value) {
                case "group":
                    return MarkType.group;
                case "file":
                    return MarkType.file;
                default:
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

    let res = createMarkDataByJSON(treeData);
    return res;
}

export function saveTreeToFile(fileName: string, root: MarkData) {
    let str = markDataTreeToJson(root);
    fs.writeFileSync(fileName, str);
}

export function readTreeFromFile(fileName: string): MarkData | null {
    let str = fs.readFileSync(fileName).toString();
    if (str) {
        let tree = jsonToMarkDataTree(str);
        return tree;
    } else {
        return null;
    }
}