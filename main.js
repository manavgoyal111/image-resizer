const path = require("path");
const os = require("os");
const fs = require("fs");
const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const resizeImg = require("resize-img");

// const isDev = process.env.NODE_ENV !== "production";
const isDev = !app.isPackaged;
const isMac = process.platform === "darwin";

let mainWindow;
let aboutWindow;

// Main Window
function createMainWindow() {
	mainWindow = new BrowserWindow({
		width: isDev ? 1000 : 500,
		height: 600,
		icon: `${__dirname}/assets/icons/Icon_256x256.png`,
		resizable: isDev,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: true,
			preload: path.join(__dirname, "preload.js"),
		},
	});

	// Show devtools automatically if in development
	if (isDev) {
		mainWindow.webContents.openDevTools();
	}

	mainWindow.loadFile(path.join(__dirname, "./renderer/index.html"));
}

// About Window
function createAboutWindow() {
	aboutWindow = new BrowserWindow({
		width: 300,
		height: 300,
		title: "About Electron",
		icon: `${__dirname}/assets/icons/Icon_256x256.png`,
	});

	aboutWindow.loadFile(path.join(__dirname, "./renderer/about.html"));
}

// When the app is ready, create the window
app.on("ready", () => {
	createMainWindow();

	const mainMenu = Menu.buildFromTemplate(menu);
	Menu.setApplicationMenu(mainMenu);

	// Remove variable from memory
	mainWindow.on("closed", () => (mainWindow = null));
});

// Menu template
const menu = [
	...(isMac
		? [
			{
				label: app.name,
				submenu: [
					{
						label: "About",
						click: createAboutWindow,
					},
				],
			},
		]
		: []),
	{
		label: "File",
		submenu: [
			{
				role: "reload",
			},
			{
				role: "quit",
			},
		],
	},
	{
		label: "Window",
		submenu: [
			{
				role: "minimize",
			},
			{
				role: "togglefullscreen",
			},
			{
				role: "resetZoom",
			},
			{ type: "separator" },
			{
				role: "close",
			},
		],
	},
	...(!isMac
		? [
			{
				label: "Help",
				submenu: [
					{
						label: "About",
						click: createAboutWindow,
					},
				],
			},
		]
		: []),
	...(isDev
		? [
			{
				label: "Developer",
				submenu: [
					{ role: "forcereload" },
					{ type: "separator" },
					{ role: "toggledevtools" },
				],
			},
		]
		: []),
];

// Respond to the resize image event
ipcMain.on("image:resize", (e, options) => {
	options.dest = path.join(os.homedir(), "Downloads");
	resizeImage(options);
});

// Resize and save image
async function resizeImage({ imgPath, height, width, dest }) {
	try {
		// Resize image
		const newPath = await resizeImg(fs.readFileSync(imgPath), {
			width: +width,
			height: +height,
		});

		// Get filename
		const filename = path.basename(imgPath);

		// Create destination folder if it doesn't exist
		if (!fs.existsSync(dest)) {
			fs.mkdirSync(dest);
		}

		// Write the file to the destination folder
		fs.writeFileSync(path.join(dest, filename), newPath);

		// Send success to renderer
		mainWindow.webContents.send("image:done");

		// Open the folder in the file explorer
		shell.openPath(dest);
	} catch (err) {
		console.log(err);
	}
}

// Quit when all windows are closed
app.on("window-all-closed", () => {
	if (!isMac) {
		app.quit();
	}
});

// Open a window if none are open (macOS)
app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createMainWindow();
	}
});
