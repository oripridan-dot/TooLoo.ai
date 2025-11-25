"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
// @version 2.1.57
const vscode = require("vscode");
function activate(context) {
    console.log('TooLoo.ai extension is now active!');
    let deployDisposable = vscode.commands.registerCommand('tooloo.deploy', () => {
        vscode.window.showInformationMessage('TooLoo: Deploying...');
        const terminal = vscode.window.createTerminal('TooLoo');
        terminal.show();
        terminal.sendText('npm run tooloo deploy');
    });
    let logsDisposable = vscode.commands.registerCommand('tooloo.logs', () => {
        const terminal = vscode.window.createTerminal('TooLoo Logs');
        terminal.show();
        terminal.sendText('npm run tooloo logs');
    });
    let trainDisposable = vscode.commands.registerCommand('tooloo.train', () => {
        vscode.window.showInformationMessage('TooLoo: Starting Training Job...');
        const terminal = vscode.window.createTerminal('TooLoo Training');
        terminal.show();
        // In a real scenario, this would trigger a remote job
        terminal.sendText('python3 src/sdk/python/demo_tracking.py');
    });
    const statusProvider = new ToolooStatusProvider();
    vscode.window.registerTreeDataProvider('toolooStatus', statusProvider);
    let refreshDisposable = vscode.commands.registerCommand('tooloo.refreshStatus', () => {
        statusProvider.refresh();
    });
    context.subscriptions.push(deployDisposable);
    context.subscriptions.push(logsDisposable);
    context.subscriptions.push(trainDisposable);
    context.subscriptions.push(refreshDisposable);
}
class ToolooStatusProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (element) {
            return Promise.resolve([]);
        }
        else {
            return Promise.resolve([
                new StatusItem('Project: tooloo-core', vscode.TreeItemCollapsibleState.None, 'project'),
                new StatusItem('Status: Active', vscode.TreeItemCollapsibleState.None, 'status'),
                new StatusItem('Last Deployment: 2 mins ago', vscode.TreeItemCollapsibleState.None, 'deployment'),
                new StatusItem('Training Jobs', vscode.TreeItemCollapsibleState.Expanded, 'jobs_header'),
                new StatusItem('Job #123 (Running)', vscode.TreeItemCollapsibleState.None, 'trainingJob', {
                    command: 'tooloo.logs',
                    title: 'View Logs'
                })
            ]);
        }
    }
}
class StatusItem extends vscode.TreeItem {
    constructor(label, collapsibleState, contextValue, command) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.contextValue = contextValue;
        this.command = command;
        this.tooltip = `${this.label}`;
        this.description = '';
    }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map