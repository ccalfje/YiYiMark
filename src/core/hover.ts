import * as vscode from 'vscode';
import * as dataprovider from './dataprovider';
import { MarkData } from './markdata';

/**
 * 鼠标悬停提示，当鼠标停在package.json的dependencies或者devDependencies时，
 * 自动显示对应包的名称、版本号和许可协议
 * @param {*} document 
 * @param {*} position 
 * @param {*} token 
 */
export function provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
    let config = vscode.workspace.getConfiguration("yiyimark");
    if (!config.Hover) {
        return null;
    }

    let uri = document.uri;
    if (!uri) {
        console.log("[yiyimark] provideHover : undefinded uri");
        return null;
    }
    let relativePath = vscode.workspace.asRelativePath(uri);
    let nodeArray = dataprovider.getDataProvider().getFileNodeList(relativePath);
    if (!nodeArray) {
        return null;
    }
    let lineNum = position.line;
    for (let node of nodeArray) {
        if (node.getLineNum() === lineNum) {
            let indexArray = [];
            let tempNode = node;
            while (tempNode) {
                let index = tempNode.indexOf();
                if (index !== -1) {
                    indexArray.push(index);
                }
                tempNode = tempNode.getParent() as MarkData;
            }

            indexArray = indexArray.reverse();

            const args = [{ indexArr: indexArray }];
            const selectCmdUri = vscode.Uri.parse(
                `command:yiyimark.selectNode?${encodeURIComponent(JSON.stringify(args))}`
            );

            let dispStr = new vscode.MarkdownString(
                `<span style="color:#E814F4;"><strong>YiYiMark</strong></span> : [${node.getName()}](${selectCmdUri})`
            );
            dispStr.supportHtml = true;
            dispStr.isTrusted = true;
            return new vscode.Hover(dispStr);
        }
    }
    return null;
}
