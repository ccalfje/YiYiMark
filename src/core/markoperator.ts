import * as markdata from './markdata';
import * as vscode from 'vscode';

export function markCurrentLine(uri : vscode.Uri) : markdata.MarkDataTreeNode | null
{
    let select = vscode.window.activeTextEditor?.selection;
    if (select !== undefined) {
        let currentline = select.active.line;
        let data : markdata.MarkData = {
            id : "test2",
            markType : markdata.MarkType.file,
            filePath : uri.path,
            name : "test_command",
            comment : "null",
            line : currentline,
        };
        let res = new markdata.MarkDataTreeNode(data);
        return res;
    } else {
        return null;
    }
}