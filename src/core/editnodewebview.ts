import * as vscode from 'vscode';
import * as markdata from './markdata';
import * as markoperator from './markoperator';

function getWebviewOptions(): vscode.WebviewOptions {
    return {
        // Enable javascript in the webview
        enableScripts: true,
    };
}

export class NodeEditPanel {
    /**
     * Track the currently panel. Only allow a single panel to exist at a time.
     */
    public static currentPanel: NodeEditPanel | undefined;

    public static readonly viewType = 'Edit';

    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(node: markdata.MarkData) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (NodeEditPanel.currentPanel) {
            NodeEditPanel.currentPanel._update(node);
            NodeEditPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            NodeEditPanel.viewType,
            'Node edit',
            column || vscode.ViewColumn.One,
            getWebviewOptions(),
        );

        NodeEditPanel.currentPanel = new NodeEditPanel(panel, node);
    }

    private constructor(panel: vscode.WebviewPanel, node: markdata.MarkData) {
        this._panel = panel;
		this._update(node);
        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'submit':
                        let lineNum = parseInt(message.line);
                        if (isNaN(lineNum) || lineNum < 1){
                            vscode.window.showInformationMessage(`Invalid line num: ${message.line}`);
                            return;
                        }

                        node.setName(message.name);
                        node.setComment(message.comment);
                        node.setFilePath(message.filePath);
                        node.setLineNum(lineNum - 1);
                        markoperator.updateNode(node);
                        this.dispose();
                        return;
                    case 'cancel':
                        this.dispose();
                        return;
                }
            },
            null,
            this._disposables
        );
    }
	private _update(node: markdata.MarkData) {
		this._panel.title = "YiyiMark Node editor";
		this._panel.webview.html = this._getHtmlForWebview(node);
    }

    public doRefactor() {
        // Send a message to the webview webview.
        // You can send any JSON serializable data.
        this._panel.webview.postMessage({ command: 'refactor' });
    }

    public dispose() {
        NodeEditPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _getHtmlForWebview(node: markdata.MarkData) {
        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();


        return `<!DOCTYPE html>
<html>
<body>

Node Name:<br>
<input type="text" name="nodeName" id="nodeName" value="${node.getName()}">
<br>
File Path:<br>
<input type="text" name="filePath" id="filePath" value="${node.getFilePath()}">
<br>
Line:<br>
<input type="text" name="line" id="line" value="${node.getDisplayLineNum()}">
<br>
Comment:<br>
<textarea rows="2" cols="80" id="commentText">
${node.getComment()}
</textarea>
<br><br>
<button type="button" onclick="onSubmit()">Submit</button>
<button type="button" onclick="onCancel()">Cancel</button>
    <script>
        const vscode = acquireVsCodeApi();
        function onSubmit() {
            const nodeName = document.getElementById('nodeName').value;
            const nodeFilePath = document.getElementById('filePath').value;
            const nodeLine = document.getElementById('line').value;
            const nodeComment = document.getElementById('commentText').value;
            vscode.postMessage({
                command: 'submit',
                name: nodeName,
                comment: nodeComment,
                filePath: nodeFilePath,
                line: nodeLine
            });
        };

        function onCancel() {
            vscode.postMessage({
                command: 'cancel'
            });
        };
    </script>

</body>
</html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
