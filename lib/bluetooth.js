"use strict";

var util = require('util');
var events = require('events');

var Bluetooth = module.exports = function(connman) {
	var self = this;

	self.connman = connman;
	self.service = null;
	self.technology = null;
};

util.inherits(Bluetooth, events.EventEmitter);

Bluetooth.prototype.init = function(callback) {
	var self = this;

	/* Create connection for bluetooth Technology */
	self.connman.Technology.find('bluetooth', function(err, iface) {
		if (!iface) {

			if (callback)
				callback();

			return;
		}

		self.technology = iface;

		// Find out current service we're using
		self.connman.getServices(function(err, services) {
			if (err) {

				if (callback)
					callback();

				return;
			}

			for (var objectPath in services) {
				var service = services[objectPath];
				if (service.Type != 'bluetooth')
					continue;

				self.selectService(objectPath);
				break;
			}

			if (callback)
				callback();
		});
	});
};

Bluetooth.prototype.getProperties = function(callback) {
	var self = this;

	if (!self.technology) {
		if (callback)
			process.nextTick(function() {
				callback(new Error('No wired interface was found'));
			});

		return;
	}

	self.technology.GetProperties['timeout'] = 10000;
	self.technology.GetProperties['finish'] = function(props) {
		if (callback)
			callback(null, props);
	};
	self.technology.GetProperties();
};

Bluetooth.prototype.setProperty = function(prop, value, callback) {
	var self = this;

	if (!self.technology) {
		if (callback)
			process.nextTick(function() {
				callback(new Error('No wired interface was found'));
			});

		return;
	}

	self.technology.SetProperty['timeout'] = 10000;
	self.technology.SetProperty['finish'] = function() {
		if (callback)
			callback(null);
	};
	self.technology.SetProperty(prop, value);
};

Bluetooth.prototype.geServiceProperties = function(callback) {
	var self = this;

	if (!self.technology) {
		if (callback)
			process.nextTick(function() {
				callback(new Error('No wired interface was found'));
			});

		return;
	}

	if (!self.service) {
		if (callback)
			process.nextTick(function() {
				callback(null, {});
			});

		return;
	}

	self.service.GetProperties['timeout'] = 10000;
	self.service.GetProperties['finish'] = function(props) {
		if (callback)
			callback(null, props);
	};
	self.service.GetProperties();
};

Bluetooth.prototype.setServiceProperty = function(prop, value, callback) {
	var self = this;

	if (!self.technology) {
		if (callback)
			process.nextTick(function() {
				callback(new Error('No wired interface was found'));
			});

		return;
	}

	if (!self.service) {
		if (callback)
			process.nextTick(function() {
				callback(null);
			});

		return;
	}

	self.service.SetProperty['timeout'] = 10000;
	self.service.SetProperty['finish'] = function() {
		if (callback)
			callback(null);
	};
	self.service.SetProperty(prop, value);
};

Bluetooth.prototype.connect = function(callback) {
	var self = this;

	if (!self.technology) {
		if (callback)
			process.nextTick(function() {
				callback(new Error('No wired interface was found'));
			});

		return;
	}

	if (!self.service) {
		if (callback)
			process.nextTick(function() {
				callback(null);
			});

		return;
	}

	// Connect to this access point
	self.service.Connect['timeout'] = 30000;
	self.service.Connect['finish'] = function() {
		callback(null);
	};
	self.service.Connect();

};

Bluetooth.prototype.disconnect = function(callback) {
	var self = this;

	if (!self.technology) {
		if (callback)
			process.nextTick(function() {
				callback(new Error('No wired interface was found'));
			});

		return;
	}

	if (!self.service) {
		if (callback)
			process.nextTick(function() {
				callback(null);
			});

		return;
	}

	self.service.Disconnect['finish'] = function() {
		if (callback)
			callback(null);
	};
	self.service.Disconnect();

};

Bluetooth.prototype.selectService = function(objectPath, callback) {
	var self = this;

	if (!self.technology) {
		if (callback)
			process.nextTick(function() {
				callback(new Error('No wired interface was found'));
			});

		return;
	}

	self.connman.systemBus.getInterface('net.connman', objectPath, 'net.connman.Service', function(err, iface) {
		if (err) {
			callback(new Error('No such service'));
			return;
		}

		// Release current service we used
		if (self.service)
			self.service.removeAllListeners('PropertyChanged');

		// Set new service
		self.service = iface;

		// Initializing signal handler for this new service
		iface.on('PropertyChanged', function(name, value) {
			self.emit('PropertyChanged', name, value);
		});

		if (callback)
			callback(null, iface);
	});
};

Bluetooth.prototype.setConfiguration = function(config, callback) {
	var self = this;

	if (!config) {
		if (callback)
			process.nextTick(function() {
				callback(new Error('no configuration'));
			});

		return;
	}

	// Setting IPv4 configuration
	if (config.ipv4) {
		var settings = {};

		if (!config.method) {
			if (callback)
				process.nextTick(function() {
					callback(new Error('Unknown method'));
				});

			return;
		}

		switch(config.method) {
		case 'manual':
			settings.Method = config.method;
			settings.Address = config.ipaddress || '10.74.11.15';
			settings.Netmask = config.netmask || '255.0.0.0';
			break;

		case 'dhcp':
			settings.Method = config.method;
			break;

		default:
			if (callback)
				process.nextTick(function() {
					callback(new Error('Unknown method'));
				});

			return;
		}

		// Apply
		self.setServiceProperty('IPv4.Configuration', settings, function(err) {

			if (callback)
				callback(err);
		});
	}
};