import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';
import {ExtensionState} from 'resource:///org/gnome/shell/misc/extensionUtils.js';

export const METRICS = {};

function check(condition, message) {
    if (!condition)
        throw new Error(message);
}

export async function run() {
    const uuid = 'ollama-status@arnaudmetois';
    check(GLib.getenv('GSETTINGS_BACKEND') === 'keyfile',
        'Run this test with gnome-shell-test-tool in an isolated session');
    global.settings.set_boolean('disable-user-extensions', false);
    global.settings.set_strv('disabled-extensions', []);
    global.settings.set_strv('enabled-extensions', [uuid]);
    let extension;
    for (let attempt = 0; attempt < 100; attempt++) {
        extension = Main.extensionManager.lookup(uuid);
        if (extension?.state === ExtensionState.ACTIVE)
            break;
        await Scripting.sleep(100);
    }
    check(extension?.state === ExtensionState.ACTIVE,
        `Extension failed to activate: ${extension?.state}, ${extension?.error}`);
    check(!global.settings.get_boolean('disable-extension-version-validation'),
        'Version validation must remain enabled');

    const indicator = Main.panel.statusArea[uuid];
    check(indicator, 'Panel indicator is missing');
    await Scripting.sleep(3500);
    check(indicator._timerId > 0, 'Polling timer is missing');
    check(indicator._icon.get_style() === 'color: #e01b24' ||
        indicator._icon.get_style() === 'color: #33d17a', 'Status color is missing');

    indicator._apply({running: true, models: [
        {name: 'smoke-test', size: 1024, sizeVram: 0},
    ]});
    check(indicator._icon.get_style() === 'color: #33d17a', 'Loaded model must be green');
    indicator._showTooltip();
    check(indicator._tooltip.visible, 'Tooltip did not appear');
    check(indicator._tooltip.get_text().includes('smoke-test  1.0 KB RAM'),
        'Tooltip must display the model and memory');
    indicator._hideTooltip();
    check(!indicator._tooltip.visible, 'Tooltip did not hide');
    indicator._apply({running: false, models: []});
    check(indicator._icon.get_style() === 'color: #e01b24', 'Stopped status must be red');

    Main.extensionManager.disableExtension(uuid);
    for (let attempt = 0; attempt < 100 && !indicator._destroyed; attempt++)
        await Scripting.sleep(100);
    check(indicator._destroyed, 'Indicator was not destroyed');
    check(indicator._timerId === 0, 'Polling timer was not removed');
    check(indicator._hoverId === 0, 'Hover signal was not disconnected');
    check(indicator._tooltip === null, 'Tooltip was not destroyed');
    check(indicator._cancellable.is_cancelled(), 'Requests were not cancelled');
    check(!Main.panel.statusArea[uuid], 'Indicator remains in the panel');
    check(extension.state === ExtensionState.INACTIVE, 'Extension did not deactivate');
    check(!extension.errors?.length, `Extension errors: ${extension.errors}`);
    print('OllamaRunner smoke test passed: activation, polling, colors, tooltip, cleanup');
}
