'use strict';
'require form';
'require view';
'require uci';

return view.extend({
	load: function() {
		return uci.load('safeshield');
	},

	render: function() {
		var m, s, o;

		m = new form.Map('safeshield', _('SafeShield'),
			_('Configure SafeShield global settings and remote sources.'));

		s = m.section(form.TypedSection, 'config', _('General settings'));
		s.anonymous = true;
		s.addremove = false;

		o = s.option(form.Flag, 'enabled', _('Enable SafeShield'));
		o.rmempty = false;
		o.default = '1';

		o = s.option(form.Flag, 'refresh_on_boot', _('Refresh on boot'));
		o.default = '1';

		o = s.option(form.Flag, 'require_wan', _('Require WAN before refresh'));
		o.default = '1';

		o = s.option(form.Value, 'refresh_interval_s', _('Refresh interval (seconds)'));
		o.datatype = 'uinteger';
		o.placeholder = '21600';

		o = s.option(form.Value, 'boot_start_delay_s', _('Boot start delay (seconds)'));
		o.datatype = 'uinteger';
		o.placeholder = '30';

		s = m.section(form.GridSection, 'file_url', _('Remote sources'));
		s.anonymous = true;
		s.addremove = true;
		s.sortable = true;
		s.nodescriptions = true;

		s.sectiontitle = function(section_id) {
			return uci.get('safeshield', section_id, 'name') ||
				uci.get('safeshield', section_id, 'url') ||
				section_id;
		};

		s.handleAdd = function(ev) {
			var sid = uci.add('safeshield', 'file_url');
			uci.set('safeshield', sid, 'enabled', '1');
			uci.set('safeshield', sid, 'action', 'block');
			uci.set('safeshield', sid, 'name', _('New source'));
			return this.renderMoreOptionsModal(sid);
		};

		o = s.option(form.Flag, 'enabled', _('Enabled'));
		o.rmempty = false;
		o.default = '1';
		o.editable = true;

		o = s.option(form.Value, 'name', _('Name'));
		o.rmempty = true;
		o.editable = true;
		o.placeholder = 'OISD';

		o = s.option(form.ListValue, 'action', _('Action'));
		o.value('block', _('Block'));
		o.value('allow', _('Allow'));
		o.default = 'block';
		o.rmempty = false;
		o.editable = true;

		o = s.option(form.Value, 'url', _('URL'));
		o.rmempty = false;
		o.editable = true;
		o.placeholder = 'https://example.com/list.txt';

		return m.render();
	}
});