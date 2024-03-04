import * as vscode from 'vscode';
import { window } from 'vscode';
import * as yaml from 'js-yaml';

let statusbarAtoBuild: vscode.StatusBarItem;
let statusbarAtoCreate: vscode.StatusBarItem;
let statusbarAtoInstall: vscode.StatusBarItem;
let statusbarAtoInstallPackage: vscode.StatusBarItem;
let statusbarAtoBuildTarget: vscode.StatusBarItem;
let builds: string[] = [];
interface AtoYaml {
    atoVersion: string;
    builds: {
        [key: string]: {
            entry: string;
        };
    };
    dependencies: string[];
}
const atopileInterpreterSetting = 'atopile.interpreter';

async function atoBuild() {
    // save all dirty editors
    vscode.workspace.saveAll();

    // get the command to start the python venv
    const configuration = vscode.workspace.getConfiguration();
    let venvCommandLine: any = configuration.get<{}>(atopileInterpreterSetting);

    // create a terminal to work with
    let buildTerminal = vscode.window.createTerminal({
        name: 'ato Build',
        cwd: '${workspaceFolder}',
        hideFromUser: false,
    });

    if (!venvCommandLine[0]) {
        venvCommandLine[0] = await processVenv();
    }

    // send commands
    buildTerminal.sendText(venvCommandLine[0]);

    // parse what build target to use
    let buildArray: string[] = statusbarAtoBuildTarget.text.split('-');

    // check if there was no build specified
    if (buildArray[0]) {
        buildTerminal.sendText('ato build ' + '--build ' + buildArray[0]);
    } else {
        buildTerminal.sendText('ato build');
    }
    buildTerminal.show();
}

async function atoCreate() {
    const configuration = vscode.workspace.getConfiguration();
    let venvCommandLine: any = configuration.get<{}>(atopileInterpreterSetting);

    let createTerminal = vscode.window.createTerminal({
        name: 'ato Create',
        cwd: '${workspaceFolder}',
        hideFromUser: false,
    });

    if (!venvCommandLine[0]) {
        venvCommandLine[0] = await processVenv();
    }

    createTerminal.sendText(venvCommandLine[0]);
    createTerminal.sendText('ato create');
    createTerminal.show();
}

async function processInstallJlcpcb() {
    const configuration = vscode.workspace.getConfiguration();
    let venvCommandLine: any = configuration.get<{}>(atopileInterpreterSetting);

    let result = await window.showInputBox({
        placeHolder: 'JLCPCB Component ID',
    });
    // delete whitespace
    result = result?.trim();

    // if we got a part, try to install it
    if (result) {
        let installTerminal = vscode.window.createTerminal({
            name: 'ato Install',
            cwd: '${workspaceFolder}',
            hideFromUser: false,
        });

        if (!venvCommandLine[0]) {
            venvCommandLine[0] = await processVenv();
        }

        installTerminal.sendText(venvCommandLine[0]);
        installTerminal.sendText('ato install --jlcpcb ' + result);
        installTerminal.show();
    }
}

async function processVenv() {
    let result = await window.showInputBox({
        placeHolder: 'Terminal command to activate the Python virtual environment',
    });
    // delete whitespace
    result = result?.trim();

    // if we got a string, save it
    if (result) {
        await vscode.workspace.getConfiguration().update(atopileInterpreterSetting, [result], vscode.ConfigurationTarget.Workspace);
    }

    return result;
}

async function processInstallPackage() {
    const configuration = vscode.workspace.getConfiguration();
    const venvCommandLine: any = configuration.get<{}>(atopileInterpreterSetting);
    let result = await window.showInputBox({
        placeHolder: 'Package name',
    });
    // delete whitespace
    result = result?.trim();

    // if we got a part, try to install it
    if (result) {
        let installTerminal = vscode.window.createTerminal({
            name: 'ato Install',
            cwd: '${workspaceFolder}',
            hideFromUser: false,
        });
        installTerminal.sendText(venvCommandLine[0]);
        installTerminal.sendText('ato install ' + result);
        installTerminal.show();
    }
}

async function processChooseBuildTarget() {
    // check if a new build was created
    await _loadBuilds();

    const result = await window.showQuickPick(builds, {
        placeHolder: 'Choose build target',
    });
    // set the statusbar to the new text, ignore if canceled
    if (result) {
        statusbarAtoBuildTarget.text = String(result);
    }
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('atopile.create', () => {
            atoCreate();
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('atopile.build', () => {
            atoBuild();
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('atopile.install', () => {
            processInstallJlcpcb();
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('atopile.install_package', () => {
            processInstallPackage();
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('atopile.venv', () => {
            processVenv();
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('atopile.choose_build', () => {
            processChooseBuildTarget();
        }),
    );

    const commandAtoCreate = 'atopile.create';
    statusbarAtoCreate = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    statusbarAtoCreate.command = commandAtoCreate;
    statusbarAtoCreate.text = `$(plus)`;
    statusbarAtoCreate.tooltip = 'ato: create project/build';
    // statusbarAtoCreate.color = "#F95015";
    statusbarAtoCreate.show();

    const commandAtoInstall = 'atopile.install';
    statusbarAtoInstall = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    statusbarAtoInstall.command = commandAtoInstall;
    statusbarAtoInstall.text = `$(cloud-download)`;
    statusbarAtoInstall.tooltip = 'ato: install JLCPCB component';
    // statusbarAtoInstall.color = "#F95015";
    statusbarAtoInstall.show();

    const commandAtoInstallPackage = 'atopile.install_package';
    statusbarAtoInstallPackage = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    statusbarAtoInstallPackage.command = commandAtoInstallPackage;
    statusbarAtoInstallPackage.text = `$(package)`;
    statusbarAtoInstallPackage.tooltip = 'ato: install package';
    // statusbarAtoInstallPackage.color = "#F95015";
    statusbarAtoInstallPackage.show();

    const commandAtoBuild = 'atopile.build';
    statusbarAtoBuild = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    statusbarAtoBuild.command = commandAtoBuild;
    statusbarAtoBuild.text = `$(play)`;
    statusbarAtoBuild.tooltip = 'ato: build';
    // statusbarAtoBuild.color = "#F95015";
    statusbarAtoBuild.show();

    const commandAtoBuildTarget = 'atopile.choose_build';
    statusbarAtoBuildTarget = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    statusbarAtoBuildTarget.command = commandAtoBuildTarget;

    _loadBuilds();
}

async function _loadBuilds() {
    let ws = vscode.workspace.workspaceFolders![0].uri.path;
    let uri = vscode.Uri.file(ws + '/ato.yaml');

    // open ato.yaml file
    try {
        //
        builds = [];
        const file = await vscode.workspace.fs.readFile(uri);
        let fileStr = String.fromCharCode(...file);
        const data = yaml.load(fileStr) as AtoYaml;

        for (const k in data.builds) {
            // make things easy and put the target name in what is displayed, we
            // can parse it later without having to reload again
            builds.push(k + '-' + data.builds[k].entry);
        }
        statusbarAtoBuildTarget.text = builds[0];
        statusbarAtoBuildTarget.tooltip = 'ato: build target';
        statusbarAtoBuildTarget.show();
    } catch (error) {
        // do nothing
    }
}

export function deactivate() {}
