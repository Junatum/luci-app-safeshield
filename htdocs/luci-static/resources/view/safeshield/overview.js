'use strict';

'require poll';
'require rpc';
'require view';

var callStatus = rpc.declare({
	object: 'safeshield',
	method: 'status',
	expect: { }
});

function asText(value, fallback) {
	if (value === null || value === undefined || value === '')
		return fallback || '-';

	if (typeof value === 'boolean')
		return value ? _('Yes') : _('No');

	return String(value);
}

function formatBool(value) {
	if (value === true || value === 1 || value === '1')
		return _('Yes');
	if (value === false || value === 0 || value === '0')
		return _('No');
	return '-';
}

function formatNumber(value) {
	if (value === null || value === undefined || value === '')
		return '-';
	return String(value);
}

function formatSizeKb(value) {
	if (value === null || value === undefined || value === '')
		return '-';
	return String(value) + ' KB';
}

function formatHash(value) {
	if (!value)
		return '-';

	var text = String(value);
	return text.length > 24 ? text.substring(0, 16) + '…' + text.substring(text.length - 8) : text;
}

function formatTimestamp(value) {
	var n, date;

	if (!value)
		return '-';

	if (typeof value === 'number') {
		n = value;
	}
	else if (typeof value === 'string' && /^\d+$/.test(value)) {
		n = Number(value);
	}
	else {
		date = new Date(value);
		return isNaN(date.getTime()) ? String(value) : date.toLocaleString();
	}

	if (!n)
		return '-';

	/* SafeShield RPC returns Unix timestamps in seconds. JavaScript Date expects milliseconds. */
	if (n < 100000000000)
		n = n * 1000;

	date = new Date(n);
	return isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function formatDuration(value) {
	var n, days, hours, minutes, seconds, parts = [];

	if (value === null || value === undefined || value === '')
		return '-';

	n = Number(value);
	if (isNaN(n) || n < 0)
		return String(value);

	seconds = Math.floor(n);
	days = Math.floor(seconds / 86400);
	seconds = seconds % 86400;
	hours = Math.floor(seconds / 3600);
	seconds = seconds % 3600;
	minutes = Math.floor(seconds / 60);
	seconds = seconds % 60;

	if (days)
		parts.push(days + 'd');
	if (hours)
		parts.push(hours + 'h');
	if (minutes)
		parts.push(minutes + 'm');
	if (seconds || !parts.length)
		parts.push(seconds + 's');

	return parts.join(' ');
}

function badgeClass(value) {
	switch (String(value || '').toLowerCase()) {
	case 'ok':
	case 'ready':
	case 'success':
	case 'active':
		return 'label success';
	case 'running':
	case 'refreshing':
	case 'pending':
	case 'notice':
		return 'label notice';
	case 'warning':
	case 'warn':
	case 'degraded':
		return 'label warning';
	case 'error':
	case 'failed':
	case 'failure':
	case 'expired':
	case 'revoked':
	case 'suspended':
		return 'label danger';
	default:
		return 'label';
	}
}

function badge(value, fallback) {
	var text = asText(value, fallback || '-');
	return E('span', { 'class': badgeClass(text) }, [ text ]);
}

function row(label, value) {
	var children;

	if (Array.isArray(value))
		children = value;
	else if (value && typeof value === 'object')
		children = [ value ];
	else
		children = [ asText(value) ];

	return E('tr', {}, [
		E('th', { 'style': 'width: 32%' }, [ label ]),
		E('td', {}, children)
	]);
}

function table(rows) {
	return E('table', { 'class': 'table' }, rows);
}

function section(title, rows) {
	return E('div', { 'class': 'cbi-section' }, [
		E('h3', {}, [ title ]),
		table(rows)
	]);
}

function renderMessage(message) {
	if (typeof message === 'string')
		return message;

	if (message && typeof message === 'object') {
		if (message.message)
			return message.message;
		if (message.code)
			return message.code;
		return JSON.stringify(message);
	}

	return asText(message);
}

function renderMessages(title, items, className) {
	if (!items || !items.length)
		return null;

	return E('div', { 'class': 'cbi-section' }, [
		E('h3', {}, [ title ]),
		E('ul', { 'class': className || '' }, items.map(function(item) {
			return E('li', {}, [ renderMessage(item) ]);
		}))
	]);
}

function renderSummary(summary) {
	if (!summary)
		return '-';

	if (typeof summary === 'string')
		return summary;

	return [
		E('span', { 'class': badgeClass(summary.severity || summary.label) }, [ asText(summary.label, '-') ]),
		' ',
		asText(summary.message, '-')
	];
}

function renderSources(sources) {
	var items = (sources && sources.items) || [];
	var body;

	if (!items.length) {
		body = [ E('tr', {}, [ E('td', { 'colspan': 8 }, [ _('No sources reported by SafeShield.') ]) ]) ];
	}
	else {
		body = items.map(function(item) {
			return E('tr', {}, [
				E('td', {}, [ asText(item.name || item.id) ]),
				E('td', {}, [ asText(item.action || sources.mode) ]),
				E('td', {}, [ formatBool(item.enabled) ]),
				E('td', {}, [ badge(item.last_result) ]),
				E('td', {}, [ formatNumber(item.line_count) ]),
				E('td', {}, [ formatSizeKb(item.size_kb) ]),
				E('td', {}, [ asText(item.artifact_tier) ]),
				E('td', {}, [ asText(item.artifact_version) ])
			]);
		});
	}

	return E('div', { 'class': 'cbi-section' }, [
		E('h3', {}, [ _('Sources') ]),
		E('table', { 'class': 'table' }, [
			E('tr', { 'class': 'tr table-titles' }, [
				E('th', {}, [ _('Name') ]),
				E('th', {}, [ _('Mode / action') ]),
				E('th', {}, [ _('Enabled') ]),
				E('th', {}, [ _('Last result') ]),
				E('th', {}, [ _('Domains / lines') ]),
				E('th', {}, [ _('Size') ]),
				E('th', {}, [ _('Tier') ]),
				E('th', {}, [ _('Version') ])
			])
		].concat(body))
	]);
}

function renderHealth(checks) {
	var names = [
		[ 'api_resolve', _('Artifact metadata resolve') ],
		[ 'artifact_download', _('Artifact download') ],
		[ 'artifact_sha256', _('Artifact SHA-256') ],
		[ 'dnsmasq_binary', _('dnsmasq binary') ],
		[ 'dnsmasq_confdir', _('dnsmasq confdir') ],
		[ 'dnsmasq_initial_restart', _('Initial dnsmasq restart') ],
		[ 'dnsmasq_final_restart', _('Final dnsmasq restart') ],
		[ 'dns_runtime', _('DNS runtime') ],
		[ 'blocklist_verify', _('Blocklist verify') ],
		[ 'min_valid_line_count', _('Minimum valid rule count') ],
		[ 'max_file_size', _('Maximum file size') ]
	];

	return section(_('Health checks'), names.map(function(item) {
		var value = checks ? checks[item[0]] : null;
		return row(item[1], badge(value));
	}));
}

function renderStatus(data) {
	var status = data || {};
	var runtime = status.runtime || {};
	var license = status.license || {};
	var device = status.device || {};
	var deviceConfigured = device.configured || {};
	var artifact = status.artifact || {};
	var localOverrides = status.local_overrides || {};
	var blocklist = status.blocklist || {};
	var sources = status.sources || {};
	var health = status.health || {};
	var timestamps = status.timestamps || {};
	var schema = status.schema || {};

	var warnings = renderMessages(_('Warnings'), status.warnings, '');
	var errors = renderMessages(_('Errors'), status.errors, '');

	var nodes = [
		E('h2', {}, [ _('SafeShield') ]),

		section(_('Current status'), [
			row(_('Status'), badge(status.status)),
			row(_('Stage'), badge(status.stage)),
			row(_('Summary'), renderSummary(status.summary)),
			row(_('Version'), status.version),
			row(_('Schema'), schema.name ? schema.name + ' v' + asText(schema.version) : '-'),
			row(_('Enabled'), formatBool(status.enabled)),
			row(_('Active'), formatBool(status.active)),
			row(_('Health'), badge(health.overall)),
			row(_('Generated at'), formatTimestamp(timestamps.generated_at)),
			row(_('Last attempt'), formatTimestamp(timestamps.last_attempt)),
			row(_('Last success'), formatTimestamp(timestamps.last_success)),
			row(_('Last failure'), formatTimestamp(timestamps.last_failure))
		]),

		section(_('Runtime'), [
			row(_('Refresh daemon running'), formatBool(runtime.refreshd_running)),
			row(_('dnsmasq running'), formatBool(runtime.dnsmasq_running)),
			row(_('DNS runtime OK'), formatBool(runtime.dns_runtime_ok)),
			row(_('Config loaded'), formatBool(runtime.config_loaded)),
			row(_('Require WAN'), formatBool(runtime.require_wan)),
			row(_('Refresh on boot'), formatBool(runtime.refresh_on_boot)),
			row(_('Last result'), badge(runtime.last_result)),
			row(_('Last error code'), runtime.last_error_code)
		]),


		section(_('License'), [
			row(_('Configured'), formatBool(license.configured)),
			row(_('Masked key'), license.key_masked),
			row(_('Plan'), license.plan),
			row(_('Status'), badge(license.status))
		]),

		section(_('Device'), [
			row(_('Runtime fingerprint'), device.fingerprint),
			row(_('Runtime profile'), device.profile),
			row(_('Configured fingerprint'), deviceConfigured.fingerprint),
			row(_('Vendor'), deviceConfigured.vendor),
			row(_('Model'), deviceConfigured.model),
			row(_('Architecture'), deviceConfigured.arch),
			row(_('Memory'), deviceConfigured.memory_mb ? deviceConfigured.memory_mb + ' MB' : '-')
		]),

		section(_('Hub artifact'), [
			row(_('Resolved'), formatBool(artifact.resolved)),
			row(_('Tier'), artifact.tier),
			row(_('Version'), artifact.version),
			row(_('SHA-256'), formatHash(artifact.sha256)),
			row(_('Unique domains'), formatNumber(artifact.unique_domains)),
			row(_('Rules'), formatNumber(artifact.rules)),
			row(_('Download URL present'), formatBool(artifact.download_url_present))
		]),

		section(_('Local overrides'), [
			row(_('Enabled'), formatBool(localOverrides.enabled)),
			row(_('Allowlist path'), localOverrides.allowlist_path),
			row(_('Blocklist path'), localOverrides.blocklist_path)
		]),

		section(_('Blocklist'), [
			row(_('Installed'), formatBool(blocklist.installed)),
			row(_('Path'), blocklist.path),
			row(_('Valid rules'), formatNumber(blocklist.valid_line_count)),
			row(_('File size'), formatSizeKb(blocklist.file_size_kb)),
			row(_('Compressed'), formatBool(blocklist.compressed)),
			row(_('Verification OK'), formatBool(blocklist.verification_ok)),
			row(_('Test domain'), blocklist.test_domain),
			row(_('Test domain success'), formatNumber(blocklist.test_domain_success_count) + ' / ' + formatNumber(blocklist.test_domain_sample_count)),
			row(_('Previous backup available'), formatBool(blocklist.previous_backup_available))
		]),

		section(_('Schedule'), [
			row(_('Refresh interval'), formatDuration(timestamps.refresh_interval_s)),
			row(_('Next refresh'), formatTimestamp(timestamps.next_refresh_at)),
			row(_('Next refresh in'), formatDuration(timestamps.next_refresh_in_s)),
			row(_('Boot start delay'), formatDuration(timestamps.boot_start_delay_s))
		]),

		renderHealth(health.checks),
		renderSources(sources)
	];

	if (warnings)
		nodes.push(warnings);
	if (errors)
		nodes.push(errors);

	return E('div', {}, nodes);
}

return view.extend({
	load: function() {
		return callStatus();
	},

	render: function(data) {
		var root = E('div', {}, [ renderStatus(data) ]);

		poll.add(function() {
			return callStatus().then(function(updated) {
				root.replaceChild(renderStatus(updated), root.firstChild);
			});
		}, 5);

		return root;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
