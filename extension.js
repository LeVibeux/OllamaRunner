import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Soup from 'gi://Soup';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {
    statusColor,
    statusFromPsJson,
    stoppedStatus,
    tooltipText,
} from './lib/status.js';

const OLLAMA_PS_URL = 'http://127.0.0.1:11434/api/ps';
const POLL_SECONDS = 3;

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.0, 'Ollama Status', true);
        this._extension = extension;
        this._status = stoppedStatus();
        this._destroyed = false;
        this._timerId = 0;
        this._tooltip = null;
        this._cancellable = new Gio.Cancellable();
        this._http = new Soup.Session({timeout: 2});

        this._icon = new St.Icon({
            gicon: Gio.icon_new_for_string(`${extension.path}/icons/ollama-symbolic.svg`),
            style_class: 'system-status-icon',
        });
        this.add_child(this._icon);

        this._hoverId = this.connect('notify::hover', () => this._syncTooltip());
        this._apply(this._status);
        this._poll();
        this._timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, POLL_SECONDS, () => {
            this._poll();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _apply(status) {
        if (this._destroyed)
            return;
        this._status = status;
        this._icon.set_style(`color: ${statusColor(status)}`);
        this.accessible_name = tooltipText(status).replaceAll('\n', ', ');
        if (this.hover)
            this._syncTooltip();
    }

    _poll() {
        if (this._destroyed)
            return;
        const message = Soup.Message.new('GET', OLLAMA_PS_URL);
        this._http.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            this._cancellable,
            (session, result) => {
                if (this._destroyed || this._cancellable.is_cancelled())
                    return;
                try {
                    const bytes = session.send_and_read_finish(result);
                    if (message.get_status() !== Soup.Status.OK) {
                        this._apply(stoppedStatus());
                        return;
                    }
                    const text = new TextDecoder().decode(bytes.get_data());
                    this._apply(statusFromPsJson(text));
                } catch {
                    this._apply(stoppedStatus());
                }
            }
        );
    }

    _syncTooltip() {
        if (!this.hover) {
            this._hideTooltip();
            return;
        }
        this._showTooltip();
    }

    _showTooltip() {
        if (!this._tooltip) {
            this._tooltip = new St.Label({
                style_class: 'dash-label ollama-status-tooltip',
            });
            this._tooltip.clutter_text.line_wrap = false;
            Main.layoutManager.addTopChrome(this._tooltip);
        }
        this._tooltip.set_text(tooltipText(this._status));
        this._tooltip.show();
        this._positionTooltip();
    }

    _positionTooltip() {
        if (!this._tooltip)
            return;
        const [, width] = this._tooltip.get_preferred_width(-1);
        const [, height] = this._tooltip.get_preferred_height(-1);
        this._tooltip.set_size(width, height);

        const [x, y] = this.get_transformed_position();
        const [iconWidth, iconHeight] = this.get_transformed_size();
        let tx = Math.round(x + (iconWidth - width) / 2);
        const ty = Math.round(y + iconHeight + 6);
        const stageWidth = global.stage.width;
        tx = Math.max(4, Math.min(tx, stageWidth - width - 4));
        this._tooltip.set_position(tx, ty);
    }

    _hideTooltip() {
        this._tooltip?.hide();
    }

    destroy() {
        this._destroyed = true;
        if (this._timerId) {
            GLib.source_remove(this._timerId);
            this._timerId = 0;
        }
        if (this._hoverId) {
            this.disconnect(this._hoverId);
            this._hoverId = 0;
        }
        this._cancellable.cancel();
        this._hideTooltip();
        if (this._tooltip) {
            Main.layoutManager.removeChrome(this._tooltip);
            this._tooltip.destroy();
            this._tooltip = null;
        }
        this._http.abort();
        super.destroy();
    }
});

export default class OllamaStatusExtension extends Extension {
    enable() {
        this._indicator = new Indicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
    }
}
