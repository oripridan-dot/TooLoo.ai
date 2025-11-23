// @version 2.1.57
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
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

class ToolooStatusProvider implements vscode.TreeDataProvider<StatusItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<StatusItem | undefined | null | void> = new vscode.EventEmitter<StatusItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<StatusItem | undefined | null | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: StatusItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: StatusItem): Thenable<StatusItem[]> {
        if (element) {
            return Promise.resolve([]);
        } else {
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
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label}`;
        this.description = '';
    }
}

export function deactivate() {}
