import { Plugin, PluginSettingTab, Setting, App } from 'obsidian';
import { bmdExtension } from './src/bmd-extension';

export interface BMDSettings {
  enabled: boolean;
  leftColumnWidth: number;
  cardBorderRadius: number;
  imageMaxHeight: number;
  triggerPrefixes: string[];
  enableOnMobile: boolean;
}

export const DEFAULT_SETTINGS: BMDSettings = {
  enabled: true,
  leftColumnWidth: 200,
  cardBorderRadius: 8,
  imageMaxHeight: 120,
  triggerPrefixes: ['-', '1-'],
  enableOnMobile: true
};

export default class BMDPlugin extends Plugin {
  settings: BMDSettings;

  async onload() {
    await this.loadSettings();
    
    // Register CodeMirror 6 extension for Live Preview
    this.registerEditorExtension(bmdExtension(this.settings));
    
    // Add settings tab
    this.addSettingTab(new BMDSettingTab(this.app, this));
    
    // Add command to toggle BMD
    this.addCommand({
      id: 'toggle-bmd',
      name: 'Toggle Bulleted Markdown rendering',
      callback: () => {
        this.settings.enabled = !this.settings.enabled;
        this.saveSettings();
        // Reload the view to apply changes
        this.app.workspace.activeEditor?.editor?.refresh();
      }
    });

    console.log('Bulleted Markdown plugin loaded');
  }

  onunload() {
    console.log('Bulleted Markdown plugin unloaded');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class BMDSettingTab extends PluginSettingTab {
  plugin: BMDPlugin;

  constructor(app: App, plugin: BMDPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Bulleted Markdown Settings' });

    new Setting(containerEl)
      .setName('Enable BMD rendering')
      .setDesc('Toggle the card layout rendering in Live Preview')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enabled)
        .onChange(async (value) => {
          this.plugin.settings.enabled = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Left column width')
      .setDesc('Width of the left column in pixels')
      .addSlider(slider => slider
        .setLimits(100, 400, 10)
        .setValue(this.plugin.settings.leftColumnWidth)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.leftColumnWidth = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Card border radius')
      .setDesc('Border radius of the card container in pixels')
      .addSlider(slider => slider
        .setLimits(0, 20, 1)
        .setValue(this.plugin.settings.cardBorderRadius)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.cardBorderRadius = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Image max height')
      .setDesc('Maximum height of images in the card in pixels')
      .addSlider(slider => slider
        .setLimits(50, 300, 10)
        .setValue(this.plugin.settings.imageMaxHeight)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.imageMaxHeight = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Enable on mobile')
      .setDesc('Enable BMD rendering on mobile devices')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableOnMobile)
        .onChange(async (value) => {
          this.plugin.settings.enableOnMobile = value;
          await this.plugin.saveSettings();
        }));
  }
}
