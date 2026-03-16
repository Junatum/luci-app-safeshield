'use strict';
'require view';
'require rpc';
'require poll';
'require dom';

var callStatus = rpc.declare({
	object: 'safeshield',
	method: 'status',
	expect: {}
});

function badgeClass(severity) {
	switch (severity) {
	case 'error':
		return 'label danger';
	case 'warning':
		return 'label warning';
	case 'notice':
		return 'label';
	default:
		return 'label success';
	}
}

function yesno(v) {
	return v ? _('Yes') : _('No');
}

function fmtTimestamp(ts) {
	if (!ts || ts <= 0)
		return '-';

	var d = new Date(ts * 1000);
	return d.toLocaleString();
}

function fmtSeconds(sec) {
	sec = +sec || 0;

	if (sec <= 0)
		return '-';

	var d = Math.floor(sec / 86400);
	var h = Math.floor((sec % 86400) / 3600);
	var m = Math.floor((sec % 3600) / 60);
	var parts = [];

	if (d)
		parts.push(d + 'd');
	if (h)
		parts.push(h + 'h');
	if (m)
		parts.push(m + 'm');

	return parts.length ? parts.join(' ') : (sec + 's');
}

function renderKeyValueTable(rows) {
	return E('table', { 'class': 'table' }, [
		E('tbody', {}, rows.map(function(row) {
			return E('tr', {}, [
				E('td', { 'style': 'width: 240px; font-weight: 600;' }, [ row[0] ]),
				E('td', {}, [ row[1] ])
			]);
		}))
	]);
}

return view.extend({
	load: function() {
		return callStatus();
	},

	renderStatus: function(data) {
		var status = data || {};
		var summary = status.summary || {};
		var runtime = status.runtime || {};
		var blocklist = status.blocklist || {};
		var sources = (status.sources && status.sources.items) ? status.sources.items : [];
		var health = status.health || {};
		var checks = health.checks || {};
		var ts = status.timestamps || {};

		var sourceRows = sources.map(function(src) {
			return E('tr', {}, [
				E('td', {}, [ src.name || src.section || '-' ]),
				E('td', {}, [ src.action || '-' ]),
				E('td', {}, [ yesno(src.enabled) ]),
				E('td', { 'style': 'word-break: break-all;' }, [ src.url || '-' ]),
				E('td', {}, [ src.last_result || '-' ]),
				E('td', {}, [ String(src.line_count || 0) ]),
				E('td', {}, [ String(src.size_kb || 0) + ' KB' ])
			]);
		});

		if (!sourceRows.length) {
			sourceRows.push(E('tr', {}, [
				E('td', { 'colspan': 7, 'style': 'text-align:center; color:#666;' }, [
					_('No source configured')
				])
			]));
		}

		return E('div', {}, [
			E('div', { 'class': 'cbi-section' }, [
				E('div', {
					'style': 'display:flex; align-items:center; gap:12px; margin-bottom:12px;'
				}, [
					E('strong', {}, [ _('Current status') ]),
					E('span', { 'class': badgeClass(summary.severity) }, [
						summary.label || status.status || _('Unknown')
					])
				]),
				E('p', { 'style': 'margin:0;' }, [
					summary.message || _('No status message')
				])
			]),

			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, [ _('Runtime') ]),
				renderKeyValueTable([
					[ _('Package version'), status.version || '-' ],
					[ _('Enabled'), yesno(status.enabled) ],
					[ _('Refresh daemon running'), yesno(runtime.refreshd_running) ],
					[ _('dnsmasq running'), yesno(runtime.dnsmasq_running) ],
					[ _('DNS runtime OK'), yesno(runtime.dns_runtime_ok) ],
					[ _('Refresh on boot'), yesno(runtime.refresh_on_boot) ],
					[ _('Require WAN'), yesno(runtime.require_wan) ],
					[ _('Last result'), runtime.last_result || '-' ],
					[ _('Last error code'), runtime.last_error_code || '-' ],
					[ _('Stage'), status.stage || '-' ]
				])
			]),

			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, [ _('Blocklist') ]),
				renderKeyValueTable([
					[ _('Installed'), yesno(blocklist.installed) ],
					[ _('Verification OK'), yesno(blocklist.verification_ok) ],
					[ _('Path'), blocklist.path || '-' ],
					[ _('Valid line count'), String(blocklist.valid_line_count || 0) ],
					[ _('File size'), String(blocklist.file_size_kb || 0) + ' KB' ],
					[ _('Test domain'), blocklist.test_domain || '-' ],
					[ _('Test success count'), String(blocklist.test_domain_success_count || 0) ],
					[ _('Test sample count'), String(blocklist.test_domain_sample_count || 0) ],
					[ _('Previous backup available'), yesno(blocklist.previous_backup_available) ]
				])
			]),

			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, [ _('Schedule') ]),
				renderKeyValueTable([
					[ _('Generated at'), fmtTimestamp(ts.generated_at) ],
					[ _('Last attempt'), fmtTimestamp(ts.last_attempt) ],
					[ _('Last success'), fmtTimestamp(ts.last_success) ],
					[ _('Last failure'), fmtTimestamp(ts.last_failure) ],
					[ _('Next refresh at'), fmtTimestamp(ts.next_refresh_at) ],
					[ _('Refresh interval'), fmtSeconds(ts.refresh_interval_s) ],
					[ _('Next refresh in'), fmtSeconds(ts.next_refresh_in_s) ],
					[ _('Boot start delay'), fmtSeconds(ts.boot_start_delay_s) ]
				])
			]),

			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, [ _('Health checks') ]),
				renderKeyValueTable([
					[ _('Overall health'), health.overall || '-' ],
					[ _('dnsmasq binary'), yesno(checks.dnsmasq_binary) ],
					[ _('dnsmasq confdir'), yesno(checks.dnsmasq_confdir) ],
					[ _('Initial restart'), checks.dnsmasq_initial_restart == null ? '-' : yesno(checks.dnsmasq_initial_restart) ],
					[ _('Final restart'), yesno(checks.dnsmasq_final_restart) ],
					[ _('DNS runtime'), yesno(checks.dns_runtime) ],
					[ _('Blocklist verify'), yesno(checks.blocklist_verify) ],
					[ _('Min valid line count'), yesno(checks.min_valid_line_count) ],
					[ _('Max file size'), yesno(checks.max_file_size) ]
				])
			]),

			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, [ _('Sources') ]),
				E('table', { 'class': 'table' }, [
					E('thead', {}, [
						E('tr', {}, [
							E('th', {}, [ _('Name') ]),
							E('th', {}, [ _('Action') ]),
							E('th', {}, [ _('Enabled') ]),
							E('th', {}, [ _('URL') ]),
							E('th', {}, [ _('Last result') ]),
							E('th', {}, [ _('Lines') ]),
							E('th', {}, [ _('Size') ])
						])
					]),
					E('tbody', {}, sourceRows)
				])
			]),

			(status.warnings && status.warnings.length) ? E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, [ _('Warnings') ]),
				E('ul', {}, status.warnings.map(function(w) {
					return E('li', {}, [ typeof(w) === 'string' ? w : JSON.stringify(w) ]);
				}))
			]) : null,

			(status.errors && status.errors.length) ? E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, [ _('Errors') ]),
				E('ul', {}, status.errors.map(function(err) {
					return E('li', {}, [ typeof(err) === 'string' ? err : JSON.stringify(err) ]);
				}))
			]) : null
		]);
	},

	render: function(data) {
		var statusNode = E('div', { 'class': 'safeshield-status-root' });
		var root = E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, [ _('SafeShield') ]),
			statusNode
		]);

		dom.content(statusNode, this.renderStatus(data));

		poll.add(L.bind(function() {
			return callStatus().then(L.bind(function(fresh) {
				dom.content(statusNode, this.renderStatus(fresh));
			}, this)).catch(function() {
				dom.content(statusNode, E('div', { 'class': 'cbi-section' }, [
					E('p', {}, [ _('Failed to refresh SafeShield status.') ])
				]));
			});
		}, this), 5);

		return root;
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});