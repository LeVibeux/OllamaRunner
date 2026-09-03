export function stoppedStatus() {
    return {running: false, models: []};
}

export function statusFromPsJson(text) {
    try {
        const payload = JSON.parse(text);
        if (!Array.isArray(payload?.models))
            return stoppedStatus();

        const models = [];
        for (const model of payload.models) {
            const name = typeof model?.name === 'string' && model.name
                ? model.name
                : typeof model?.model === 'string' ? model.model : '';
            if (!name)
                continue;
            models.push({
                name,
                size: finiteSize(model.size),
                sizeVram: finiteSize(model.size_vram),
            });
        }
        return {running: true, models};
    } catch {
        return stoppedStatus();
    }
}

export function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0)
        return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }
    if (unit === 0)
        return `${Math.round(value)} B`;
    return `${value.toFixed(1)} ${units[unit]}`;
}

export function tooltipText(status) {
    if (!status?.running)
        return 'Ollama is not running';
    if (!status.models?.length)
        return 'Ollama is running\nNo models loaded';

    const lines = status.models.map(model =>
        `${model.name}  ${modelMemoryLabel(model)}`
    );
    const total = status.models.reduce((sum, model) => sum + finiteSize(model.size), 0);
    return `Ollama is running\n\n${lines.join('\n')}\n\nTotal  ${formatBytes(total)}`;
}

export function panelStyleClass(status) {
    return status?.running && status.models?.length > 0
        ? 'ollama-status-running'
        : 'ollama-status-stopped';
}

export function statusIconFilename(status) {
    return status?.running && status.models?.length > 0
        ? 'ollama-running.svg'
        : 'ollama-stopped.svg';
}

function modelMemoryLabel(model) {
    const total = finiteSize(model.size);
    const vram = Math.min(total, finiteSize(model.sizeVram));
    const ram = Math.max(0, total - vram);
    if (vram > 0 && ram > 0)
        return `${formatBytes(ram)} RAM + ${formatBytes(vram)} VRAM`;
    if (vram > 0)
        return `${formatBytes(vram)} VRAM`;
    return `${formatBytes(total)} RAM`;
}

function finiteSize(value) {
    return Number.isFinite(value) && value > 0 ? value : 0;
}
