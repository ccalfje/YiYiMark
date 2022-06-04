import * as vscode from 'vscode';
import * as dataprovider from './dataprovider';
import * as markoperator from './markoperator';
import * as markdata from './markdata';
import * as path from 'path';

export class YiYiView {
    constructor() {
        this.dataProvider = dataprovider.getDataProvider();

        this.treeView = vscode.window.createTreeView('yiyi-markview', {
            treeDataProvider: this.dataProvider,
            showCollapseAll: true,
            dragAndDropController: markoperator.getDragController()
        });

        // 注册焦点切换事件
        vscode.window.onDidChangeWindowState(markoperator.onWindowActive);
        // 注册工程切换事件  ----- 目前只支持打开一个工程的情况,也可以不注册
        vscode.workspace.onDidChangeWorkspaceFolders(markoperator.onChangeWorkspaceFolders);
        // 注册配置更改事件
        vscode.workspace.onDidChangeConfiguration(markoperator.onChangeConfiguration);
        // treeView的select事件
        this.treeView.onDidChangeSelection(markoperator.onTreeViewSelectionChanged);

        this.dataProvider.onDidAddNode(this.onDidAddNode.bind(this));
        this.dataProvider.onDidRemoveNode(this.onDidRemoveNode.bind(this));
        this.dataProvider.onDidEditNode(this.onDidEditNode.bind(this));

        vscode.window.onDidChangeVisibleTextEditors(this.onDidChangeChangeVisibleTextEditors.bind(this));
    }

    getTreeView() {
        return this.treeView;
    }

    onDidAddNode(node: markdata.MarkData) {

    }

    onDidRemoveNode(node: markdata.MarkData) {

    }

    onDidEditNode(node: markdata.MarkData) {

    }

    onDidChangeChangeVisibleTextEditors(editors: readonly vscode.TextEditor[]) {
        this.renderAllNodeLines();
    }

    renderAllNodeLines() {
        let renderLine = vscode.workspace.getConfiguration('yiyimark').get('renderLine', true);
        if (renderLine) {
            let textEditors = vscode.window.visibleTextEditors;
            let fileNodeMap = this.dataProvider.getFileNodeMap();
            for (let editor of textEditors) {
                let relativePath = vscode.workspace.asRelativePath(editor.document.uri);
                let res = fileNodeMap.get(relativePath);
                if (res) {
                    let lines = res.map(value => value.getLineNum());
                    this.renderLines(editor, lines);
                }
            }
        }
    }

    renderLines(editor: vscode.TextEditor, lines: number[]) {
        const decorationOptions: vscode.DecorationRenderOptions = {
            light: {
                gutterIconPath: path.join(__filename, '..', '..', '..', 'media', 'catpaw.svg'),
                gutterIconSize: "80%"
            },
            dark: {
                gutterIconPath: path.join(__filename, '..', '..', '..', 'media', 'catpaw_dark.svg'),
                gutterIconSize: "80%"
            },
        };
        let decoration = vscode.window.createTextEditorDecorationType(decorationOptions);
        let ranges = lines.map(line => {
            const start = new vscode.Position(line, 0);
            const end = new vscode.Position(line, 0);
            return new vscode.Range(start, end);
        });
        editor.setDecorations(decoration, ranges);
    }


    /* 
    1.打开文件时，渲染标签行
    2.节点增删改时，更新渲染行
    */

    private dataProvider: dataprovider.MarkDataProvider;
    private treeView: vscode.TreeView<markdata.MarkData>;
}