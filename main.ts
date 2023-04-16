import { App, FileSystemAdapter, Plugin, PluginSettingTab, Setting } from "obsidian";

interface SmartLinkSettings {
	pattern?: string;
	folder?: string;
	template?: string;
}

const SMART_LINK_DEFAULT_SETTINGS: SmartLinkSettings = {
	pattern: null,
	folder: null,
	template: null
}

export default class SmartLink extends Plugin {
	settings: SmartLinkSettings;

	async onload() {
		await this.loadSettings();

		this.registerEvent(this.app.vault.on('create', (file: TAbstractFile) => {
			if (this.settings.pattern && this.settings.folder) {
				let regex: RegExp = RegExp(this.settings.pattern);

				if (regex.test(file.name) && file.parent.name != this.settings.folder) {
					let target = this.app.vault.getRoot().path + this.settings.folder + "/" + file.name;
					this.app.vault.adapter.exists(target).then((exists) => {
						if (!exists) {
							let target: string = "/" + this.settings.folder + "/" + file.name;
							this.app.fileManager.renameFile(file, target).then(() => {
								if (this.settings.template && this.app.vault.adapter.exists(this.settings.template)) {
									this.app.vault.adapter.read(this.settings.template).then((contents) => {
										this.app.vault.adapter.append(target, contents).then(() => {});
									});
								}
							});
						}					
					});
				}
			}
		}));

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SmartLinkSettingsTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, SMART_LINK_DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


class SmartLinkSettingsTab extends PluginSettingTab {
	plugin: SmartLink;

	constructor(app: App, plugin: SmartLink) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Smart Link Settings.'});

		new Setting(containerEl)
			.setName('Filename pattern')
			.setDesc('Use a RegEx here to match on a filename that will be automatically moved to the target folder on creation.')
			.addText(text => text
				.setPlaceholder('Regular Expression')
				.setValue(this.plugin.settings.pattern)
				.onChange(async (value) => {
					this.plugin.settings.pattern = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Target Folder')
			.setDesc('When a new filename matches the above pattern, it will be moved into this folder.')
			.addText(text => text
				.setPlaceholder('Folder')
				.setValue(this.plugin.settings.folder)
				.onChange(async (value) => {
					this.plugin.settings.folder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Template')
			.setDesc('If a file is matched, it can be created with this optional template.')
			.addText(text => text
				.setPlaceholder('Template <optional>')
				.setValue(this.plugin.settings.template)
				.onChange(async (value) => {
					this.plugin.settings.template = value;
					await this.plugin.saveSettings();
				}));			
	}
}