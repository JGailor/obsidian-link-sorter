import { App, FileSystemAdapter, Modal, Plugin, PluginSettingTab, Setting } from "obsidian";

interface SmartLinkSettings {
	settings: SmartLinkSetting[];
}

interface SmartLinkSetting {
	name?: string;
	pattern?: string;
	folder?: string;
	template?: string;
}

const SMART_LINK_DEFAULT_SETTINGS: SmartLinkSettings = {
	settings: [
		{name: "People", pattern: "^@.*", folder: "People", template: "Templates/Person Template.md"},
		{name: "Places", pattern: ".*@$", folder: "Places", template: null}
	]
}

export default class SmartLink extends Plugin {
	settings: SmartLinkSettings;

	async onload() {
		await this.loadSettings();

		this.registerEvent(this.app.vault.on('create', (file: TAbstractFile) => {
			for (let idx = 0; idx < this.settings.settings.length; idx++) {
				let setting = this.settings.settings[idx];

				let regex: RegExp = RegExp(setting.pattern);

				if (regex.test(file.name) && file.parent.name != setting.folder) {
					let target = this.app.vault.getRoot().path + "/" + setting.folder + "/" + file.name;
					this.app.vault.adapter.exists(target).then((exists) => {
						if (!exists) {
							let target: string = "/" + setting.folder + "/" + file.name;
							this.app.fileManager.renameFile(file, target).then(() => {
								if (setting.template && this.app.vault.adapter.exists(setting.template)) {
									this.app.vault.adapter.read(setting.template).then((contents) => {
										this.app.vault.adapter.append(target, contents).then(() => {});
									});
								}
							});
						}					
					});
					break;
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
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Smart Link Settings.'});
		for (let idx = 0; idx < this.plugin.settings.settings.length; idx++) {
			let settingContainer = containerEl.createEl('div', {cls: 'setting-container'});
			settingContainer.createEl('span', {text: this.plugin.settings.settings[idx].name, cls: 'setting-name'});
			settingContainer.createEl('button', {text: 'edit', cls: 'settings-container-button'}).onClickEvent(() => {
				new SmartLinkSettingsModal(this.app, this.plugin.settings.settings[idx], async (result) => {
					if (result.name && result.pattern) {
						this.plugin.settings.settings[idx] = result;
						await this.plugin.saveSettings();
						this.display();
					}
				}).open();				
			});

			settingContainer.createEl('button', {text: 'delete', cls: 'settings-container-button'}).onClickEvent(async (el, ev) => {
				const removedSetting = this.plugin.settings.settings.splice(idx, 1);
				await this.plugin.saveSettings();
				this.display();
			});

			containerEl.createEl('br');
		}

		new Setting(containerEl)
			.addButton((btn) =>
				btn
					.setButtonText("New")
					.setCta()
					.onClick(() => {
						new SmartLinkSettingsModal(this.app, {name: null, pattern: null, folder: null, template: null}, async (result) => {
							if (result.name && result.pattern) {
								this.plugin.settings.settings.push(result);
								await this.plugin.saveSettings();
								this.display();
							}
						}).open();
					}));		
	}
}

class SmartLinkSettingsModal extends Modal {
	setting: SmartLinkSetting;
  	onSubmit: (result: SmartLinkSetting) => void;

  	constructor(app: App, setting: SmartLinkSetting, onSubmit: (result: SmartLinkSetting) => void) {
    	super(app);
    	this.setting = setting;
    	this.onSubmit = onSubmit;
  	}

  	onOpen() {
    	const { contentEl } = this;
    	// containerEl.empty();
    	contentEl.createEl('h2', {text: 'Smart Link Settings.'});

		new Setting(contentEl)
			.setName('Name')
			.setDesc('For future reference')
			.addText(text => text
				.setPlaceholder('Name')
				.setValue(this.setting.name)
				.onChange(async (value) => {
						this.setting.name = value;
				}));

		new Setting(contentEl)
			.setName('Filename pattern')
			.setDesc('Use a RegEx here to match on a filename that will be automatically moved to the target folder on creation.')
			.addText(text => text
				.setPlaceholder('Regular Expression')
				.setValue(this.setting.pattern)
				.onChange(async (value) => {
						this.setting.pattern = value;
				}));

		new Setting(contentEl)
			.setName('Target Folder')
			.setDesc('When a new filename matches the above pattern, it will be moved into this folder.')
			.addText(text => text
				.setPlaceholder('Folder')
				.setValue(this.setting.folder)
				.onChange(async (value) => {
						this.setting.folder = value;
				}));

		new Setting(contentEl)
			.setName('Template')
			.setDesc('If a file is matched, it can be created with this optional template.')
			.addText(text => text
				.setPlaceholder('Template <optional>')
				.setValue(this.setting.template)
				.onChange(async (value) => {
						this.setting.template = value;
				}));


		new Setting(contentEl)
			.addButton((btn) => 
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.setting);
					}));
  	}

  	onClose() {
    	let { contentEl } = this;
    	contentEl.empty();
  	}
}