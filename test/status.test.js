import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import {
    formatBytes,
    panelStyleClass,
    statusColor,
    statusFromPsJson,
    stoppedStatus,
    tooltipText,
} from '../lib/status.js';

test('stoppedStatus is not running and has no models', () => {
    assert.deepEqual(stoppedStatus(), {running: false, models: []});
});

test('statusFromPsJson marks the daemon running even with no models', () => {
    assert.deepEqual(statusFromPsJson('{"models":[]}'), {running: true, models: []});
});

test('statusFromPsJson maps loaded models and memory', () => {
    const json = JSON.stringify({
        models: [{
            name: 'qwen3.8-27b-16k:latest',
            size: 16108014795,
            size_vram: 0,
        }],
    });
    assert.deepEqual(statusFromPsJson(json), {
        running: true,
        models: [{
            name: 'qwen3.8-27b-16k:latest',
            size: 16108014795,
            sizeVram: 0,
        }],
    });
});

test('statusFromPsJson treats invalid payloads as stopped', () => {
    assert.deepEqual(statusFromPsJson('not-json'), stoppedStatus());
    assert.deepEqual(statusFromPsJson('{}'), stoppedStatus());
    assert.deepEqual(statusFromPsJson('{"models":"nope"}'), stoppedStatus());
});

test('formatBytes uses binary units', () => {
    assert.equal(formatBytes(0), '0 B');
    assert.equal(formatBytes(1024), '1.0 KB');
    assert.equal(formatBytes(2241352169), '2.1 GB');
    assert.equal(formatBytes(16108014795), '15.0 GB');
});

test('tooltipText describes a stopped daemon', () => {
    assert.equal(tooltipText(stoppedStatus()), 'Ollama is not running');
});

test('tooltipText describes a running daemon with no models', () => {
    assert.equal(
        tooltipText({running: true, models: []}),
        'Ollama is running\nNo models loaded'
    );
});

test('tooltipText lists models and RAM when nothing is on VRAM', () => {
    const text = tooltipText({
        running: true,
        models: [{name: 'qwen3.5-0.8b:latest', size: 2241352169, sizeVram: 0}],
    });
    assert.equal(
        text,
        'Ollama is running\n\nqwen3.5-0.8b:latest  2.1 GB RAM\n\nTotal  2.1 GB'
    );
});

test('tooltipText splits RAM and VRAM when a model is partially on GPU', () => {
    const text = tooltipText({
        running: true,
        models: [{name: 'llama3:8b', size: 8 * 1024 ** 3, sizeVram: 6 * 1024 ** 3}],
    });
    assert.equal(
        text,
        'Ollama is running\n\nllama3:8b  2.0 GB RAM + 6.0 GB VRAM\n\nTotal  8.0 GB'
    );
});

test('panelStyleClass is red without a loaded model and green with one', () => {
    assert.equal(panelStyleClass(stoppedStatus()), 'ollama-status-stopped');
    assert.equal(panelStyleClass({running: true, models: []}), 'ollama-status-stopped');
    assert.equal(
        panelStyleClass({running: true, models: [{name: 'llama3:8b', size: 1, sizeVram: 0}]}),
        'ollama-status-running'
    );
});

test('statusColor is red without a loaded model and green with one', () => {
    assert.equal(statusColor(stoppedStatus()), '#e01b24');
    assert.equal(statusColor({running: true, models: []}), '#e01b24');
    assert.equal(statusColor({running: true, models: [{name: 'llama3:8b'}]}), '#33d17a');
});

test('symbolic icon uses the GNOME recolorable foreground fill', () => {
    const icon = readFileSync(new URL('../icons/ollama-symbolic.svg', import.meta.url), 'utf8');
    assert.match(icon, /fill=["']#bebebe["']/i);
});

test('indicator applies the status color as an inline style', () => {
    const extension = readFileSync(new URL('../extension.js', import.meta.url), 'utf8');
    assert.match(extension, /set_style\(`color:\s*\$\{statusColor\(status\)\}`\)/);
});
