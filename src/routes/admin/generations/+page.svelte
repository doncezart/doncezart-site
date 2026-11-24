<script>
    let { data } = $props();

    const RANGES = [['24h', '24 hours'], ['7d', '7 days'], ['30d', '30 days'], ['all', 'All time']];
    const SOURCES = [['all', 'All'], ['tool', 'Tool'], ['api', 'API']];

    const href = (patch) => {
        const p = new URLSearchParams({ range: data.range, source: data.source, ...patch });
        return `?${p}`;
    };

    const maxDay = $derived(Math.max(1, ...data.days.map((d) => d.tool + d.api)));

    function ago(d) {
        const s = (Date.now() - new Date(d).getTime()) / 1000;
        if (s < 60) return 'just now';
        if (s < 3600) return `${Math.floor(s / 60)}m ago`;
        if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
        if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
        return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    const dayLabel = (day) => new Date(day + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

    const ACTION = { load: 'Loaded', download: 'Downloaded', copy: 'Copied', render: 'API render' };
</script>

<svelte:head>
    <title>Generations | Admin</title>
</svelte:head>

<div class="gen-page">
    <div class="page-header">
        <div>
            <h1>Generations</h1>
            <p class="subtitle">YouTube cards made in the <a href="/tools/youtube-card" target="_blank">tool</a> and through the <a href="/tools/youtube-card#api" target="_blank">API</a></p>
        </div>
        <div class="filters">
            <div class="seg" role="group" aria-label="Range">
                {#each RANGES as [k, label]}
                    <a href={href({ range: k })} class:on={data.range === k}>{label}</a>
                {/each}
            </div>
            <div class="seg" role="group" aria-label="Source">
                {#each SOURCES as [k, label]}
                    <a href={href({ source: k })} class:on={data.source === k}>{label}</a>
                {/each}
            </div>
        </div>
    </div>

    {#if data.missing}
        <div class="empty-state">
            <p>The <code>card_generation</code> table doesn't exist yet. Run <code>drizzle/manual/004_card_generation.sql</code>.</p>
        </div>
    {:else}
        <div class="stats">
            <div class="stat"><span class="num">{data.stats.total}</span><span class="label">Events</span></div>
            <div class="stat"><span class="num">{data.stats.videos}</span><span class="label">Videos</span></div>
            <div class="stat"><span class="num">{data.stats.loads}</span><span class="label">Loaded in tool</span></div>
            <div class="stat"><span class="num">{data.stats.exports}</span><span class="label">Exported from tool</span></div>
            <div class="stat"><span class="num">{data.stats.api}</span><span class="label">API renders</span></div>
            <div class="stat"><span class="num">{data.stats.clients}</span><span class="label">Unique visitors</span></div>
        </div>

        {#if data.days.length > 1}
            <div class="panel">
                <div class="panel-head">
                    <h2>Per day</h2>
                    <div class="legend"><span class="dot tool"></span>Tool <span class="dot api"></span>API</div>
                </div>
                <div class="chart" style="--n: {data.days.length}">
                    {#each data.days as d}
                        <div class="col" title="{dayLabel(d.day)}: {d.tool} tool, {d.api} API">
                            <div class="bar">
                                <span class="api" style="height: {(d.api / maxDay) * 100}%"></span>
                                <span class="tool" style="height: {(d.tool / maxDay) * 100}%"></span>
                            </div>
                            <span class="day">{dayLabel(d.day)}</span>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        <div class="panel">
            <div class="panel-head"><h2>Top videos</h2></div>
            {#if data.videos.length === 0}
                <p class="none">No cards in this range yet.</p>
            {:else}
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Video</th>
                                <th class="n">Total</th>
                                <th class="n">Loaded</th>
                                <th class="n">Exported</th>
                                <th class="n">API</th>
                                <th class="n">Visitors</th>
                                <th>Last</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each data.videos as v}
                                <tr>
                                    <td>
                                        <a class="video" href="https://www.youtube.com/watch?v={v.videoId}" target="_blank" rel="noopener noreferrer">
                                            <img src="https://i.ytimg.com/vi/{v.videoId}/mqdefault.jpg" alt="" loading="lazy" />
                                            <span class="meta">
                                                <span class="title">{v.title ?? v.videoId}</span>
                                                <span class="channel">{v.channel ?? ''}</span>
                                            </span>
                                        </a>
                                    </td>
                                    <td class="n strong">{v.total}</td>
                                    <td class="n">{v.loads}</td>
                                    <td class="n">{v.exports}</td>
                                    <td class="n">{v.api}</td>
                                    <td class="n">{v.clients}</td>
                                    <td class="muted">{ago(v.lastAt)}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </div>

        {#if data.callers.length}
            <div class="panel">
                <div class="panel-head"><h2>API callers</h2><span class="hint">by referring site</span></div>
                <div class="table-wrap">
                    <table>
                        <thead><tr><th>Site</th><th class="n">Renders</th><th class="n">Callers</th><th>Last</th></tr></thead>
                        <tbody>
                            {#each data.callers as c}
                                <tr>
                                    <td>{c.referrer}</td>
                                    <td class="n strong">{c.total}</td>
                                    <td class="n">{c.clients}</td>
                                    <td class="muted">{ago(c.lastAt)}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>
        {/if}

        <div class="panel">
            <div class="panel-head"><h2>Recent activity</h2><span class="hint">last 100</span></div>
            {#if data.recent.length === 0}
                <p class="none">Nothing yet.</p>
            {:else}
                <div class="table-wrap">
                    <table>
                        <thead><tr><th>When</th><th>What</th><th>Video</th><th>Layout</th><th>Format</th></tr></thead>
                        <tbody>
                            {#each data.recent as r}
                                <tr>
                                    <td class="muted nowrap" title={new Date(r.createdAt).toLocaleString('en-GB')}>{ago(r.createdAt)}</td>
                                    <td class="nowrap"><span class="badge {r.source}">{ACTION[r.action] ?? r.action}</span></td>
                                    <td class="clip">
                                        <a href="https://www.youtube.com/watch?v={r.videoId}" target="_blank" rel="noopener noreferrer">{r.title ?? r.videoId}</a>
                                        {#if r.channel}<span class="muted"> · {r.channel}</span>{/if}
                                    </td>
                                    <td class="muted">{r.layout ?? '–'}</td>
                                    <td class="muted">{r.format ?? '–'}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .gen-page { padding: 2rem; display: flex; flex-direction: column; gap: 1.25rem; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
    .page-header h1 { font-size: 1.5rem; font-weight: 600; margin: 0; }
    .subtitle { margin: 0.25rem 0 0; font-size: 0.85rem; color: rgba(255, 255, 255, 0.45); }
    .subtitle a { color: rgba(255, 255, 255, 0.75); }

    .filters { display: flex; gap: 0.6rem; flex-wrap: wrap; }
    .seg {
        display: flex;
        padding: 0.2rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.03);
    }
    .seg a {
        padding: 0.35rem 0.8rem;
        border-radius: 999px;
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.55);
        text-decoration: none;
        white-space: nowrap;
    }
    .seg a:hover { color: #fff; }
    .seg a.on { color: #fff; background: rgba(255, 51, 51, 0.18); }

    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: 0.75rem; }
    .stat {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        padding: 1rem 1.1rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 0.75rem;
        background: rgba(255, 255, 255, 0.03);
    }
    .num { font-size: 1.6rem; font-weight: 600; font-variant-numeric: tabular-nums; }
    .label { font-size: 0.78rem; color: rgba(255, 255, 255, 0.45); }

    .panel {
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 0.75rem;
        background: rgba(255, 255, 255, 0.03);
        overflow: hidden;
    }
    .panel-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.9rem 1rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .panel-head h2 { margin: 0; font-size: 0.95rem; font-weight: 600; }
    .hint { font-size: 0.75rem; color: rgba(255, 255, 255, 0.4); }
    .none { margin: 0; padding: 1.25rem 1rem; color: rgba(255, 255, 255, 0.4); font-size: 0.88rem; }

    .legend { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; color: rgba(255, 255, 255, 0.5); }
    .dot { width: 0.55rem; height: 0.55rem; border-radius: 2px; display: inline-block; }
    .dot.api { margin-left: 0.5rem; }
    .dot.tool, .bar .tool { background: #ff3333; }
    .dot.api, .bar .api { background: rgba(255, 255, 255, 0.55); }

    .chart {
        display: grid;
        grid-template-columns: repeat(var(--n), 1fr);
        gap: 4px;
        height: 150px;
        padding: 1rem 1rem 0.75rem;
    }
    .col { display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
    .bar {
        flex: 1;
        display: flex;
        flex-direction: column-reverse;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.03);
        overflow: hidden;
    }
    .bar span { display: block; width: 100%; }
    .day {
        font-size: 0.62rem;
        color: rgba(255, 255, 255, 0.35);
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
    }
    .chart[style*="--n: 30"] .col:nth-child(even) .day { visibility: hidden; }

    .table-wrap { overflow-x: auto; }
    table { width: 100%; min-width: 640px; border-collapse: collapse; }
    th {
        text-align: left;
        padding: 0.65rem 1rem;
        font-size: 0.72rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: rgba(255, 255, 255, 0.45);
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    td { padding: 0.6rem 1rem; font-size: 0.86rem; border-top: 1px solid rgba(255, 255, 255, 0.04); vertical-align: middle; }
    .n { text-align: right; font-variant-numeric: tabular-nums; }
    .strong { font-weight: 600; }
    .muted { color: rgba(255, 255, 255, 0.45); }
    .nowrap { white-space: nowrap; }
    .clip { max-width: 28rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    td a { color: #fff; text-decoration: none; }
    td a:hover { text-decoration: underline; }

    .video { display: flex; align-items: center; gap: 0.75rem; min-width: 0; }
    .video:hover { text-decoration: none !important; }
    .video img { width: 88px; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 6px; flex-shrink: 0; background: #222; }
    .video .meta { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
    .video .title { max-width: 26rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
    .video .channel { font-size: 0.78rem; color: rgba(255, 255, 255, 0.45); }

    .badge { font-size: 0.72rem; padding: 0.15rem 0.5rem; border-radius: 999px; }
    .badge.tool { background: rgba(255, 51, 51, 0.15); color: #ff8080; }
    .badge.api { background: rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.85); }

    .empty-state { padding: 3rem; text-align: center; color: rgba(255, 255, 255, 0.5); }
    code { padding: 0.1em 0.35em; border-radius: 4px; background: rgba(255, 255, 255, 0.08); font-size: 0.85em; }

    @media (max-width: 666px) {
        .gen-page { padding: 1rem; }
    }
</style>
