const vscode = require("vscode");
const os = require("os");
const path = require("path");
var fs = require("fs");
var copydir = require("copy-dir");
const { spawnSync } = require("child_process");

let newprojdir;
let template_path = path.join(
  os.homedir(),
  ".vscode",
  "extensions",
  "django-pyqt",
  "template"
);

function showInfo(word) {
  vscode.window.showInformationMessage(word);
}
function showError(word) {
  vscode.window.showErrorMessage(word);
}

function runManageCommand(command, dirName="", extension = "", dirOnly = false, general=false) {
  const rootPath = vscode.workspace.rootPath;
  const usedDir = path.join(rootPath, dirName);
  const manage = path.join(rootPath, "manage.py");
  if (general && fs.existsSync(manage))
  {
    if (command == "runserver")
    {
      showInfo("Whoohoo .. we don't do that here, this framework is serverless")
      return
    }
    let out = spawnSync("python3", [manage, command]);
    showInfo(out.stdout.toString());
    showError(out.stderr.toString());
    return
  }
  
  if (command === "deploy" && fs.existsSync(manage))
  {
    let out = spawnSync("python3", [manage, command]);
    showInfo(out.stdout.toString());
    showError(out.stderr.toString());
    return
  }
  if (!fs.existsSync(usedDir) || !fs.existsSync(manage)) {
    showInfo("Please make sure you're inside the project directory");
    return;
  }
  const all_files = ["All"];
  let quickPickOpts = { canPickMany: false };
  let files = fs.readdirSync(usedDir);
  for (let i = 0; i < files.length; i++) {
    if (extension.length > 0) {
      if (files[i].endsWith(extension)) all_files.push(files[i]);
    } else if (dirOnly === true) {
      if (fs.statSync(path.join(usedDir, files[i])).isDirectory())
        all_files.push(files[i]);
    }
  }
  vscode.window.showQuickPick(all_files, quickPickOpts).then(selected => {
    if (selected) {
      if (selected === "All") {
        let out = spawnSync("python3", [manage, command]);
        showInfo(out.stdout.toString());
        showError(out.stderr.toString());
      } else {
        let out = spawnSync("python3", [manage, command, selected]);
        showInfo(out.stdout.toString());
        showError(out.stderr.toString());
      }
    } else {
      if (command === "uic") showInfo("Please select a .ui file");
      if (command === "rcc") showInfo("Please select a .qrc file");
      if (command === "makemigrations" || command === "migrate")
        showInfo("Please select an installed app");
    }
  });
}

function activate(context) {
  let n_proj = vscode.commands.registerCommand(
    "extension.newProject",
    function() {
      const proj_name_input_opt = {
        placeHolder: "My Project",
        prompt: "Choose a cool name for your project",
        password: false,
        ignoreFocusOut: true
      };
      vscode.window.showInputBox(proj_name_input_opt).then(input => {
        if (input) {
          const OpenDialogOptions = {
            defaultUri: vscode.Uri.file(os.homedir()),
            openLabel: "Create here",
            canSelectFiles: false,
            canSelectFolders: true
          };
          vscode.window.showOpenDialog(OpenDialogOptions).then(uri => {
            if (uri) {
              newprojdir = path.join(uri[0].path, input);
              const proj_uri = new vscode.Uri({
                scheme: "file",
                path: newprojdir
              });
              if (!fs.existsSync(newprojdir)) {
                fs.mkdirSync(newprojdir);
                copydir.sync(template_path, newprojdir);
                vscode.workspace.updateWorkspaceFolders(0, 0, {
                  uri: proj_uri
                });
                vscode.commands.executeCommand("vscode.openFolder", proj_uri);
              } else {
                showInfo(
                  "Oops, a directory with the same name already exists!"
                );
              }
            } else {
              showInfo("Django-PyQt : Choose a directory for that cool name !");
            }
          });
        } else {
          showInfo("Django-PyQt : Come on, choose a name already :P");
        }
      });
    }
  );


  let startapp_ = vscode.commands.registerCommand(
    "extension.startapp",
    function() {
      const rootPath = vscode.workspace.rootPath;
      const manage = path.join(rootPath, "manage.py");
      if (!fs.existsSync(manage)) {
        showInfo("Please make sure you're inside the project directory");
        return;
      }
      const app_name_opts = {
        placeHolder: "myapp1 myapp2",
        prompt: "Insert app(s) name(s)",
        password: false,
        ignoreFocusOut: true
      };

      let cmd_list = [manage, "startapp"];
      vscode.window.showInputBox(app_name_opts).then(input => {
        if (input) {
          let input_list = input.trim().split(" ");
          for (let i = 0; i < input_list.length; i++) {
            cmd_list.push(input_list[i]);
          }
          const out = spawnSync("python3", cmd_list);
          showInfo(out.stdout.toString());
        } else {
          showInfo("Please enter valid app name");
        }
      });
    }
  );


  let uic_ = vscode.commands.registerCommand("extension.uic", () =>
    runManageCommand("uic", "forms", ".ui", false)
  );

  let rcc_ = vscode.commands.registerCommand("extension.rcc", () =>
    runManageCommand("rcc", "resources", ".qrc", false)
  );


  let makemigrations_ = vscode.commands.registerCommand(
    "extension.makemigrations",
    () => runManageCommand("makemigrations", "apps", "", true)
  );

  let migrate_ = vscode.commands.registerCommand("extension.migrate", () =>
    runManageCommand("migrate", "apps", "", true)
  );
 
  let deploy_ = vscode.commands.registerCommand("extension.deploy", () =>
  runManageCommand("deploy")
);
  let manage_ = vscode.commands.registerCommand("extension.manage", () =>
  {
      const manageComOpts = {
      placeHolder: "manage.py command",
      prompt: "Type a django manage.py command",
      password: false,
      ignoreFocusOut: true
    };
    vscode.window.showInputBox(manageComOpts).then(input => {
    if (input) {
      runManageCommand(input,"","",false,true)
    } else {
      showInfo("Please Enter a django command")
    }})
  });
  context.subscriptions.push(n_proj);
  context.subscriptions.push(uic_);
  context.subscriptions.push(rcc_);
  context.subscriptions.push(startapp_);
  context.subscriptions.push(makemigrations_);
  context.subscriptions.push(migrate_);
  context.subscriptions.push(deploy_);
  context.subscriptions.push(manage_);

}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}
exports.deactivate = deactivate;
